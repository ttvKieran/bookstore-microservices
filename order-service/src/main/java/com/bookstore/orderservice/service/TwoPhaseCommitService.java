package com.bookstore.orderservice.service;

import com.bookstore.orderservice.dto.*;
import com.bookstore.orderservice.model.Order;
import com.bookstore.orderservice.model.OrderItem;
import com.bookstore.orderservice.model.TransactionState;
import com.bookstore.orderservice.repository.OrderItemRepository;
import com.bookstore.orderservice.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Two-Phase Commit Service for Distributed Transaction Management
 * Order Service acts as Transaction Coordinator (TC)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TwoPhaseCommitService {
    
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final RestTemplate restTemplate;
    private final WebClient webClient;
    
    @Value("${book.service.url}")
    private String bookServiceUrl;
    
    @Value("${cart.service.url}")
    private String cartServiceUrl;
    
    @Value("${pay.service.url}")
    private String payServiceUrl;
    
    @Value("${ship.service.url}")
    private String shipServiceUrl;
    
    // In-memory transaction log (in production, use database or distributed cache)
    private final Map<String, TransactionState> transactionLog = new ConcurrentHashMap<>();
    
    /**
     * Main method: Create Order with Two-Phase Commit
     */
    @Transactional
    public OrderResponse createOrderWith2PC(TwoPhaseCommitRequest request) {
        TransactionState txnState = new TransactionState();
        txnState.setCustomerId(request.getCustomerId());
        transactionLog.put(txnState.getGlobalTransactionId(), txnState);
        
        log.info("🔄 [2PC] Starting transaction: {}", txnState.getGlobalTransactionId());
        
        try {
            // Step 1: Fetch cart items
            List<CreateOrderRequest.OrderItemDto> items = fetchCartItems(request.getCustomerId());
            if (items == null || items.isEmpty()) {
                throw new RuntimeException("Cart is empty");
            }
            
            // Step 2: Create local order (TC's resource - can rollback via Spring @Transactional)
            Order order = createLocalOrder(request, items);
            
            // ==================== PHASE 1: PREPARE ====================
            txnState.setPhase(TransactionState.TransactionPhase.PREPARING);
            log.info("📋 [2PC-PREPARE] Phase 1 started");
            
            boolean phase1Success = executePreparePhase(txnState, order, items, request);
            
            if (!phase1Success) {
                // Some participant voted ABORT
                txnState.setPhase(TransactionState.TransactionPhase.ABORTING);
                log.warn("❌ [2PC-PREPARE] Phase 1 failed - Initiating ABORT");
                executeAbortPhase(txnState);
                
                txnState.setPhase(TransactionState.TransactionPhase.ABORTED);
                txnState.setStatus(TransactionState.TransactionStatus.FAILED);
                txnState.setEndTime(LocalDateTime.now());
                
                throw new RuntimeException("Transaction aborted: " + txnState.getErrorMessage());
            }
            
            txnState.setPhase(TransactionState.TransactionPhase.PREPARED);
            log.info("✅ [2PC-PREPARE] Phase 1 completed - All participants READY");
            
            // ==================== PHASE 2: COMMIT ====================
            txnState.setPhase(TransactionState.TransactionPhase.COMMITTING);
            log.info("📋 [2PC-COMMIT] Phase 2 started");
            
            executeCommitPhase(txnState, order);
            
            txnState.setPhase(TransactionState.TransactionPhase.COMMITTED);
            txnState.setStatus(TransactionState.TransactionStatus.SUCCESS);
            txnState.setEndTime(LocalDateTime.now());
            
            log.info("✅ [2PC-COMMIT] Phase 2 completed - Transaction COMMITTED");
            log.info("🎉 [2PC] Transaction {} completed successfully in {}ms", 
                    txnState.getGlobalTransactionId(),
                    java.time.Duration.between(txnState.getStartTime(), txnState.getEndTime()).toMillis());
            
            // Update order status to CONFIRMED
            order.setStatus(Order.OrderStatus.CONFIRMED);
            order = orderRepository.save(order);
            
            return convertToResponse(order);
            
        } catch (Exception e) {
            log.error("💥 [2PC] Transaction {} failed: {}", 
                    txnState.getGlobalTransactionId(), e.getMessage());
            
            // Ensure cleanup
            if (txnState.getPhase() != TransactionState.TransactionPhase.ABORTED) {
                txnState.setPhase(TransactionState.TransactionPhase.ABORTING);
                executeAbortPhase(txnState);
                txnState.setPhase(TransactionState.TransactionPhase.ABORTED);
            }
            
            txnState.setStatus(TransactionState.TransactionStatus.FAILED);
            txnState.setErrorMessage(e.getMessage());
            txnState.setEndTime(LocalDateTime.now());
            
            throw new RuntimeException("2PC Transaction failed: " + e.getMessage(), e);
        }
    }
    
    /**
     * PHASE 1: PREPARE - Ask all participants to prepare
     * Returns true if ALL participants vote READY, false otherwise
     */
    private boolean executePreparePhase(TransactionState txnState, Order order, 
                                       List<CreateOrderRequest.OrderItemDto> items,
                                       TwoPhaseCommitRequest request) {
        
        log.info("  → Participant 1: Book Service - Prepare stock reduction");
        if (!prepareStockReduction(txnState, items)) {
            return false;
        }
        
        log.info("  → Participant 2: Payment Service - Prepare payment");
        if (!preparePayment(txnState, order, request.getPaymentMethod())) {
            return false;
        }
        
        log.info("  → Participant 3: Shipment Service - Prepare shipment");
        if (!prepareShipment(txnState, order, request.getShippingAddress())) {
            return false;
        }
        
        // COMMENTED OUT FOR LOAD TESTING - No pre-existing carts available
        // log.info("  → Participant 4: Cart Service - Prepare cart clear");
        // if (!prepareCartClear(txnState, request.getCustomerId())) {
        //     return false;
        // }
        
        return txnState.allParticipantsReady();
    }
    
    /**
     * PHASE 2: COMMIT - Tell all participants to commit their prepared changes
     */
    private void executeCommitPhase(TransactionState txnState, Order order) {
        // Commit to all participants (keys MUST match PREPARE phase keys!)
        commitParticipant(txnState, "book-service", bookServiceUrl + "/transactions/commit/");
        commitParticipant(txnState, "payment", payServiceUrl + "/transactions/commit");
        commitParticipant(txnState, "shipment", shipServiceUrl + "/transactions/commit");
        // COMMENTED OUT FOR LOAD TESTING - No pre-existing carts
        // commitParticipant(txnState, "cart", cartServiceUrl + "/transactions/commit/");
        
        // Update local order with payment_id and shipment_id
        String paymentTxnId = txnState.getParticipantTransactions().get("payment");
        String shipmentTxnId = txnState.getParticipantTransactions().get("shipment");
        
        if (paymentTxnId != null) {
            order.setPaymentId(paymentTxnId);
        }
        if (shipmentTxnId != null) {
            order.setShipmentId(shipmentTxnId);
        }
        
        orderRepository.save(order);
    }
    
    /**
     * PHASE 2: ABORT - Tell all participants to rollback their prepared changes
     */
    private void executeAbortPhase(TransactionState txnState) {
        log.warn("  🔙 Aborting all participants...");
        
        // Abort all participants that have voted (manually map URLs)
        for (String participant : txnState.getPrepareVotes().keySet()) {
            String abortUrl = null;
            switch (participant) {
                case "book-service":
                    abortUrl = bookServiceUrl + "/transactions/abort/";
                    break;
                case "payment":
                    abortUrl = payServiceUrl + "/transactions/abort";
                    break;
                case "shipment":
                    abortUrl = shipServiceUrl + "/transactions/abort";
                    break;
                // COMMENTED OUT FOR LOAD TESTING
                // case "cart":
                //     abortUrl = cartServiceUrl + "/transactions/abort/";
                //     break;
            }
            if (abortUrl != null) {
                abortParticipant(txnState, participant, abortUrl);
            }
        }
        
        log.warn("  🔙 All participants aborted");
    }
    
    // ==================== PREPARE Methods for Each Participant ====================
    
    private boolean prepareStockReduction(TransactionState txnState, List<CreateOrderRequest.OrderItemDto> items) {
        try {
            // For simplicity, we'll prepare each book separately
            // In production, could batch this into one request
            
            for (CreateOrderRequest.OrderItemDto item : items) {
                String url = bookServiceUrl + "/transactions/prepare-stock/";
                
                // Use Map with WebClient for Django service (better JSON serialization)
                Map<String, Object> prepareRequest = new HashMap<>();
                prepareRequest.put("transaction_id", txnState.getGlobalTransactionId());
                prepareRequest.put("book_id", item.getBookId());
                prepareRequest.put("quantity", item.getQuantity());
                
                log.info("    📤 Sending to book-service: URL={}, Body={}", url, prepareRequest);
                
                String responseStr = webClient.post()
                        .uri(url)
                        .contentType(MediaType.APPLICATION_JSON)
                        .bodyValue(prepareRequest)
                        .retrieve()
                        .bodyToMono(String.class)
                        .block();
                
                log.info("    📥 Book service response: {}", responseStr);
                
                // Simple check if response contains ready:true
                if (responseStr != null && responseStr.contains("\"ready\":true")) {
                    // Extract transaction_id from response
                    String txnId = extractJsonField(responseStr, "transaction_id");
                    txnState.recordPrepareVote("book-service", true, txnId);
                    log.info("    ✓ Book Service READY (txn: {})", txnId);
                } else {
                    txnState.setFailedParticipant("book-service");
                    txnState.setErrorMessage("Book service not ready: " + responseStr);
                    txnState.recordPrepareVote("book-service", false, null);
                    return false;
                }
            }
            
            return true;
            
        } catch (Exception e) {
            log.error("    ✗ Book Service ABORT: {}", e.getMessage());
            txnState.setFailedParticipant("book-service");
            txnState.setErrorMessage("Book service error: " + e.getMessage());
            txnState.recordPrepareVote("book-service", false, null);
            return false;
        }
    }
    
    private boolean preparePayment(TransactionState txnState, Order order, String paymentMethod) {
        try {
            String url = payServiceUrl + "/transactions/prepare-payment";
            
            PreparePaymentRequest prepareRequest = new PreparePaymentRequest(
                txnState.getGlobalTransactionId(),
                order.getId().toString(),
                order.getCustomerId(),
                order.getTotalAmount(),
                paymentMethod
            );
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<PreparePaymentRequest> request = new HttpEntity<>(prepareRequest, headers);
            
            ResponseEntity<PrepareResponse> response = restTemplate.postForEntity(
                    url, request, PrepareResponse.class);
            
            PrepareResponse prepareResponse = response.getBody();
            if (prepareResponse == null || !prepareResponse.isReady()) {
                txnState.setFailedParticipant("pay-service");
                txnState.setErrorMessage("Payment service not ready: " + 
                        (prepareResponse != null ? prepareResponse.getMessage() : "No response"));
                txnState.recordPrepareVote("payment", false, null);
                return false;
            }
            
            txnState.recordPrepareVote("payment", true, prepareResponse.getTransactionId());
            log.info("    ✓ Payment Service READY (txn: {})", prepareResponse.getTransactionId());
            return true;
            
        } catch (Exception e) {
            log.error("    ✗ Payment Service ABORT: {}", e.getMessage());
            txnState.setFailedParticipant("pay-service");
            txnState.setErrorMessage("Payment service error: " + e.getMessage());
            txnState.recordPrepareVote("payment", false, null);
            return false;
        }
    }
    
    private boolean prepareShipment(TransactionState txnState, Order order, String shippingAddress) {
        try {
            String url = shipServiceUrl + "/transactions/prepare-shipment";
            
            PrepareShipmentRequest prepareRequest = new PrepareShipmentRequest(
                txnState.getGlobalTransactionId(),
                order.getId().toString(),
                order.getCustomerId(),
                shippingAddress
            );
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<PrepareShipmentRequest> request = new HttpEntity<>(prepareRequest, headers);
            
            ResponseEntity<PrepareResponse> response = restTemplate.postForEntity(
                    url, request, PrepareResponse.class);
            
            PrepareResponse prepareResponse = response.getBody();
            if (prepareResponse == null || !prepareResponse.isReady()) {
                txnState.setFailedParticipant("ship-service");
                txnState.setErrorMessage("Shipment service not ready: " + 
                        (prepareResponse != null ? prepareResponse.getMessage() : "No response"));
                txnState.recordPrepareVote("shipment", false, null);
                return false;
            }
            
            txnState.recordPrepareVote("shipment", true, prepareResponse.getTransactionId());
            log.info("    ✓ Shipment Service READY (txn: {})", prepareResponse.getTransactionId());
            return true;
            
        } catch (Exception e) {
            log.error("    ✗ Shipment Service ABORT: {}", e.getMessage());
            txnState.setFailedParticipant("ship-service");
            txnState.setErrorMessage("Shipment service error: " + e.getMessage());
            txnState.recordPrepareVote("shipment", false, null);
            return false;
        }
    }
    
    private boolean prepareCartClear(TransactionState txnState, String customerId) {
        try {
            String url = cartServiceUrl + "/transactions/prepare-clear/";
            
            // Use Map with WebClient for Django service (better JSON serialization)
            Map<String, Object> prepareRequest = new HashMap<>();
            prepareRequest.put("transaction_id", txnState.getGlobalTransactionId());
            prepareRequest.put("customer_id", customerId);
            
            log.info("    📤 Sending to cart-service: URL={}, Body={}", url, prepareRequest);
            
            String responseStr = webClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(prepareRequest)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            
            log.info("    📥 Cart service response: {}", responseStr);
            
            // Simple check if response contains ready:true
            if (responseStr != null && responseStr.contains("\"ready\":true")) {
                // Extract transaction_id from response  
                String txnId = extractJsonField(responseStr, "transaction_id");
                txnState.recordPrepareVote("cart", true, txnId);
                log.info("    ✓ Cart Service READY (txn: {})", txnId);
            } else {
                txnState.setFailedParticipant("cart-service");
                txnState.setErrorMessage("Cart service not ready: " + responseStr);
                txnState.recordPrepareVote("cart", false, null);
                return false;
            }
            
            return true;
            
        } catch (Exception e) {
            log.error("    ✗ Cart Service ABORT: {}", e.getMessage());
            txnState.setFailedParticipant("cart-service");
            txnState.setErrorMessage("Cart service error: " + e.getMessage());
            txnState.recordPrepareVote("cart", false, null);
            return false;
        }
    }
    
    // ==================== COMMIT/ABORT Helper Methods ====================
    
    private void commitParticipant(TransactionState txnState, String participantKey, String url) {
        try {
            String txnId = txnState.getParticipantTransactions().get(participantKey);
            if (txnId == null) {
                log.warn("    ⚠ No transaction ID for {}, skipping commit", participantKey);
                return;
            }
            
            Map<String, Object> commitRequest = new HashMap<>();
            commitRequest.put("transaction_id", txnId);
            commitRequest.put("action", "COMMIT");
            
            log.info("    📤 Committing {}: txnId={}, url={}", participantKey, txnId, url);
            
            // Use WebClient for Django services (book-service, cart), RestTemplate for Spring services (payment, shipment)
            if (participantKey.equals("book-service") || participantKey.equals("cart")) {
                String response = webClient.post()
                        .uri(url)
                        .contentType(MediaType.APPLICATION_JSON)
                        .bodyValue(commitRequest)
                        .retrieve()
                        .bodyToMono(String.class)
                        .block();
                log.info("    ✓ {} COMMITTED: {}", participantKey, response);
            } else {
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                HttpEntity<Map<String, Object>> request = new HttpEntity<>(commitRequest, headers);
                restTemplate.postForEntity(url, request, Map.class);
                log.info("    ✓ {} COMMITTED", participantKey);
            }
            
        } catch (Exception e) {
            // Log but don't fail - best effort commit
            log.error("    ⚠ Failed to commit {}: {}", participantKey, e.getMessage());
        }
    }
    
    private void abortParticipant(TransactionState txnState, String participantKey, String url) {
        try {
            String txnId = txnState.getParticipantTransactions().get(participantKey);
            if (txnId == null) {
                log.warn("    ⚠ No transaction ID for {}, skipping abort", participantKey);
                return;
            }
            
            Map<String, Object> abortRequest = new HashMap<>();
            abortRequest.put("transaction_id", txnId);
            abortRequest.put("action", "ABORT");
            
            // Use WebClient for Django services, RestTemplate for Spring services
            if (participantKey.equals("book-service") || participantKey.equals("cart")) {
                String response = webClient.post()
                        .uri(url)
                        .contentType(MediaType.APPLICATION_JSON)
                        .bodyValue(abortRequest)
                        .retrieve()
                        .bodyToMono(String.class)
                        .block();
                log.info("    ✓ {} ABORTED: {}", participantKey, response);
            } else {
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                HttpEntity<Map<String, Object>> request = new HttpEntity<>(abortRequest, headers);
                restTemplate.postForEntity(url, request, Map.class);
                log.info("    ✓ {} ABORTED", participantKey);
            }
            
        } catch (Exception e) {
            log.error("    ⚠ Failed to abort {}: {}", participantKey, e.getMessage());
        }
    }
    
    private String getServiceUrl(String participant) {
        switch (participant) {
            case "book-service": return bookServiceUrl;
            case "payment": return payServiceUrl;
            case "shipment": return shipServiceUrl;
            case "cart": return cartServiceUrl;
            default: return "";
        }
    }
    
    // ==================== Helper Methods ====================
    
    private Order createLocalOrder(TwoPhaseCommitRequest request, List<CreateOrderRequest.OrderItemDto> items) {
        Order order = new Order();
        order.setCustomerId(request.getCustomerId());
        order.setShippingAddress(request.getShippingAddress());
        order.setStatus(Order.OrderStatus.PENDING);
        
        BigDecimal totalAmount = BigDecimal.ZERO;
        List<OrderItem> orderItems = new ArrayList<>();
        
        for (CreateOrderRequest.OrderItemDto itemDto : items) {
            Map<String, Object> book = fetchBook(itemDto.getBookId());
            if (book == null) {
                throw new RuntimeException("Book not found: " + itemDto.getBookId());
            }
            
            BigDecimal price = new BigDecimal(book.get("price").toString());
            BigDecimal subtotal = price.multiply(new BigDecimal(itemDto.getQuantity()));
            
            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setBookId(itemDto.getBookId());
            orderItem.setQuantity(itemDto.getQuantity());
            orderItem.setPriceAtOrder(price);
            orderItem.setSubtotal(subtotal);
            
            orderItems.add(orderItem);
            totalAmount = totalAmount.add(subtotal);
        }
        
        order.setTotalAmount(totalAmount);
        order.setOrderItems(orderItems);
        
        return orderRepository.save(order);
    }
    
    private List<CreateOrderRequest.OrderItemDto> fetchCartItems(String customerId) {
        try {
            String url = cartServiceUrl + "/carts/" + customerId + "/";
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            
            if (response == null || !response.containsKey("items")) {
                return null;
            }
            
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> cartItems = (List<Map<String, Object>>) response.get("items");
            
            List<CreateOrderRequest.OrderItemDto> orderItems = new ArrayList<>();
            for (Map<String, Object> cartItem : cartItems) {
                CreateOrderRequest.OrderItemDto item = new CreateOrderRequest.OrderItemDto();
                item.setBookId((Integer) cartItem.get("book_id"));
                item.setQuantity((Integer) cartItem.get("quantity"));
                orderItems.add(item);
            }
            
            return orderItems;
        } catch (Exception e) {
            log.error("Failed to fetch cart items: {}", e.getMessage());
            return null;
        }
    }
    
    private Map<String, Object> fetchBook(Integer bookId) {
        try {
            String url = bookServiceUrl + "/books/" + bookId + "/";
            return restTemplate.getForObject(url, Map.class);
        } catch (Exception e) {
            return null;
        }
    }
    
    private OrderResponse convertToResponse(Order order) {
        OrderResponse response = new OrderResponse();
        response.setId(order.getId());
        response.setCustomerId(order.getCustomerId());
        response.setStatus(order.getStatus());
        response.setTotalAmount(order.getTotalAmount());
        response.setShippingAddress(order.getShippingAddress());
        response.setPaymentId(order.getPaymentId());
        response.setShipmentId(order.getShipmentId());
        response.setCreatedAt(order.getCreatedAt());
        response.setUpdatedAt(order.getUpdatedAt());
        
        List<OrderResponse.OrderItemResponse> itemResponses = order.getOrderItems().stream()
                .map(this::convertItemToResponse)
                .collect(java.util.stream.Collectors.toList());
        response.setOrderItems(itemResponses);
        
        return response;
    }
    
    private OrderResponse.OrderItemResponse convertItemToResponse(OrderItem item) {
        OrderResponse.OrderItemResponse response = new OrderResponse.OrderItemResponse();
        response.setId(item.getId());
        response.setBookId(item.getBookId());
        response.setQuantity(item.getQuantity());
        response.setPriceAtOrder(item.getPriceAtOrder());
        response.setSubtotal(item.getSubtotal());
        return response;
    }
    
    /**
     * Get transaction state for monitoring/debugging
     */
    public TransactionState getTransactionState(String globalTxnId) {
        return transactionLog.get(globalTxnId);
    }
    
    /**
     * Get all transaction states (for admin/monitoring)
     */
    public Collection<TransactionState> getAllTransactions() {
        return transactionLog.values();
    }
    
    /**
     * Helper method to extract JSON field value from response string
     */
    private String extractJsonField(String json, String fieldName) {
        try {
            String searchPattern = "\"" + fieldName + "\":\"";
            int startIndex = json.indexOf(searchPattern);
            if (startIndex == -1) {
                return null;
            }
            startIndex += searchPattern.length();
            int endIndex = json.indexOf("\"", startIndex);
            if (endIndex == -1) {
                return null;
            }
            return json.substring(startIndex, endIndex);
        } catch (Exception e) {
            log.warn("Failed to extract field {} from JSON: {}", fieldName, e.getMessage());
            return null;
        }
    }
}
