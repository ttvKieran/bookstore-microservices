from django.urls import path, re_path
from . import views

urlpatterns = [
    # Health & Metrics
    path('health', views.health_check, name='health_check'),
    path('metrics', views.metrics, name='metrics'),
    
    # Book endpoints
    path('books/', views.list_books, name='list_books'),
    re_path(r'^books/(?P<book_id>\d+)/?$', views.book_detail, name='book_detail'),
    path('books/create/', views.create_book, name='create_book'),
    path('books/<int:book_id>/update/', views.update_book, name='update_book'),
    path('books/<int:book_id>/delete/', views.delete_book, name='delete_book'),
    path('books/search/', views.search_books, name='search_books'),
    re_path(r'^books/(?P<book_id>\d+)/stock/?$', views.update_stock, name='update_stock'),
    re_path(r'^books/(?P<book_id>\d+)/reduce-stock/?$', views.reduce_stock, name='reduce_stock'),
    
    # Two-Phase Commit endpoints
    path('transactions/prepare-stock/', views.prepare_stock_reduction, name='prepare_stock_reduction'),
    path('transactions/commit/', views.commit_transaction, name='commit_transaction'),
    path('transactions/abort/', views.abort_transaction, name='abort_transaction'),
    
    # Legacy endpoint
    path('books-legacy/', views.BookListCreate.as_view(), name='book_list_create'),
]