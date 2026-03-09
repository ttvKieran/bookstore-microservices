from django.urls import path, re_path
from . import views

urlpatterns = [
    # Health & Metrics
    path('health', views.health_check, name='health_check'),
    path('metrics', views.metrics, name='metrics'),
    
    # Cart endpoints (accept with or without trailing slash)
    re_path(r'^carts/(?P<customer_id>[^/]+)/?$', views.get_cart, name='get_cart'),
    re_path(r'^carts/(?P<customer_id>[^/]+)/items/?$', views.add_to_cart, name='add_to_cart'),
    re_path(r'^carts/(?P<customer_id>[^/]+)/items/(?P<item_id>\d+)/?$', views.update_cart_item, name='update_cart_item'),
    re_path(r'^carts/(?P<customer_id>[^/]+)/items/(?P<item_id>\d+)/delete/?$', views.remove_cart_item, name='remove_cart_item'),
    re_path(r'^carts/(?P<customer_id>[^/]+)/clear/?$', views.clear_cart, name='clear_cart'),
    
    # Two-Phase Commit endpoints
    path('transactions/prepare-clear/', views.prepare_cart_clear, name='prepare_cart_clear'),
    path('transactions/commit/', views.commit_cart_transaction, name='commit_cart_transaction'),
    path('transactions/abort/', views.abort_cart_transaction, name='abort_cart_transaction'),
    
    # Legacy endpoints
    path('carts-create/', views.CartCreate.as_view(), name='cart_create'),
    path('cart-items/', views.AddCartItem.as_view(), name='add_cart_item_legacy'),
    path('carts-legacy/<int:customer_id>/', views.ViewCart.as_view(), name='view_cart_legacy'),
]