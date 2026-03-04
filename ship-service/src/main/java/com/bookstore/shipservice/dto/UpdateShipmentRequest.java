package com.bookstore.shipservice.dto;

import com.bookstore.shipservice.model.Shipment;
import lombok.Data;

@Data
public class UpdateShipmentRequest {
    private Shipment.ShipmentStatus status;
    private String location;
    private String notes;
}
