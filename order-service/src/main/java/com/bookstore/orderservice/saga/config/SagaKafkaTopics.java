package com.bookstore.orderservice.saga.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

/**
 * Kafka Topic Configuration for Saga Pattern
 * Defines all topics used for Saga orchestration
 */
@Configuration
public class SagaKafkaTopics {
    
    // Book Service Topics
    public static final String BOOK_COMMAND = "saga-book-cmd";
    public static final String BOOK_REPLY = "saga-book-reply";
    
    // Payment Service Topics
    public static final String PAYMENT_COMMAND = "saga-payment-cmd";
    public static final String PAYMENT_REPLY = "saga-payment-reply";
    
    // Shipment Service Topics
    public static final String SHIPMENT_COMMAND = "saga-shipment-cmd";
    public static final String SHIPMENT_REPLY = "saga-shipment-reply";
    
    @Bean
    public NewTopic bookCommandTopic() {
        return TopicBuilder.name(BOOK_COMMAND)
                .partitions(1)
                .replicas(1)
                .build();
    }
    
    @Bean
    public NewTopic bookReplyTopic() {
        return TopicBuilder.name(BOOK_REPLY)
                .partitions(1)
                .replicas(1)
                .build();
    }
    
    @Bean
    public NewTopic paymentCommandTopic() {
        return TopicBuilder.name(PAYMENT_COMMAND)
                .partitions(1)
                .replicas(1)
                .build();
    }
    
    @Bean
    public NewTopic paymentReplyTopic() {
        return TopicBuilder.name(PAYMENT_REPLY)
                .partitions(1)
                .replicas(1)
                .build();
    }
    
    @Bean
    public NewTopic shipmentCommandTopic() {
        return TopicBuilder.name(SHIPMENT_COMMAND)
                .partitions(1)
                .replicas(1)
                .build();
    }
    
    @Bean
    public NewTopic shipmentReplyTopic() {
        return TopicBuilder.name(SHIPMENT_REPLY)
                .partitions(1)
                .replicas(1)
                .build();
    }
}
