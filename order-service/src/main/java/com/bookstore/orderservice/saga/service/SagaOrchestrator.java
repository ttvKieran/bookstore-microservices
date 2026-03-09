package com.bookstore.orderservice.saga.service;

import com.bookstore.orderservice.dto.CreateOrderRequest;
import com.bookstore.orderservice.dto.OrderResponse;
import com.bookstore.orderservice.model.Order;
import com.bookstore.orderservice.model.OrderItem;
import com.bookstore.orderservice.repository.OrderItemRepository;
import com.bookstore.orderservice.repository.OrderRepository;
import com.bookstore.orderservice.saga.SagaEvent;
import com.bookstore.orderservice.saga.SagaRequest;
import com.bookstore.orderservice.saga.SagaState;
import com.bookstore.orderservice.saga.config.SagaKafkaTopics;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Saga Orchestrator Service
 * Coordinates distributed transactions using Saga Pattern with Kafka
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SagaOrchestrator {
    
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final RestTemplate restTemplate;
    private final KafkaTemplate<String, SagaEvent> kafkaTemplate;
    
    @Value("${book.service.url}")
    private String bookServiceUrl;
    
    @Value("${cart.service.url}")
    private String cartServiceUrl;
    
    // In-memory saga state tracking (in production: use database or Redis)
    private final Map<String, SagaState> sagaStates = new ConcurrentHashMap<>();
    
    /**
     * Main entry point: Start Saga transaction
     */
    @Transactional
    public OrderResponse startSaga(SagaRequest request) {
        // Initialize saga state
        SagaState sagaState = new SagaState();
        sagaState.setCustomerId(request.getCustomerId());
        sagaStates.put(sagaState.getSagaId(), sagaState);
        
        log.info("🚀 [SAGA-START] Saga ID: {} | Customer: {}", 
                sagaState.getSagaId(), request.getCustomerId());
        
        try {
            // Step 1: Fetch cart items
            List<CreateOrderRequest.OrderItemDto> items = fetchCartItems(request.getCustomerId());
            if (items == null || items.isEmpty()) {
                throw new RuntimeException("Cart is empty");
            }
            
            log.info("📦 [SAGA] Fetched {} items from cart", items.size());
            
            // Step 2: Create local order with PENDING status
            Order order = createLocalOrder(request, items, sagaState.getSagaId());
            sagaState.setOrderId(order.getId().toString());
            
            log.info("📝 [SAGA] Created order {} with status PENDING", order.getId());
            
            // Step 3: Start saga execution by sending first command
            sendBookReserveCommand(sagaState, items);
            
            // Return order response immediately (async processing)
            return convertToResponse(order, sagaState);
            
        } catch (Exception e) {
            log.error("❌ [SAGA-ERROR] Saga {} failed: {}", sagaState.getSagaId(), e.getMessage());
            sagaState.updateStatus(SagaState.SagaStatus.FAILED);
            sagaState.setErrorMessage(e.getMessage());
            throw new RuntimeException("Saga transaction failed: " + e.getMessage(), e);
        }
    }
    
    // ==================== STEP 1: BOOK RESERVE ====================
    
    private void sendBookReserveCommand(SagaState sagaState, List<CreateOrderRequest.OrderItemDto> items) {
        sagaState.updateStatus(SagaState.SagaStatus.BOOK_RESERVING);
        sagaState.setCurrentStep(SagaEvent.SagaStep.BOOK_RESERVE);
        
        // Build payload
        List<SagaEvent.BookReservePayload.BookItem> bookItems = new ArrayList<>();
        for (CreateOrderRequest.OrderItemDto item : items) {
            bookItems.add(SagaEvent.BookReservePayload.BookItem.builder()
                    .bookId(item.getBookId())
                    .quantity(item.getQuantity())
                    .build());
        }
        
        SagaEvent.BookReservePayload payload = SagaEvent.BookReservePayload.builder()
                .customerId(sagaState.getCustomerId())
                .items(bookItems)
                .build();
        
        SagaEvent event = SagaEvent.builder()
                .sagaId(sagaState.getSagaId())
                .orderId(sagaState.getOrderId())
                .eventType(SagaEvent.EventType.COMMAND)
                .step(SagaEvent.SagaStep.BOOK_RESERVE)
                .payload(payload)
                .timestamp(System.currentTimeMillis())
                .build();
        
        log.info("📤 [SAGA-KAFKA] Sending BOOK_RESERVE command to topic: {} | Saga: {} | Items: {}", 
                SagaKafkaTopics.BOOK_COMMAND, sagaState.getSagaId(), bookItems.size());
        
        kafkaTemplate.send(SagaKafkaTopics.BOOK_COMMAND, sagaState.getSagaId(), event);
    }
    
    @KafkaListener(topics = SagaKafkaTopics.BOOK_REPLY, groupId = "order-service-saga")
    public void handleBookReply(SagaEvent reply) {
        log.info("📥 [SAGA-KAFKA] Received BOOK_REPLY | Saga: {} | Status: {}", 
                reply.getSagaId(), reply.getStatus());
        
        SagaState sagaState = sagaStates.get(reply.getSagaId());
        if (sagaState == null) {
            log.warn("⚠️ [SAGA] Unknown saga ID: {}", reply.getSagaId());
            return;
        }
        
        if (reply.getStatus() == SagaEvent.EventStatus.SUCCESS) {
            log.info("✅ [SAGA] Book reservation successful");
            sagaState.setBookReserved(true);
            sagaState.updateStatus(SagaState.SagaStatus.BOOK_RESERVED);
            
            // Proceed to next step: Payment
            sendPaymentCommand(sagaState);
        } else {
            log.error("❌ [SAGA] Book reservation failed: {}", reply.getErrorMessage());
            handleSagaFailure(sagaState, reply.getErrorMessage());
        }
    }
    
    // ==================== STEP 2: PAYMENT ====================
    
    private void sendPaymentCommand(SagaState sagaState) {
        sagaState.updateStatus(SagaState.SagaStatus.PAYMENT_PROCESSING);
        sagaState.setCurrentStep(SagaEvent.SagaStep.PAYMENT_PROCESS);
        
        // Fetch order to get total amount
        Order order = orderRepository.findById(UUID.fromString(sagaState.getOrderId())).orElseThrow();
        
        SagaEvent.PaymentPayload payload = SagaEvent.PaymentPayload.builder()
                .customerId(sagaState.getCustomerId())
                .orderId(sagaState.getOrderId())
                .amount(order.getTotalAmount())
                .paymentMethod("credit_card")
                .build();
        
        SagaEvent event = SagaEvent.builder()
                .sagaId(sagaState.getSagaId())
                .orderId(sagaState.getOrderId())
                .eventType(SagaEvent.EventType.COMMAND)
                .step(SagaEvent.SagaStep.PAYMENT_PROCESS)
                .payload(payload)
                .timestamp(System.currentTimeMillis())
                .build();
        
        log.info("📤 [SAGA-KAFKA] Sending PAYMENT_PROCESS command to topic: {} | Saga: {} | Amount: {}", 
                SagaKafkaTopics.PAYMENT_COMMAND, sagaState.getSagaId(), order.getTotalAmount());
        
        kafkaTemplate.send(SagaKafkaTopics.PAYMENT_COMMAND, sagaState.getSagaId(), event);
    }
    
    @KafkaListener(topics = SagaKafkaTopics.PAYMENT_REPLY, groupId = "order-service-saga")
    public void handlePaymentReply(SagaEvent reply) {
        log.info("📥 [SAGA-KAFKA] Received PAYMENT_REPLY | Saga: {} | Status: {}", 
                reply.getSagaId(), reply.getStatus());
        
        SagaState sagaState = sagaStates.get(reply.getSagaId());
        if (sagaState == null) {
            log.warn("⚠️ [SAGA] Unknown saga ID: {}", reply.getSagaId());
            return;
        }
        
        if (reply.getStatus() == SagaEvent.EventStatus.SUCCESS) {
            log.info("✅ [SAGA] Payment processed successfully");
            
            // Extract paymentId from payload for compensation
            if (reply.getPayload() != null) {
                try {
                    @SuppressWarnings("unchecked")
                    java.util.Map<String, Object> payload = (java.util.Map<String, Object>) reply.getPayload();
                    sagaState.setPaymentId((String) payload.get("paymentId"));
                    log.info("💾 [SAGA] Stored paymentId: {}", sagaState.getPaymentId());
                } catch (Exception e) {
                    log.warn("⚠️ Could not extract paymentId from reply payload");
                }
            }
            
            sagaState.setPaymentProcessed(true);
            sagaState.updateStatus(SagaState.SagaStatus.PAYMENT_PROCESSED);
            
            // Proceed to next step: Shipment
            sendShipmentCommand(sagaState);
        } else {
            log.error("❌ [SAGA] Payment failed: {}", reply.getErrorMessage());
            handleSagaFailure(sagaState, reply.getErrorMessage());
        }
    }
    
    // ==================== STEP 3: SHIPMENT ====================
    
    private void sendShipmentCommand(SagaState sagaState) {
        sagaState.updateStatus(SagaState.SagaStatus.SHIPMENT_SCHEDULING);
        sagaState.setCurrentStep(SagaEvent.SagaStep.SHIPMENT_SCHEDULE);
        
        // Fetch order to get shipping address
        Order order = orderRepository.findById(UUID.fromString(sagaState.getOrderId())).orElseThrow();
        
        SagaEvent.ShipmentPayload payload = SagaEvent.ShipmentPayload.builder()
                .orderId(sagaState.getOrderId())
                .customerId(sagaState.getCustomerId())
                .shippingAddress(order.getShippingAddress())
                .build();
        
        SagaEvent event = SagaEvent.builder()
                .sagaId(sagaState.getSagaId())
                .orderId(sagaState.getOrderId())
                .eventType(SagaEvent.EventType.COMMAND)
                .step(SagaEvent.SagaStep.SHIPMENT_SCHEDULE)
                .payload(payload)
                .timestamp(System.currentTimeMillis())
                .build();
        
        log.info("📤 [SAGA-KAFKA] Sending SHIPMENT_SCHEDULE command to topic: {} | Saga: {}", 
                SagaKafkaTopics.SHIPMENT_COMMAND, sagaState.getSagaId());
        
        kafkaTemplate.send(SagaKafkaTopics.SHIPMENT_COMMAND, sagaState.getSagaId(), event);
    }
    
    @KafkaListener(topics = SagaKafkaTopics.SHIPMENT_REPLY, groupId = "order-service-saga")
    public void handleShipmentReply(SagaEvent reply) {
        log.info("📥 [SAGA-KAFKA] Received SHIPMENT_REPLY | Saga: {} | Status: {}", 
                reply.getSagaId(), reply.getStatus());
        
        SagaState sagaState = sagaStates.get(reply.getSagaId());
        if (sagaState == null) {
            log.warn("⚠️ [SAGA] Unknown saga ID: {}", reply.getSagaId());
            return;
        }
        
        if (reply.getStatus() == SagaEvent.EventStatus.SUCCESS) {
            log.info("✅ [SAGA] Shipment scheduled successfully");
            
            // Extract shipmentId from payload for compensation
            if (reply.getPayload() != null) {
                try {
                    @SuppressWarnings("unchecked")
                    java.util.Map<String, Object> payload = (java.util.Map<String, Object>) reply.getPayload();
                    sagaState.setShipmentId((String) payload.get("shipmentId"));
                    log.info("💾 [SAGA] Stored shipmentId: {}", sagaState.getShipmentId());
                } catch (Exception e) {
                    log.warn("⚠️ Could not extract shipmentId from reply payload");
                }
            }
            
            sagaState.setShipmentScheduled(true);
            sagaState.updateStatus(SagaState.SagaStatus.SHIPMENT_SCHEDULED);
            
            // All steps completed - finalize saga
            completeSaga(sagaState);
        } else {
            log.error("❌ [SAGA] Shipment failed: {}", reply.getErrorMessage());
            handleSagaFailure(sagaState, reply.getErrorMessage());
        }
    }
    
    // ==================== SAGA COMPLETION & COMPENSATION ====================
    
    private void completeSaga(SagaState sagaState) {
        try {
            Order order = orderRepository.findById(UUID.fromString(sagaState.getOrderId())).orElseThrow();
            order.setStatus(Order.OrderStatus.CONFIRMED);
            orderRepository.save(order);
            
            sagaState.updateStatus(SagaState.SagaStatus.COMPLETED);
            
            log.info("🎉 [SAGA-COMPLETE] Saga {} completed successfully | Order: {} | Status: CONFIRMED", 
                    sagaState.getSagaId(), sagaState.getOrderId());
        } catch (Exception e) {
            log.error("❌ [SAGA] Failed to complete saga: {}", e.getMessage());
        }
    }
    
    private void handleSagaFailure(SagaState sagaState, String errorMessage) {
        sagaState.updateStatus(SagaState.SagaStatus.COMPENSATING);
        sagaState.setErrorMessage(errorMessage);
        
        log.warn("🔙 [SAGA-COMPENSATE] Starting compensation for saga {}", sagaState.getSagaId());
        
        // Compensate in reverse order
        if (sagaState.isPaymentProcessed()) {
            sendPaymentCompensation(sagaState);
        }
        
        if (sagaState.isBookReserved()) {
            sendBookCompensation(sagaState);
        }
        
        // Update order status to CANCELLED
        try {
            Order order = orderRepository.findById(UUID.fromString(sagaState.getOrderId())).orElseThrow();
            order.setStatus(Order.OrderStatus.CANCELLED);
            orderRepository.save(order);
        } catch (Exception e) {
            log.error("Failed to update order status: {}", e.getMessage());
        }
        
        sagaState.updateStatus(SagaState.SagaStatus.FAILED);
        log.info("❌ [SAGA-FAILED] Saga {} failed and compensated", sagaState.getSagaId());
    }
    
    private void sendBookCompensation(SagaState sagaState) {
        // Fetch order items to include in compensation payload
        Order order = orderRepository.findById(UUID.fromString(sagaState.getOrderId())).orElse(null);
        
        List<SagaEvent.BookReservePayload.BookItem> bookItems = new java.util.ArrayList<>();
        if (order != null && order.getOrderItems() != null) {
            for (OrderItem item : order.getOrderItems()) {
                bookItems.add(SagaEvent.BookReservePayload.BookItem.builder()
                        .bookId(item.getBookId())
                        .quantity(item.getQuantity())
                        .build());
            }
        }
        
        SagaEvent.BookReservePayload payload = SagaEvent.BookReservePayload.builder()
                .customerId(sagaState.getCustomerId())
                .items(bookItems)
                .build();
        
        SagaEvent event = SagaEvent.builder()
                .sagaId(sagaState.getSagaId())
                .orderId(sagaState.getOrderId())
                .eventType(SagaEvent.EventType.COMMAND)
                .step(SagaEvent.SagaStep.BOOK_RELEASE)
                .payload(payload)
                .timestamp(System.currentTimeMillis())
                .build();
        
        log.info("📤 [SAGA-KAFKA] Sending BOOK_RELEASE (compensation) command | Saga: {} | Items: {}", 
                sagaState.getSagaId(), bookItems.size());
        kafkaTemplate.send(SagaKafkaTopics.BOOK_COMMAND, sagaState.getSagaId(), event);
    }
    
    private void sendPaymentCompensation(SagaState sagaState) {
        // Create payload with paymentId for refund
        java.util.Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("paymentId", sagaState.getPaymentId());
        payload.put("orderId", sagaState.getOrderId());
        
        SagaEvent event = SagaEvent.builder()
                .sagaId(sagaState.getSagaId())
                .orderId(sagaState.getOrderId())
                .eventType(SagaEvent.EventType.COMMAND)
                .step(SagaEvent.SagaStep.PAYMENT_REFUND)
                .payload(payload)
                .timestamp(System.currentTimeMillis())
                .build();
        
        log.info("📤 [SAGA-KAFKA] Sending PAYMENT_REFUND (compensation) command | Saga: {} | PaymentId: {}", 
                sagaState.getSagaId(), sagaState.getPaymentId());
        kafkaTemplate.send(SagaKafkaTopics.PAYMENT_COMMAND, sagaState.getSagaId(), event);
    }
    
    // ==================== HELPER METHODS ====================
    
    private Order createLocalOrder(SagaRequest request, List<CreateOrderRequest.OrderItemDto> items, String sagaId) {
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
    
    private OrderResponse convertToResponse(Order order, SagaState sagaState) {
        OrderResponse response = new OrderResponse();
        response.setId(order.getId());
        response.setCustomerId(order.getCustomerId());
        response.setStatus(order.getStatus());
        response.setTotalAmount(order.getTotalAmount());
        response.setShippingAddress(order.getShippingAddress());
        response.setCreatedAt(order.getCreatedAt());
        response.setUpdatedAt(order.getUpdatedAt());
        
        // Convert items
        List<OrderResponse.OrderItemResponse> itemResponses = new ArrayList<>();
        for (OrderItem item : order.getOrderItems()) {
            OrderResponse.OrderItemResponse itemResponse = new OrderResponse.OrderItemResponse();
            itemResponse.setBookId(item.getBookId());
            itemResponse.setQuantity(item.getQuantity());
            itemResponse.setPriceAtOrder(item.getPriceAtOrder());
            itemResponse.setSubtotal(item.getSubtotal());
            itemResponses.add(itemResponse);
        }
        response.setOrderItems(itemResponses);
        
        return response;
    }
    
    /**
     * Scheduled task to monitor saga timeouts
     * Runs every 10 seconds to check for hanging sagas
     */
    @Scheduled(fixedDelay = 10000)
    @Transactional
    public void monitorSagaTimeouts() {
        LocalDateTime now = LocalDateTime.now();
        int timeoutSeconds = 30; // 30 seconds timeout
        
        List<String> timedOutSagas = new ArrayList<>();
        
        // Find timed out sagas
        for (Map.Entry<String, SagaState> entry : sagaStates.entrySet()) {
            SagaState state = entry.getValue();
            
            // Check if saga is in processing state and has timed out
            if ((state.getStatus() == SagaState.SagaStatus.PAYMENT_PROCESSING ||
                 state.getStatus() == SagaState.SagaStatus.SHIPMENT_SCHEDULING) &&
                ChronoUnit.SECONDS.between(state.getUpdatedAt(), now) > timeoutSeconds) {
                
                timedOutSagas.add(entry.getKey());
                log.warn("⏱️ [SAGA-TIMEOUT] Saga {} timed out at step {} | Elapsed: {}s", 
                    state.getSagaId(), 
                    state.getCurrentStep(),
                    ChronoUnit.SECONDS.between(state.getUpdatedAt(), now));
            }
        }
        
        // Trigger compensation for timed out sagas
        for (String sagaId : timedOutSagas) {
            SagaState state = sagaStates.get(sagaId);
            if (state != null) {
                String errorMsg = String.format("Saga timeout at step %s after %d seconds", 
                    state.getCurrentStep(), timeoutSeconds);
                handleSagaFailure(state, errorMsg);
            }
        }
    }
}
