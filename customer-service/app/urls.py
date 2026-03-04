from django.urls import path
from . import views

urlpatterns = [
    # Health & Metrics
    path('health', views.health_check, name='health_check'),
    path('metrics', views.metrics, name='metrics'),
    
    # Customer endpoints
    path('customers/register/', views.register_customer, name='register_customer'),
    path('customers/<uuid:customer_id>/', views.customer_detail, name='customer_detail'),
    path('customers/verify-credentials/', views.verify_credentials, name='verify_credentials'),
    
    # Address endpoints
    path('customers/<uuid:customer_id>/addresses/', views.add_address, name='add_address'),
    path('customers/<uuid:customer_id>/addresses/list/', views.list_addresses, name='list_addresses'),
    
    # Legacy endpoint
    path('customers/', views.CustomerListCreate.as_view(), name='customer_list_create'),
]