package com.bookstore.payservice.saga;

import com.bookstore.payservice.model.Payment;
import com.bookstore.payservice.repository.PaymentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SagaPaymentListener {
    
    private final KafkaTemplate<String, SagaEvent> kafkaTemplate;
    private final PaymentRepository paymentRepository;
    private final ObjectMapper objectMapper;
    
    @KafkaListener(
        topics = SagaKafkaTopics.PAYMENT_COMMAND,
        groupId = "payment-service-group"
    )
    @Transactional
    public void handlePaymentCommand(SagaEvent event) {
        log.info("💳 [PAYMENT-SERVICE] Received Saga Event: step={}, type={}, transactionId={}", 
            event.getSagaStep(), event.getEventType(), event.getTransactionId());
        
        if (event.getSagaStep() == SagaEvent.SagaStep.PAYMENT_PROCESS) {
            handlePaymentProcess(event);
        } else if (event.getSagaStep() == SagaEvent.SagaStep.PAYMENT_REFUND) {
            handlePaymentRefund(event);
        }
    }
    
    private void handlePaymentProcess(SagaEvent commandEvent) {
        String transactionId = commandEvent.getTransactionId();
        
        try {
            // Parse payload - support both snake_case and camelCase
            Map<String, Object> payloadMap = (Map<String, Object>) commandEvent.getPayload();
            String orderId = (String) (payloadMap.get("order_id") != null ? payloadMap.get("order_id") : payloadMap.get("orderId"));
            String customerId = (String) (payloadMap.get("customer_id") != null ? payloadMap.get("customer_id") : payloadMap.get("customerId"));
            Double amountDouble = ((Number) payloadMap.get("amount")).doubleValue();
            BigDecimal amount = BigDecimal.valueOf(amountDouble);
            String paymentMethod = (String) (payloadMap.get("payment_method") != null ? payloadMap.get("payment_method") : payloadMap.get("paymentMethod"));
            
            log.info("💳 [PAYMENT-SERVICE] Processing payment: orderId={}, customerId={}, amount={}, method={}", 
                orderId, customerId, amount, paymentMethod);
            
            // Simulate payment processing
            Thread.sleep(500); // Simulate external payment gateway call
            
            // Create payment record
            Payment payment = new Payment();
            payment.setOrderId(orderId); // Keep as String
            payment.setCustomerId(customerId);
            payment.setAmount(amount);
            payment.setPaymentMethod(Payment.PaymentMethod.valueOf(paymentMethod.toUpperCase().replace("-", "_")));
            payment.setStatus(Payment.PaymentStatus.COMPLETED);
            payment.setTransactionId(transactionId);
            payment.setCreatedAt(LocalDateTime.now());
            
            Payment savedPayment = paymentRepository.save(payment);
            
            log.info("✅ [PAYMENT-SERVICE] Payment processed successfully: paymentId={}", savedPayment.getId());
            
            // Send SUCCESS reply
            SagaEvent.PaymentPayload replyPayload = new SagaEvent.PaymentPayload();
            replyPayload.setOrderId(orderId);
            replyPayload.setCustomerId(customerId);
            replyPayload.setAmount(amount);
            replyPayload.setPaymentMethod(paymentMethod);
            replyPayload.setPaymentId(savedPayment.getId().toString());
            
            SagaEvent replyEvent = new SagaEvent();
            replyEvent.setTransactionId(transactionId);
            replyEvent.setOrderId(orderId);
            replyEvent.setEventType(SagaEvent.EventType.REPLY);
            replyEvent.setEventStatus(SagaEvent.EventStatus.SUCCESS);
            replyEvent.setSagaStep(SagaEvent.SagaStep.PAYMENT_PROCESS);
            replyEvent.setPayload(replyPayload);
            
            kafkaTemplate.send(SagaKafkaTopics.PAYMENT_REPLY, transactionId, replyEvent);
            log.info("📤 [PAYMENT-SERVICE] Sent SUCCESS reply to topic: {}", SagaKafkaTopics.PAYMENT_REPLY);
            
        } catch (Exception e) {
            log.error("❌ [PAYMENT-SERVICE] Payment processing failed: {}", e.getMessage(), e);
            
            // Send FAILED reply
            SagaEvent replyEvent = new SagaEvent();
            replyEvent.setTransactionId(transactionId);
            replyEvent.setOrderId(commandEvent.getOrderId());
            replyEvent.setEventType(SagaEvent.EventType.REPLY);
            replyEvent.setEventStatus(SagaEvent.EventStatus.FAILED);
            replyEvent.setSagaStep(SagaEvent.SagaStep.PAYMENT_PROCESS);
            replyEvent.setErrorMessage("Payment processing error: " + e.getMessage());
            
            kafkaTemplate.send(SagaKafkaTopics.PAYMENT_REPLY, transactionId, replyEvent);
            log.info("📤 [PAYMENT-SERVICE] Sent FAILED reply to topic: {}", SagaKafkaTopics.PAYMENT_REPLY);
        }
    }
    
    private void handlePaymentRefund(SagaEvent commandEvent) {
        String transactionId = commandEvent.getTransactionId();
        
        try {
            // Parse payload to get paymentId (support both snake_case and camelCase)
            Map<String, Object> payloadMap = (Map<String, Object>) commandEvent.getPayload();
            String paymentId = (String) (payloadMap.get("payment_id") != null ? payloadMap.get("payment_id") : payloadMap.get("paymentId"));
            
            log.info("🔄 [PAYMENT-SERVICE] Compensating - Refunding payment: paymentId={}", paymentId);
            
            if (paymentId != null) {
                // Find and update payment status
                Payment payment = paymentRepository.findById(UUID.fromString(paymentId)).orElse(null);
                
                if (payment != null) {
                    payment.setStatus(Payment.PaymentStatus.REFUNDED);
                    paymentRepository.save(payment);
                    log.info("✅ [PAYMENT-SERVICE] Payment refunded successfully: paymentId={}", paymentId);
                } else {
                    log.warn("⚠️ [PAYMENT-SERVICE] Payment not found for refund: paymentId={}", paymentId);
                }
            }
            
            // Send SUCCESS reply for compensation
            SagaEvent replyEvent = new SagaEvent();
            replyEvent.setTransactionId(transactionId);
            replyEvent.setOrderId(commandEvent.getOrderId());
            replyEvent.setEventType(SagaEvent.EventType.REPLY);
            replyEvent.setEventStatus(SagaEvent.EventStatus.SUCCESS);
            replyEvent.setSagaStep(SagaEvent.SagaStep.PAYMENT_REFUND);
            
            kafkaTemplate.send(SagaKafkaTopics.PAYMENT_REPLY, transactionId, replyEvent);
            log.info("📤 [PAYMENT-SERVICE] Sent REFUND SUCCESS reply to topic: {}", SagaKafkaTopics.PAYMENT_REPLY);
            
        } catch (Exception e) {
            log.error("❌ [PAYMENT-SERVICE] Payment refund failed: {}", e.getMessage(), e);
            
            SagaEvent replyEvent = new SagaEvent();
            replyEvent.setTransactionId(transactionId);
            replyEvent.setOrderId(commandEvent.getOrderId());
            replyEvent.setEventType(SagaEvent.EventType.REPLY);
            replyEvent.setEventStatus(SagaEvent.EventStatus.FAILED);
            replyEvent.setSagaStep(SagaEvent.SagaStep.PAYMENT_REFUND);
            replyEvent.setErrorMessage("Payment refund error: " + e.getMessage());
            
            kafkaTemplate.send(SagaKafkaTopics.PAYMENT_REPLY, transactionId, replyEvent);
            log.info("📤 [PAYMENT-SERVICE] Sent REFUND FAILED reply to topic: {}", SagaKafkaTopics.PAYMENT_REPLY);
        }
    }
}
