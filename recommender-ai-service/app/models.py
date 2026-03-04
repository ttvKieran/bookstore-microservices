from django.db import models
import uuid


class Recommendation(models.Model):
    """AI-generated book recommendations for customers"""
    ALGORITHM_CHOICES = [
        ('collaborative', 'Collaborative Filtering'),
        ('content_based', 'Content-Based'),
        ('popular', 'Most Popular'),
        ('trending', 'Trending'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer_id = models.CharField(max_length=255, db_index=True)  # UUID from customer-service
    book_id = models.IntegerField(db_index=True)  # ID from book-service
    score = models.FloatField()  # Recommendation score (0.0 - 1.0)
    algorithm = models.CharField(max_length=50, choices=ALGORITHM_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Book {self.book_id} for Customer {self.customer_id} ({self.algorithm})"
    
    class Meta:
        db_table = 'recommendations'
        ordering = ['-score', '-created_at']
        indexes = [
            models.Index(fields=['customer_id', '-score']),
            models.Index(fields=['book_id']),
        ]


class CustomerInteraction(models.Model):
    """Track customer interactions for recommendation algorithm"""
    INTERACTION_TYPES = [
        ('view', 'View'),
        ('cart', 'Add to Cart'),
        ('purchase', 'Purchase'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer_id = models.CharField(max_length=255, db_index=True)
    book_id = models.IntegerField(db_index=True)
    interaction_type = models.CharField(max_length=20, choices=INTERACTION_TYPES)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.customer_id} - {self.interaction_type} - Book {self.book_id}"
    
    class Meta:
        db_table = 'customer_interactions'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['customer_id', '-timestamp']),
            models.Index(fields=['book_id']),
            models.Index(fields=['interaction_type']),
        ]
