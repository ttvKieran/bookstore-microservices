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

    # Explicit service proxy routes
    re_path(r'^api/(?P<path>customers(?:/.*)?)$', views.api_proxy, name='customers_proxy'),
    re_path(r'^api/(?P<path>books(?:/.*)?)$', views.api_proxy, name='books_proxy'),
    re_path(r'^api/(?P<path>carts(?:/.*)?)$', views.api_proxy, name='carts_proxy'),
    re_path(r'^api/(?P<path>staff(?:/.*)?)$', views.api_proxy, name='staff_proxy'),
    re_path(r'^api/(?P<path>managers(?:/.*)?)$', views.api_proxy, name='managers_proxy'),
    re_path(r'^api/(?P<path>catalog(?:/.*)?)$', views.api_proxy, name='catalog_proxy'),
    re_path(r'^api/(?P<path>recommendations(?:/.*)?)$', views.api_proxy, name='recommendations_proxy'),
    re_path(r'^api/(?P<path>orders(?:/.*)?)$', views.api_proxy, name='orders_proxy'),
    re_path(r'^api/(?P<path>payments(?:/.*)?)$', views.api_proxy, name='payments_proxy'),
    re_path(r'^api/(?P<path>shipments(?:/.*)?)$', views.api_proxy, name='shipments_proxy'),
    re_path(r'^api/(?P<path>reviews(?:/.*)?)$', views.api_proxy, name='reviews_proxy'),
]