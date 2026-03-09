package com.bookstore.shipservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class ShippingAddress {
    @JsonProperty("address_line")
    private String addressLine;
    
    private String city;
    
    @JsonProperty("postal_code")
    private String postalCode;
}
