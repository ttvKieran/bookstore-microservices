from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)


class AppConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "app"
    
    def ready(self):
        """Called when Django app is ready"""
        # Start Saga consumer for orchestration-based distributed transactions
        try:
            from app.saga_consumer import start_saga_consumer
            start_saga_consumer()
            logger.info("✅ [BOOK-SERVICE] Saga consumer initialized")
        except Exception as e:
            logger.error(f"❌ [BOOK-SERVICE] Failed to start Saga consumer: {e}")
