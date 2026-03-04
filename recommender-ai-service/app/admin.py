from django.contrib import admin
from .models import Recommendation, CustomerInteraction

@admin.register(Recommendation)
class RecommendationAdmin(admin.ModelAdmin):
    list_display = ['customer_id', 'book_id', 'score', 'algorithm', 'created_at']
    list_filter = ['algorithm', 'created_at']
    search_fields = ['customer_id', 'book_id']

@admin.register(CustomerInteraction)
class CustomerInteractionAdmin(admin.ModelAdmin):
    list_display = ['customer_id', 'book_id', 'interaction_type', 'timestamp']
    list_filter = ['interaction_type', 'timestamp']
    search_fields = ['customer_id', 'book_id']
