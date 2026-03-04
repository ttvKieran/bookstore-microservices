package com.bookstore.orderservice.service;

import com.bookstore.orderservice.dto.CreateOrderRequest;
import com.bookstore.orderservice.dto.OrderResponse;
import com.bookstore.orderservice.dto.UpdateOrderStatusRequest;
import com.bookstore.orderservice.model.Order;
import com.bookstore.orderservice.model.OrderItem;
import com.bookstore.orderservice.repository.OrderItemRepository;
import com.bookstore.orderservice.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {
    
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    
    @Value("${book.service.url}")
    private String bookServiceUrl;
    
    @Value("${cart.service.url}")
    private String cartServiceUrl;
    
    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {
        Order order = new Order();
        order.setCustomerId(request.getCustomerId());
        order.setShippingAddress(request.getShippingAddress());
        order.setStatus(Order.OrderStatus.PENDING);
        
        BigDecimal totalAmount = BigDecimal.ZERO;
        List<OrderItem> orderItems = new ArrayList<>();
        
        // If items not provided, fetch from cart
        List<CreateOrderRequest.OrderItemDto> items = request.getItems();
        if (items == null || items.isEmpty()) {
            items = fetchCartItems(request.getCustomerId());
        }
        
        if (items == null || items.isEmpty()) {
            throw new RuntimeException("No items to order. Cart is empty.");
        }
        
        for (CreateOrderRequest.OrderItemDto itemDto : items) {
            // Fetch book price from book-service
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
