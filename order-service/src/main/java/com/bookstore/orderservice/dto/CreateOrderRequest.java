package com.bookstore.orderservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
public class CreateOrderRequest {
    @JsonProperty("customer_id")
    private String customerId;
    
    @JsonProperty("shipping_address_id")
    private String shippingAddress;
    
    @JsonProperty("payment_method")
    private String paymentMethod;
    
    private List<OrderItemDto> items;
    
    @Data
    public static class OrderItemDto {
        @JsonProperty("book_id")
        private Integer bookId;
        private Integer quantity;
    }
}
