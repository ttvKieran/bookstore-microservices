"""
Two-Phase Commit Transaction Manager for Cart Service
Handles prepare, commit, and abort operations for cart clearing
"""
from django.core.cache import cache
from datetime import datetime, timedelta
import uuid


class CartTransactionManager:
    """Manages 2PC transactions for cart operations"""
    
    TRANSACTION_TIMEOUT = 300  # 5 minutes
    
    @staticmethod
    def generate_txn_id():
        """Generate unique transaction ID"""
        return f"TXN-CART-{uuid.uuid4().hex[:12]}"
    
    @staticmethod
    def prepare_cart_clear(customer_id, global_txn_id):
        """
        PREPARE phase: Mark cart items for deletion
        Returns: (success: bool, txn_id: str, message: str)
        """
        from .models import Cart, CartItem
        
        try:
            # Get all cart items for this customer (query through cart relationship)
            cart_items = CartItem.objects.filter(cart__customer_id=customer_id)
            
            # If cart is empty, still return success (nothing to clear)
            if not cart_items.exists():
                txn_id = CartTransactionManager.generate_txn_id()
                # Store empty transaction in cache
                txn_data = {
                    'global_txn_id': global_txn_id,
                    'customer_id': customer_id,
                    'cart_item_ids': [],
                    'cart_items': [],
                    'status': 'PREPARED',
                    'timestamp': datetime.now().isoformat()
                }
                cache_key = f"2pc_txn:{txn_id}"
                cache.set(cache_key, txn_data, timeout=CartTransactionManager.TRANSACTION_TIMEOUT)
                return True, txn_id, f"Cart clear prepared successfully (cart is empty)."
            
            # Generate transaction ID
            txn_id = CartTransactionManager.generate_txn_id()
            
            # Store cart item IDs in cache for rollback capability
            item_ids = list(cart_items.values_list('id', flat=True))
            item_data = []
            
            for item in cart_items:
                item_data.append({
                    'id': item.id,
                    'cart_id': item.cart.id,
                    'book_id': item.book_id,
                    'quantity': item.quantity
                })
            
            txn_data = {
                'global_txn_id': global_txn_id,
                'customer_id': customer_id,
                'cart_item_ids': item_ids,
                'cart_items': item_data,
                'status': 'PREPARED',
                'timestamp': datetime.now().isoformat()
            }
            
            cache_key = f"2pc_txn:{txn_id}"
            cache.set(cache_key, txn_data, timeout=CartTransactionManager.TRANSACTION_TIMEOUT)
            
            return True, txn_id, f"Cart clear prepared successfully. {len(item_ids)} items will be cleared."
            
        except Exception as e:
            return False, None, f"Failed to prepare cart clear: {str(e)}"
    
    @staticmethod
    def commit_transaction(txn_id):
        """
        COMMIT phase: Actually delete cart items
        Returns: (success: bool, message: str)
        """
        from .models import CartItem
        
        cache_key = f"2pc_txn:{txn_id}"
        txn_data = cache.get(cache_key)
        
        if not txn_data:
            return False, "Transaction not found or expired"
        
        if txn_data['status'] != 'PREPARED':
            return False, f"Transaction not in PREPARED state: {txn_data['status']}"
        
        try:
            # Delete cart items
            deleted_count = CartItem.objects.filter(
                id__in=txn_data['cart_item_ids']
            ).delete()[0]
            
            # Update transaction status
            txn_data['status'] = 'COMMITTED'
            txn_data['commit_time'] = datetime.now().isoformat()
            txn_data['deleted_count'] = deleted_count
            cache.set(cache_key, txn_data, timeout=3600)  # Keep for 1 hour for audit
            
            return True, f"Cart cleared successfully. {deleted_count} items deleted."
            
        except Exception as e:
            return False, f"Commit failed: {str(e)}"
    
    @staticmethod
    def abort_transaction(txn_id):
        """
        ABORT phase: Release locks, no changes
        Returns: (success: bool, message: str)
        """
        cache_key = f"2pc_txn:{txn_id}"
        txn_data = cache.get(cache_key)
        
        if not txn_data:
            return True, "Transaction not found (already cleaned up)"
        
        # Update transaction status
        txn_data['status'] = 'ABORTED'
        txn_data['abort_time'] = datetime.now().isoformat()
        cache.set(cache_key, txn_data, timeout=3600)  # Keep for audit
        
        return True, "Transaction aborted successfully. Cart items preserved."
