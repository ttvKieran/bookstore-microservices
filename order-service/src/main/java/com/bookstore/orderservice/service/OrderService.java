package com.bookstore.orderservice.service;

import com.bookstore.orderservice.dto.CreateOrderRequest;
import com.bookstore.orderservice.dto.OrderResponse;
import com.bookstore.orderservice.dto.ReduceStockRequest;
import com.bookstore.orderservice.dto.UpdateOrderStatusRequest;
import com.bookstore.orderservice.model.Order;
import com.bookstore.orderservice.model.OrderItem;
import com.bookstore.orderservice.repository.OrderItemRepository;
import com.bookstore.orderservice.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {
    
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
    
    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {
        // Step 1: Fetch cart items if not provided
        List<CreateOrderRequest.OrderItemDto> items = request.getItems();
        if (items == null || items.isEmpty()) {
            items = fetchCartItems(request.getCustomerId());
        }
        
        if (items == null || items.isEmpty()) {
            throw new RuntimeException("No items to order. Cart is empty.");
        }
        log.info("Bố đến ạ");
        
        // Step 2: Verify stock for each book
        for (CreateOrderRequest.OrderItemDto itemDto : items) {
            boolean stockAvailable = verifyStock(itemDto.getBookId(), itemDto.getQuantity());
            if (!stockAvailable) {
                throw new RuntimeException("Insufficient stock for book ID: " + itemDto.getBookId());
            }
        }
        log.info("Bố đến ạ lần 2");
        // Step 3: Create order record
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
        Order savedOrder = orderRepository.save(order);
        log.info("Hình như đến đây");
        try {
            // Step 4: Update stock quantities
            for (CreateOrderRequest.OrderItemDto itemDto : items) {
                log.info("--- Đang chuẩn bị gọi updateStock --- Book ID: {}, Quantity: {}", itemDto.getBookId(), itemDto.getQuantity());
                updateStock(itemDto.getBookId(), itemDto.getQuantity());
            }
            
            // Step 5: Create payment
            String paymentId = createPayment(savedOrder);
            savedOrder.setPaymentId(paymentId);
            
            // Step 6: Create shipment
            String shipmentId = createShipment(savedOrder, request.getShippingAddress());
            savedOrder.setShipmentId(shipmentId);
            
            // Update order status
            savedOrder.setStatus(Order.OrderStatus.CONFIRMED);
            savedOrder = orderRepository.save(savedOrder);
            
            // Step 7: Delete cart
            deleteCart(request.getCustomerId());
            
        } catch (Exception e) {
            // If any step fails after order creation, mark as failed
            System.err.println("Order processing failed: " + e.getMessage());
            savedOrder.setStatus(Order.OrderStatus.PENDING);
            orderRepository.save(savedOrder);
            throw new RuntimeException("Order created but processing failed: " + e.getMessage());
        }
        
        return convertToResponse(savedOrder);
    }
    
    public OrderResponse getOrderById(UUID orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));
        return convertToResponse(order);
    }
    
    public List<OrderResponse> getOrdersByCustomer(String customerId) {
        List<Order> orders = orderRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
        return orders.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }
    
    public List<OrderResponse> getOrdersByStatus(Order.OrderStatus status) {
        List<Order> orders = orderRepository.findByStatusOrderByCreatedAtDesc(status);
        return orders.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }
    
    @Transactional
    public OrderResponse updateOrderStatus(UUID orderId, UpdateOrderStatusRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));
        
        order.setStatus(request.getStatus());
        if (request.getPaymentId() != null) {
            order.setPaymentId(request.getPaymentId());
        }
        if (request.getShipmentId() != null) {
            order.setShipmentId(request.getShipmentId());
        }
        
        Order updatedOrder = orderRepository.save(order);
        return convertToResponse(updatedOrder);
    }
    
    @Transactional
    public void cancelOrder(UUID orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));
        
        if (order.getStatus() == Order.OrderStatus.SHIPPED || 
            order.getStatus() == Order.OrderStatus.DELIVERED) {
            throw new RuntimeException("Cannot cancel shipped or delivered order");
        }
        
        order.setStatus(Order.OrderStatus.CANCELLED);
        orderRepository.save(order);
    }
    
    public Map<String, Object> getOrderStatistics() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("total_orders", orderRepository.count());
        stats.put("pending_orders", orderRepository.countByStatus(Order.OrderStatus.PENDING));
        stats.put("confirmed_orders", orderRepository.countByStatus(Order.OrderStatus.CONFIRMED));
        stats.put("shipped_orders", orderRepository.countByStatus(Order.OrderStatus.SHIPPED));
        stats.put("delivered_orders", orderRepository.countByStatus(Order.OrderStatus.DELIVERED));
        stats.put("cancelled_orders", orderRepository.countByStatus(Order.OrderStatus.CANCELLED));
        return stats;
    }
    
    private Map<String, Object> fetchBook(Integer bookId) {
        try {
            String url = bookServiceUrl + "/books/" + bookId + "/";
            return restTemplate.getForObject(url, Map.class);
        } catch (Exception e) {
            return null;
        }
    }
    
    private boolean verifyStock(Integer bookId, Integer quantity) {
        try {
            Map<String, Object> book = fetchBook(bookId);
            if (book == null) {
                return false;
            }
            Integer stockQuantity = (Integer) book.get("stock_quantity");
            return stockQuantity != null && stockQuantity >= quantity;
        } catch (Exception e) {
            System.err.println("Failed to verify stock: " + e.getMessage());
            return false;
        }
    }
    
    private void updateStock(Integer bookId, int quantity) {
        try {
            String url = bookServiceUrl + "/books/" + bookId + "/reduce-stock/";
            
            // Dùng WebClient để gửi request
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("quantity", quantity);
            
            log.info("WebClient -> Reducing stock for book {}: URL={}, Body={}", bookId, url, requestBody);
            
            String response = webClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block(); // Block để chuyển từ reactive sang sync
            
            log.info("Successfully reduced stock for book {}: Response={}", bookId, response);
            
        } catch (Exception e) {
            String errorMsg = "Failed to update stock for book " + bookId + ": " + e.getMessage();
            log.error(errorMsg, e);
            throw new RuntimeException(errorMsg);
        }
    }

    
    private String createPayment(Order order) {
        try {
            String url = payServiceUrl + "/payments";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("order_id", order.getId().toString());
            requestBody.put("customer_id", order.getCustomerId());
            requestBody.put("amount", order.getTotalAmount());
            requestBody.put("payment_method", "CREDIT_CARD");
            
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            Map<String, Object> response = restTemplate.postForObject(url, request, Map.class);
            if (response != null && response.containsKey("payment_id")) {
                return response.get("payment_id").toString();
            }
            throw new RuntimeException("Payment creation failed");
        } catch (Exception e) {
            throw new RuntimeException("Failed to create payment: " + e.getMessage());
        }
    }
    
    private String createShipment(Order order, String shippingAddress) {
        try {
            String url = shipServiceUrl + "/shipments";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("order_id", order.getId().toString());
            requestBody.put("customer_id", order.getCustomerId());
            requestBody.put("carrier", "DHL");
            
            // Parse shipping address if it's a structured format
            Map<String, String> addressMap = new HashMap<>();
            addressMap.put("address_line", shippingAddress);
            addressMap.put("city", "Ho Chi Minh City");
            addressMap.put("postal_code", "700000");
            requestBody.put("shipping_address", addressMap);
            
            requestBody.put("estimated_delivery", java.time.LocalDate.now().plusDays(7).toString());
            
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            Map<String, Object> response = restTemplate.postForObject(url, request, Map.class);
            if (response != null && response.containsKey("shipment_id")) {
                return response.get("shipment_id").toString();
            }
            throw new RuntimeException("Shipment creation failed");
        } catch (Exception e) {
            throw new RuntimeException("Failed to create shipment: " + e.getMessage());
        }
    }
    
    private void deleteCart(String customerId) {
        try {
            String url = cartServiceUrl + "/carts/" + customerId + "/clear/";
            restTemplate.delete(url);
        } catch (Exception e) {
            // Log error but don't fail the order
            System.err.println("Failed to delete cart: " + e.getMessage());
        }
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
            System.err.println("Failed to fetch cart items: " + e.getMessage());
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
                .collect(Collectors.toList());
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
}
