"""
Two-Phase Commit Transaction Manager for Book Service
Handles prepare, commit, and abort operations for stock reduction
"""
from django.core.cache import cache
from rest_framework import serializers
import uuid
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class TransactionManager:
    """Manages 2PC transactions for book stock operations"""
    
    TRANSACTION_TIMEOUT = 300  # 5 minutes
    
    @staticmethod
    def generate_txn_id():
        """Generate unique transaction ID"""
        return f"TXN-BOOK-{uuid.uuid4().hex[:12]}"
    
    @staticmethod
    def prepare_stock_reduction(book, quantity, global_txn_id):
        """
        PREPARE phase: Lock stock and validate
        Returns: (success: bool, txn_id: str, message: str)
        """
        logger.info(f"📦 [BOOK-TXN-PREPARE] Global: {global_txn_id}, Book: {book.id}, Qty: {quantity}, Current stock: {book.stock_quantity}")
        
        # Check if stock is sufficient
        if book.stock_quantity < quantity:
            logger.warning(f"❌ [BOOK-TXN-PREPARE] Insufficient stock! Available: {book.stock_quantity}, Requested: {quantity}")
            return False, None, f"Insufficient stock. Available: {book.stock_quantity}, Requested: {quantity}"
        
        # Generate transaction ID
        txn_id = TransactionManager.generate_txn_id()
        
        logger.info(f"🆕 [BOOK-TXN-PREPARE] Generated new txn_id: {txn_id}")
        
        # Store transaction state in cache
        txn_data = {
            'global_txn_id': global_txn_id,
            'book_id': book.id,
            'quantity': quantity,
            'original_stock': book.stock_quantity,
            'status': 'PREPARED',
            'timestamp': datetime.now().isoformat()
        }
        
        cache_key = f"2pc_txn:{txn_id}"
        cache.set(cache_key, txn_data, timeout=TransactionManager.TRANSACTION_TIMEOUT)
        
        logger.info(f"✅ [BOOK-TXN-PREPARE] Transaction {txn_id} prepared and cached")
        
        return True, txn_id, "Stock reduction prepared successfully"
    
    @staticmethod
    def commit_transaction(txn_id):
        """
        COMMIT phase: Actually reduce the stock
        Returns: (success: bool, message: str)
        """
        cache_key = f"2pc_txn:{txn_id}"
        txn_data = cache.get(cache_key)
        
        logger.info(f"🔍 [BOOK-TXN-COMMIT] Txn: {txn_id}, Found in cache: {txn_data is not None}")
        
        if not txn_data:
            logger.error(f"❌ [BOOK-TXN-COMMIT] Transaction {txn_id} not found in cache")
            return False, "Transaction not found or expired"
        
        logger.info(f"🔍 [BOOK-TXN-COMMIT] Status: {txn_data['status']}, Book: {txn_data['book_id']}, Qty: {txn_data['quantity']}")
        
        # Idempotent: if already committed, return success
        if txn_data['status'] == 'COMMITTED':
            logger.warning(f"⚠️ [BOOK-TXN-COMMIT] Transaction {txn_id} already COMMITTED - returning success (idempotent)")
            return True, "Already committed (idempotent)"
        
        if txn_data['status'] != 'PREPARED':
            logger.error(f"❌ [BOOK-TXN-COMMIT] Invalid status: {txn_data['status']} (expected PREPARED)")
            return False, f"Transaction not in PREPARED state: {txn_data['status']}"
        
        # Import here to avoid circular import
        from .models import Book
        
        try:
            book = Book.objects.get(id=txn_data['book_id'])
            
            logger.info(f"📚 [BOOK-TXN-COMMIT] Before reduce: Book {book.id} stock = {book.stock_quantity}")
            
            # Reduce stock
            old_stock = book.stock_quantity
            book.stock_quantity -= txn_data['quantity']
            book.save()
            
            logger.info(f"📚 [BOOK-TXN-COMMIT] After reduce: Book {book.id} stock = {old_stock} → {book.stock_quantity}")
            
            # Update transaction status
            txn_data['status'] = 'COMMITTED'
            txn_data['commit_time'] = datetime.now().isoformat()
            cache.set(cache_key, txn_data, timeout=3600)  # Keep for 1 hour for audit
            
            logger.info(f"✅ [BOOK-TXN-COMMIT] Transaction {txn_id} committed, cache updated with COMMITTED status")
            
            return True, "Stock reduced successfully"
            
        except Book.DoesNotExist:
            logger.error(f"❌ [BOOK-TXN-COMMIT] Book {txn_data['book_id']} not found")
            return False, "Book not found"
        except Exception as e:
            logger.error(f"❌ [BOOK-TXN-COMMIT] Exception: {str(e)}")
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
        
        return True, "Transaction aborted successfully"
