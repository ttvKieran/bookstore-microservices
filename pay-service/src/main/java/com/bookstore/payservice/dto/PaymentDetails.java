package com.bookstore.payservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class PaymentDetails {
    @JsonProperty("card_number")
    private String cardNumber;
    
    @JsonProperty("expiry_month")
    private String expiryMonth;
    
    @JsonProperty("expiry_year")
    private String expiryYear;
    
    private String cvv;
}
