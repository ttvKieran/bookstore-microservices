"""
URL configuration for api_gateway project.
"""

from django.contrib import admin
from django.urls import path, re_path
from . import views

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Health & Metrics
    path('health', views.health_check, name='health_check'),
    path('metrics', views.metrics, name='metrics'),
    
    # Authentication API
    path('api/auth/login', views.login, name='login'),
    path('api/auth/staff/login', views.staff_login, name='staff_login'),
    path('api/auth/manager/login', views.manager_login, name='manager_login'),
    path('api/auth/refresh', views.refresh_token, name='refresh_token'),
    path('api/auth/logout', views.logout, name='logout'),
    
    # Legacy template views (for backward compatibility)
    path('books/', views.book_list, name='book_list'), 
    path('cart/<int:customer_id>/', views.view_cart, name='view_cart'),
    
    # Catch-all proxy for backend services (must be last)
    re_path(r'^api/(?P<path>.*)$', views.api_proxy, name='api_proxy'),
]