package com.bookstore.orderservice.dto;

import com.bookstore.orderservice.model.Order;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class OrderResponse {
    private UUID id;
    private String customerId;
    private Order.OrderStatus status;
    private BigDecimal totalAmount;
    private String shippingAddress;
    private String paymentId;
    private String shipmentId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<OrderItemResponse> orderItems;
    
    @Data
    public static class OrderItemResponse {
        private UUID id;
        private Integer bookId;
        private Integer quantity;
        private BigDecimal priceAtOrder;
        private BigDecimal subtotal;
    }
}
