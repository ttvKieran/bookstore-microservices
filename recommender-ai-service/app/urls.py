from django.urls import path
from . import views

urlpatterns = [
    # Health & Metrics
    path('health', views.health_check, name='health_check'),
    path('metrics', views.metrics, name='metrics'),
    
    # Recommendation endpoints (match API design)
    path('<str:customer_id>/', views.personalized_recommendations, name='personalized_recommendations'),
    path('similar/<int:book_id>/', views.similar_books, name='similar_books'),
    path('trending/', views.trending_books, name='trending_books'),
    
    # Interaction tracking
    path('track/', views.track_interaction, name='track_interaction'),
]
