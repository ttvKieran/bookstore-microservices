package com.bookstore.shipservice.dto;

import com.bookstore.shipservice.model.Shipment;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.time.LocalDate;

@Data
public class UpdateShipmentRequest {
    private Shipment.ShipmentStatus status;
    private String location;
    
    @JsonProperty("actual_delivery")
    private LocalDate actualDelivery;
}
