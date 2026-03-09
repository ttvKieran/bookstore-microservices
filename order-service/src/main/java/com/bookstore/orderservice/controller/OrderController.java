package com.bookstore.orderservice.controller;

import com.bookstore.orderservice.dto.CreateOrderRequest;
import com.bookstore.orderservice.dto.OrderResponse;
import com.bookstore.orderservice.dto.TwoPhaseCommitRequest;
import com.bookstore.orderservice.dto.UpdateOrderStatusRequest;
import com.bookstore.orderservice.model.Order;
import com.bookstore.orderservice.model.TransactionState;
import com.bookstore.orderservice.saga.SagaRequest;
import com.bookstore.orderservice.saga.service.SagaOrchestrator;
import com.bookstore.orderservice.service.OrderService;
import com.bookstore.orderservice.service.TwoPhaseCommitService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping
@RequiredArgsConstructor
public class OrderController {
    
    private final OrderService orderService;
    private final TwoPhaseCommitService twoPhaseCommitService;
    private final SagaOrchestrator sagaOrchestrator;
    
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "healthy");
        health.put("service", "order-service");
        health.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(health);
    }
    
    @GetMapping("/metrics")
    public ResponseEntity<Map<String, Object>> metrics() {
        Map<String, Object> metrics = orderService.getOrderStatistics();
        metrics.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(metrics);
    }
    
    @PostMapping("/orders")
    public ResponseEntity<OrderResponse> createOrder(@RequestBody CreateOrderRequest request) {
        try {
            OrderResponse order = orderService.createOrder(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(order);
        } catch (Exception e) {
            throw new RuntimeException("Failed to create order: " + e.getMessage());
        }
    }
    
    @GetMapping("/orders/{orderId}")
    public ResponseEntity<OrderResponse> getOrder(@PathVariable UUID orderId) {
        try {
            OrderResponse order = orderService.getOrderById(orderId);
            return ResponseEntity.ok(order);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @GetMapping("/orders/customer/{customerId}")
    public ResponseEntity<Map<String, Object>> getOrdersByCustomer(@PathVariable String customerId) {
        List<OrderResponse> orders = orderService.getOrdersByCustomer(customerId);
        Map<String, Object> response = new HashMap<>();
        response.put("customer_id", customerId);
        response.put("total", orders.size());
        response.put("orders", orders);
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/customers/{customerId}/orders")
    public ResponseEntity<Map<String, Object>> getCustomerOrders(@PathVariable String customerId) {
        List<OrderResponse> orders = orderService.getOrdersByCustomer(customerId);
        Map<String, Object> response = new HashMap<>();
        response.put("customer_id", customerId);
        response.put("total", orders.size());
        response.put("orders", orders);
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/orders")
    public ResponseEntity<Map<String, Object>> getOrders(@RequestParam(required = false) String status) {
        List<OrderResponse> orders;
        
        if (status != null) {
            Order.OrderStatus orderStatus = Order.OrderStatus.valueOf(status.toUpperCase());
            orders = orderService.getOrdersByStatus(orderStatus);
        } else {
            orders = orderService.getOrdersByStatus(null);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("total", orders.size());
        response.put("orders", orders);
        return ResponseEntity.ok(response);
    }
    
    @PutMapping("/orders/{orderId}/status")
    public ResponseEntity<OrderResponse> updateOrderStatus(
            @PathVariable UUID orderId,
            @RequestBody UpdateOrderStatusRequest request) {
        try {
            OrderResponse order = orderService.updateOrderStatus(orderId, request);
            return ResponseEntity.ok(order);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @DeleteMapping("/orders/{orderId}")
    public ResponseEntity<Map<String, String>> cancelOrder(@PathVariable UUID orderId) {
        try {
            orderService.cancelOrder(orderId);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Order cancelled successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    // ==================== TWO-PHASE COMMIT ENDPOINTS (NEW) ====================
    
    /**
     * Create Order with Two-Phase Commit Protocol
     * This endpoint uses 2PC to ensure distributed transaction consistency
     * across multiple microservices (Book, Payment, Shipment, Cart)
     * 
     * @param request Order creation request with customer, address, payment info
     * @return OrderResponse with transaction details
     */
    @PostMapping("/orders/2pc")
    public ResponseEntity<Map<String, Object>> createOrderWith2PC(@RequestBody TwoPhaseCommitRequest request) {
        try {
            OrderResponse order = twoPhaseCommitService.createOrderWith2PC(request);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("protocol", "2PC");
            response.put("order", order);
            response.put("message", "Order created successfully using Two-Phase Commit");
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("protocol", "2PC");
            error.put("error", "2PC transaction failed");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }
    
    /**
     * Create Order with Saga Pattern (Orchestration) + Kafka
     * This endpoint uses Saga Pattern to ensure distributed transaction consistency
     * using event-driven choreography via Kafka messaging
     * 
     * @param request Order creation request with customer, address, payment info
     * @return OrderResponse with saga details
     */
    @PostMapping("/orders/saga")
    public ResponseEntity<Map<String, Object>> createOrderWithSaga(@RequestBody SagaRequest request) {
        try {
            OrderResponse order = sagaOrchestrator.startSaga(request);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("protocol", "SAGA");
            response.put("order", order);
            response.put("message", "Saga transaction started - processing asynchronously via Kafka");
            response.put("note", "Order status will be updated to CONFIRMED when all steps complete");
            
            return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("protocol", "SAGA");
            error.put("error", "Saga transaction failed");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }
    
    /**
     * Get transaction state for monitoring/debugging 2PC transactions
     * 
     * @param transactionId Global transaction ID
     * @return Transaction state with phase, status, participants info
     */
    @GetMapping("/transactions/2pc/{transactionId}")
    public ResponseEntity<Map<String, Object>> getTransactionState(@PathVariable String transactionId) {
        try {
            TransactionState txnState = twoPhaseCommitService.getTransactionState(transactionId);
            
            if (txnState == null) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Transaction not found");
                error.put("transaction_id", transactionId);
                return ResponseEntity.notFound().build();
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("global_transaction_id", txnState.getGlobalTransactionId());
            response.put("customer_id", txnState.getCustomerId());
            response.put("phase", txnState.getPhase());
            response.put("status", txnState.getStatus());
            response.put("start_time", txnState.getStartTime());
            response.put("end_time", txnState.getEndTime());
            response.put("participant_transactions", txnState.getParticipantTransactions());
            response.put("prepare_votes", txnState.getPrepareVotes());
            
            if (txnState.getErrorMessage() != null) {
                response.put("error_message", txnState.getErrorMessage());
                response.put("failed_participant", txnState.getFailedParticipant());
            }
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    /**
     * Get all 2PC transactions (for admin/monitoring)
     * 
     * @return List of all transaction states
     */
    @GetMapping("/transactions/2pc")
    public ResponseEntity<Map<String, Object>> getAllTransactions() {
        Collection<TransactionState> transactions = twoPhaseCommitService.getAllTransactions();
        
        Map<String, Object> response = new HashMap<>();
        response.put("total", transactions.size());
        response.put("transactions", transactions);
        
        return ResponseEntity.ok(response);
    }
}

