package com.bookstore.shipservice.saga;

import com.bookstore.shipservice.model.Shipment;
import com.bookstore.shipservice.repository.ShipmentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SagaShipmentListener {
    
    private final KafkaTemplate<String, SagaEvent> kafkaTemplate;
    private final ShipmentRepository shipmentRepository;
    private final ObjectMapper objectMapper;
    
    @KafkaListener(
        topics = SagaKafkaTopics.SHIPMENT_COMMAND,
        groupId = "shipment-service-group"
    )
    @Transactional
    public void handleShipmentCommand(SagaEvent event) {
        log.info("🚚 [SHIPMENT-SERVICE] Received Saga Event: step={}, type={}, transactionId={}", 
            event.getSagaStep(), event.getEventType(), event.getTransactionId());
        
        if (event.getSagaStep() == SagaEvent.SagaStep.SHIPMENT_SCHEDULE) {
            handleShipmentSchedule(event);
        } else if (event.getSagaStep() == SagaEvent.SagaStep.SHIPMENT_CANCEL) {
            handleShipmentCancel(event);
        }
    }
    
    private void handleShipmentSchedule(SagaEvent commandEvent) {
        String transactionId = commandEvent.getTransactionId();
        
        try {
            // Parse payload - support both snake_case and camelCase
            Map<String, Object> payloadMap = (Map<String, Object>) commandEvent.getPayload();
            String orderId = (String) (payloadMap.get("order_id") != null ? payloadMap.get("order_id") : payloadMap.get("orderId"));
            String customerId = (String) (payloadMap.get("customer_id") != null ? payloadMap.get("customer_id") : payloadMap.get("customerId"));
            String shippingAddress = (String) (payloadMap.get("shipping_address") != null ? payloadMap.get("shipping_address") : payloadMap.get("shippingAddress"));
            
            log.info("🚚 [SHIPMENT-SERVICE] Scheduling shipment: orderId={}, customerId={}, address={}", 
                orderId, customerId, shippingAddress);
            
            // Simulate shipment scheduling
            Thread.sleep(500); // Simulate scheduling delay
            
            // Create shipment record
            Shipment shipment = new Shipment();
            shipment.setOrderId(orderId);
            shipment.setCustomerId(customerId);
            shipment.setShippingAddress(shippingAddress);
            shipment.setStatus(Shipment.ShipmentStatus.PREPARING);
            shipment.setTrackingNumber("TRK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            shipment.setCarrier("Standard Delivery");
            shipment.setCreatedAt(LocalDateTime.now());
            shipment.setEstimatedDelivery(LocalDateTime.now().plusDays(3));
            
            Shipment savedShipment = shipmentRepository.save(shipment);
            
            log.info("✅ [SHIPMENT-SERVICE] Shipment scheduled successfully: shipmentId={}, trackingNumber={}", 
                savedShipment.getId(), savedShipment.getTrackingNumber());
            
            // Send SUCCESS reply
            SagaEvent.ShipmentPayload replyPayload = new SagaEvent.ShipmentPayload();
            replyPayload.setOrderId(orderId);
            replyPayload.setCustomerId(customerId);
            replyPayload.setShippingAddress(shippingAddress);
            replyPayload.setShipmentId(savedShipment.getId().toString());
            
            SagaEvent replyEvent = new SagaEvent();
            replyEvent.setTransactionId(transactionId);
            replyEvent.setOrderId(orderId);
            replyEvent.setEventType(SagaEvent.EventType.REPLY);
            replyEvent.setEventStatus(SagaEvent.EventStatus.SUCCESS);
            replyEvent.setSagaStep(SagaEvent.SagaStep.SHIPMENT_SCHEDULE);
            replyEvent.setPayload(replyPayload);
            
            kafkaTemplate.send(SagaKafkaTopics.SHIPMENT_REPLY, transactionId, replyEvent);
            log.info("📤 [SHIPMENT-SERVICE] Sent SUCCESS reply to topic: {}", SagaKafkaTopics.SHIPMENT_REPLY);
            
        } catch (Exception e) {
            log.error("❌ [SHIPMENT-SERVICE] Shipment scheduling failed: {}", e.getMessage(), e);
            
            // Send FAILED reply
            SagaEvent replyEvent = new SagaEvent();
            replyEvent.setTransactionId(transactionId);
            replyEvent.setOrderId(commandEvent.getOrderId());
            replyEvent.setEventType(SagaEvent.EventType.REPLY);
            replyEvent.setEventStatus(SagaEvent.EventStatus.FAILED);
            replyEvent.setSagaStep(SagaEvent.SagaStep.SHIPMENT_SCHEDULE);
            replyEvent.setErrorMessage("Shipment scheduling error: " + e.getMessage());
            
            kafkaTemplate.send(SagaKafkaTopics.SHIPMENT_REPLY, transactionId, replyEvent);
            log.info("📤 [SHIPMENT-SERVICE] Sent FAILED reply to topic: {}", SagaKafkaTopics.SHIPMENT_REPLY);
        }
    }
    
    private void handleShipmentCancel(SagaEvent commandEvent) {
        String transactionId = commandEvent.getTransactionId();
        
        try {
            // Parse payload to get shipmentId (support both snake_case and camelCase)
            Map<String, Object> payloadMap = (Map<String, Object>) commandEvent.getPayload();
            String shipmentId = (String) (payloadMap.get("shipment_id") != null ? payloadMap.get("shipment_id") : payloadMap.get("shipmentId"));
            
            log.info("🔄 [SHIPMENT-SERVICE] Compensating - Cancelling shipment: shipmentId={}", shipmentId);
            
            if (shipmentId != null) {
                // Find and update shipment status
                Shipment shipment = shipmentRepository.findById(UUID.fromString(shipmentId)).orElse(null);
                
                if (shipment != null) {
                    shipment.setStatus(Shipment.ShipmentStatus.CANCELLED);
                    shipmentRepository.save(shipment);
                    log.info("✅ [SHIPMENT-SERVICE] Shipment cancelled successfully: shipmentId={}", shipmentId);
                } else {
                    log.warn("⚠️ [SHIPMENT-SERVICE] Shipment not found for cancellation: shipmentId={}", shipmentId);
                }
            }
            
            // Send SUCCESS reply for compensation
            SagaEvent replyEvent = new SagaEvent();
            replyEvent.setTransactionId(transactionId);
            replyEvent.setOrderId(commandEvent.getOrderId());
            replyEvent.setEventType(SagaEvent.EventType.REPLY);
            replyEvent.setEventStatus(SagaEvent.EventStatus.SUCCESS);
            replyEvent.setSagaStep(SagaEvent.SagaStep.SHIPMENT_CANCEL);
            
            kafkaTemplate.send(SagaKafkaTopics.SHIPMENT_REPLY, transactionId, replyEvent);
            log.info("📤 [SHIPMENT-SERVICE] Sent CANCEL SUCCESS reply to topic: {}", SagaKafkaTopics.SHIPMENT_REPLY);
            
        } catch (Exception e) {
            log.error("❌ [SHIPMENT-SERVICE] Shipment cancellation failed: {}", e.getMessage(), e);
            
            SagaEvent replyEvent = new SagaEvent();
            replyEvent.setTransactionId(transactionId);
            replyEvent.setOrderId(commandEvent.getOrderId());
            replyEvent.setEventType(SagaEvent.EventType.REPLY);
            replyEvent.setEventStatus(SagaEvent.EventStatus.FAILED);
            replyEvent.setSagaStep(SagaEvent.SagaStep.SHIPMENT_CANCEL);
            replyEvent.setErrorMessage("Shipment cancellation error: " + e.getMessage());
            
            kafkaTemplate.send(SagaKafkaTopics.SHIPMENT_REPLY, transactionId, replyEvent);
            log.info("📤 [SHIPMENT-SERVICE] Sent CANCEL FAILED reply to topic: {}", SagaKafkaTopics.SHIPMENT_REPLY);
        }
    }
}
