package com.bookstore.orderservice.dto;

import com.bookstore.orderservice.model.Order;
import lombok.Data;

@Data
public class UpdateOrderStatusRequest {
    private Order.OrderStatus status;
    private String paymentId;
    private String shipmentId;
}
