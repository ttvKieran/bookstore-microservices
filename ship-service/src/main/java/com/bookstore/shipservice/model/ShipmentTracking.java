package com.bookstore.shipservice.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "shipment_tracking")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ShipmentTracking {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shipment_id", nullable = false)
    @JsonIgnore
    private Shipment shipment;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Shipment.ShipmentStatus status;
    
    @Column(nullable = false, length = 500)
    private String location;
    
    @Column(length = 1000)
    private String notes;
    
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime timestamp;
}
