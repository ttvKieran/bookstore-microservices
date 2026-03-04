from django.db import models

class Cart(models.Model):
    customer_id = models.CharField(max_length=255, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Cart for customer {self.customer_id}"
    
    class Meta:
        db_table = 'carts'
        ordering = ['-updated_at']


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    book_id = models.IntegerField(db_index=True)
    quantity = models.IntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Book {self.book_id} in cart"
    
    class Meta:
        db_table = 'cart_items'
        ordering = ['-added_at']
        unique_together = ['cart', 'book_id']