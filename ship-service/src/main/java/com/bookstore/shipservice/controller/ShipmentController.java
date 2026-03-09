package com.bookstore.shipservice.controller;

import com.bookstore.shipservice.dto.CreateShipmentRequest;
import com.bookstore.shipservice.dto.ShipmentResponse;
import com.bookstore.shipservice.dto.UpdateShipmentRequest;
import com.bookstore.shipservice.model.Shipment;
import com.bookstore.shipservice.service.ShipmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping
@RequiredArgsConstructor
public class ShipmentController {
    
    private final ShipmentService shipmentService;
    
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "healthy");
        health.put("service", "ship-service");
        health.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(health);
    }
    
    @GetMapping("/metrics")
    public ResponseEntity<Map<String, Object>> metrics() {
        Map<String, Object> metrics = shipmentService.getShipmentStatistics();
        metrics.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(metrics);
    }
    
    @PostMapping("/shipments")
    public ResponseEntity<ShipmentResponse> createShipment(@RequestBody CreateShipmentRequest request) {
        try {
            ShipmentResponse shipment = shipmentService.createShipment(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(shipment);
        } catch (Exception e) {
            throw new RuntimeException("Failed to create shipment: " + e.getMessage());
        }
    }
    
    @GetMapping("/shipments/{shipment_id}")
    public ResponseEntity<ShipmentResponse> getShipment(@PathVariable("shipment_id") UUID shipmentId) {
        try {
            ShipmentResponse shipment = shipmentService.getShipmentById(shipmentId);
            return ResponseEntity.ok(shipment);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @GetMapping("/shipments/order/{order_id}")
    public ResponseEntity<Map<String, Object>> getShipmentByOrder(@PathVariable("order_id") String orderId) {
        try {
            ShipmentResponse shipment = shipmentService.getShipmentByOrderId(orderId);
            Map<String, Object> response = new HashMap<>();
            response.put("order_id", orderId);
            response.put("shipment", shipment);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @GetMapping("/shipments/track/{trackingNumber}")
    public ResponseEntity<ShipmentResponse> trackShipment(@PathVariable String trackingNumber) {
        try {
            ShipmentResponse shipment = shipmentService.trackShipment(trackingNumber);
            return ResponseEntity.ok(shipment);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @GetMapping("/customers/{customerId}/shipments")
    public ResponseEntity<Map<String, Object>> getCustomerShipments(@PathVariable String customerId) {
        List<ShipmentResponse> shipments = shipmentService.getShipmentsByCustomer(customerId);
        Map<String, Object> response = new HashMap<>();
        response.put("customer_id", customerId);
        response.put("total", shipments.size());
        response.put("shipments", shipments);
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/shipments")
    public ResponseEntity<Map<String, Object>> getShipments(@RequestParam(required = false) String status) {
        List<ShipmentResponse> shipments;
        
        if (status != null) {
            Shipment.ShipmentStatus shipmentStatus = Shipment.ShipmentStatus.valueOf(status.toUpperCase());
            shipments = shipmentService.getShipmentsByStatus(shipmentStatus);
        } else {
            shipments = shipmentService.getShipmentsByStatus(null);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("total", shipments.size());
        response.put("shipments", shipments);
        return ResponseEntity.ok(response);
    }
    
    @PutMapping("/shipments/{shipment_id}/status")
    public ResponseEntity<ShipmentResponse> updateShipmentStatus(
            @PathVariable("shipment_id") UUID shipmentId,
            @RequestBody UpdateShipmentRequest request) {
        try {
            ShipmentResponse shipment = shipmentService.updateShipmentStatus(shipmentId, request);
            return ResponseEntity.ok(shipment);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(null);
        }
    }
}
