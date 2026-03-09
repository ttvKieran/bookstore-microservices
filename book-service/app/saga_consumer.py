"""
Saga Pattern Kafka Consumer for Book Service
"""
import json
import logging
import threading
import time
from kafka import KafkaConsumer, KafkaProducer
from kafka.errors import KafkaError
from django.db import transaction
from app.models import Book

logger = logging.getLogger(__name__)

# Kafka Topics
BOOK_COMMAND_TOPIC = "saga-book-cmd"
BOOK_REPLY_TOPIC = "saga-book-reply"

# Kafka configuration
KAFKA_BOOTSTRAP_SERVERS = "kafka:29092"  # Will be overridden by env var if set

class SagaBookConsumer:
    def __init__(self, bootstrap_servers=None):
        self.bootstrap_servers = bootstrap_servers or KAFKA_BOOTSTRAP_SERVERS
        self.consumer = None
        self.producer = None
        self.running = False
        
    def start(self):
        """Start the Kafka consumer in a background thread"""
        if self.running:
            logger.warning("[BOOK-SERVICE] Saga consumer already running")
            return
        
        self.running = True
        threading.Thread(target=self._consume_loop, daemon=True).start()
        logger.info("🚀 [BOOK-SERVICE] Saga consumer started")
    
    def stop(self):
        """Stop the Kafka consumer"""
        self.running = False
        if self.consumer:
            self.consumer.close()
        if self.producer:
            self.producer.close()
        logger.info("🛑 [BOOK-SERVICE] Saga consumer stopped")
    
    def _consume_loop(self):
        """Main consumer loop"""
        try:
            # Initialize consumer
            self.consumer = KafkaConsumer(
                BOOK_COMMAND_TOPIC,
                bootstrap_servers=self.bootstrap_servers,
                group_id='book-service-group',
                value_deserializer=lambda m: json.loads(m.decode('utf-8')),
                auto_offset_reset='earliest',
                enable_auto_commit=True
            )
            
            # Initialize producer
            self.producer = KafkaProducer(
                bootstrap_servers=self.bootstrap_servers,
                value_serializer=lambda v: json.dumps(v).encode('utf-8')
            )
            
            logger.info(f"📡 [BOOK-SERVICE] Listening for commands on topic: {BOOK_COMMAND_TOPIC}")
            
            # Consume messages
            for message in self.consumer:
                if not self.running:
                    break
                
                try:
                    event = message.value
                    self._handle_event(event)
                except Exception as e:
                    logger.error(f"❌ [BOOK-SERVICE] Error processing message: {e}", exc_info=True)
        
        except Exception as e:
            logger.error(f"❌ [BOOK-SERVICE] Consumer error: {e}", exc_info=True)
        finally:
            if self.consumer:
                self.consumer.close()
            if self.producer:
                self.producer.close()
    
    def _handle_event(self, event):
        """Handle incoming Saga event"""
        # Support both camelCase and snake_case
        transaction_id = event.get('transactionId') or event.get('saga_id')
        saga_step = event.get('sagaStep') or event.get('step')
        
        logger.info(f"📚 [BOOK-SERVICE] Received Saga Event: step={saga_step}, transactionId={transaction_id}")
        
        if saga_step == 'BOOK_RESERVE':
            self._handle_book_reserve(event)
        elif saga_step == 'BOOK_RELEASE':
            self._handle_book_release(event)
    
    def _handle_book_reserve(self, command_event):
        """Handle book reserve command"""
        transaction_id = command_event.get('transactionId') or command_event.get('saga_id')
        order_id = command_event.get('orderId') or command_event.get('order_id')
        
        try:
            payload = command_event['payload']
            items = payload['items']
            
            logger.info(f"📚 [BOOK-SERVICE] Reserving books: orderId={order_id}, items={len(items)}")
            
            # Simulate book reservation
            time.sleep(0.3)
            
            # Check stock and reserve books
            with transaction.atomic():
                reserved_items = []
                for item in items:
                    book_id = item.get('book_id') or item.get('bookId')  # Support both snake_case and camelCase
                    quantity = item.get('quantity')
                    
                    try:
                        book = Book.objects.select_for_update().get(id=book_id)
                        
                        if book.stock_quantity >= quantity:
                            book.stock_quantity -= quantity
                            book.save()
                            reserved_items.append({
                                'bookId': book_id,
                                'quantity': quantity,
                                'price': float(book.price)
                            })
                            logger.info(f"✅ [BOOK-SERVICE] Reserved book: bookId={book_id}, qty={quantity}, remaining={book.stock_quantity}")
                        else:
                            raise Exception(f"Insufficient stock for book {book_id}: requested={quantity}, available={book.stock_quantity}")
                    
                    except Book.DoesNotExist:
                        raise Exception(f"Book not found: {book_id}")
            
            # Send SUCCESS reply (use snake_case to match order-service)
            reply_event = {
                'saga_id': transaction_id,
                'order_id': order_id,
                'event_type': 'REPLY',
                'status': 'SUCCESS',
                'step': 'BOOK_RESERVE',
                'payload': {
                    'order_id': order_id,
                    'items': reserved_items
                },
                'error_message': None
            }
            
            self.producer.send(BOOK_REPLY_TOPIC, key=transaction_id.encode('utf-8'), value=reply_event)
            self.producer.flush()
            logger.info(f"📤 [BOOK-SERVICE] Sent SUCCESS reply to topic: {BOOK_REPLY_TOPIC}")
        
        except Exception as e:
            logger.error(f"❌ [BOOK-SERVICE] Book reservation failed: {e}")
            
            # Send FAILED reply (use snake_case to match order-service)
            reply_event = {
                'saga_id': transaction_id,
                'order_id': order_id,
                'event_type': 'REPLY',
                'status': 'FAILED',
                'step': 'BOOK_RESERVE',
                'error_message': f"Book reservation error: {str(e)}"
            }
            
            self.producer.send(BOOK_REPLY_TOPIC, key=transaction_id.encode('utf-8'), value=reply_event)
            self.producer.flush()
            logger.info(f"📤 [BOOK-SERVICE] Sent FAILED reply to topic: {BOOK_REPLY_TOPIC}")
    
    def _handle_book_release(self, command_event):
        """Handle book release (compensation) command"""
        transaction_id = command_event.get('transactionId') or command_event.get('saga_id')
        order_id = command_event.get('orderId') or command_event.get('order_id')
        
        try:
            payload = command_event.get('payload', {})
            items = payload.get('items', [])
            
            logger.info(f"🔄 [BOOK-SERVICE] Compensating - Releasing books: orderId={order_id}, items={len(items)}")
            
            # Release reserved books (add back to stock)
            with transaction.atomic():
                for item in items:
                    book_id = item.get('book_id') or item.get('bookId')  # Support both formats
                    quantity = item.get('quantity')
                    
                    if book_id and quantity:
                        try:
                            book = Book.objects.select_for_update().get(id=book_id)
                            book.stock_quantity += quantity
                            book.save()
                            logger.info(f"✅ [BOOK-SERVICE] Released book: bookId={book_id}, qty={quantity}, new_stock={book.stock_quantity}")
                        except Book.DoesNotExist:
                            logger.warning(f"⚠️ [BOOK-SERVICE] Book not found for release: bookId={book_id}")
            
            # Send SUCCESS reply for compensation (use snake_case)
            reply_event = {
                'saga_id': transaction_id,
                'order_id': order_id,
                'event_type': 'REPLY',
                'status': 'SUCCESS',
                'step': 'BOOK_RELEASE',
                'error_message': None
            }
            
            self.producer.send(BOOK_REPLY_TOPIC, key=transaction_id.encode('utf-8'), value=reply_event)
            self.producer.flush()
            logger.info(f"📤 [BOOK-SERVICE] Sent RELEASE SUCCESS reply to topic: {BOOK_REPLY_TOPIC}")
        
        except Exception as e:
            logger.error(f"❌ [BOOK-SERVICE] Book release failed: {e}", exc_info=True)
            
            # Send FAILED reply (use snake_case)
            reply_event = {
                'saga_id': transaction_id,
                'order_id': order_id,
                'event_type': 'REPLY',
                'status': 'FAILED',
                'step': 'BOOK_RELEASE',
                'error_message': f"Book release error: {str(e)}"
            }
            
            self.producer.send(BOOK_REPLY_TOPIC, key=transaction_id.encode('utf-8'), value=reply_event)
            self.producer.flush()
            logger.info(f"📤 [BOOK-SERVICE] Sent RELEASE FAILED reply to topic: {BOOK_REPLY_TOPIC}")

# Global consumer instance
_saga_consumer = None

def start_saga_consumer():
    """Start the Saga consumer"""
    global _saga_consumer
    if _saga_consumer is None:
        _saga_consumer = SagaBookConsumer()
        _saga_consumer.start()
    return _saga_consumer

def stop_saga_consumer():
    """Stop the Saga consumer"""
    global _saga_consumer
    if _saga_consumer:
        _saga_consumer.stop()
        _saga_consumer = None
