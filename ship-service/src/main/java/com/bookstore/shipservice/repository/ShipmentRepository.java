package com.bookstore.shipservice.repository;

import com.bookstore.shipservice.model.Shipment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ShipmentRepository extends JpaRepository<Shipment, UUID> {
    Optional<Shipment> findByOrderId(String orderId);
    Optional<Shipment> findByTrackingNumber(String trackingNumber);
    List<Shipment> findByCustomerIdOrderByCreatedAtDesc(String customerId);
    List<Shipment> findByStatusOrderByCreatedAtDesc(Shipment.ShipmentStatus status);
    Long countByStatus(Shipment.ShipmentStatus status);
}
