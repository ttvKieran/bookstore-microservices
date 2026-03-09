package com.bookstore.orderservice.model;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Represents the state of a 2PC transaction
 */
@Data
public class TransactionState {
    private String globalTransactionId;
    private String customerId;
    private TransactionPhase phase;
    private TransactionStatus status;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    
    // Track each participant's transaction ID
    private Map<String, String> participantTransactions;
    
    // Track prepare votes
    private Map<String, Boolean> prepareVotes;
    
    // Error details if any
    private String errorMessage;
    private String failedParticipant;
    
    public enum TransactionPhase {
        INIT,
        PREPARING,
        PREPARED,
        COMMITTING,
        COMMITTED,
        ABORTING,
        ABORTED
    }
    
    public enum TransactionStatus {
        IN_PROGRESS,
        SUCCESS,
        FAILED
    }
    
    public TransactionState() {
        this.globalTransactionId = "TXN-2PC-" + UUID.randomUUID().toString();
        this.phase = TransactionPhase.INIT;
        this.status = TransactionStatus.IN_PROGRESS;
        this.startTime = LocalDateTime.now();
        this.participantTransactions = new HashMap<>();
        this.prepareVotes = new HashMap<>();
    }
    
    public void recordPrepareVote(String participant, boolean ready, String txnId) {
        this.prepareVotes.put(participant, ready);
        if (txnId != null) {
            this.participantTransactions.put(participant, txnId);
        }
    }
    
    public boolean allParticipantsReady() {
        return prepareVotes.values().stream().allMatch(vote -> vote);
    }
    
    public boolean anyParticipantAborted() {
        return prepareVotes.values().stream().anyMatch(vote -> !vote);
    }
}
