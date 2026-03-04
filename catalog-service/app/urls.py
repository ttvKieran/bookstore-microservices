from django.urls import path
from . import views

urlpatterns = [
    # Health & Metrics
    path('health', views.health_check, name='health_check'),
    path('metrics', views.metrics, name='metrics'),
    
    # Category endpoints
    path('categories/', views.category_list, name='category_list'),
    path('categories/<int:category_id>/', views.category_detail, name='category_detail'),
    
    # Genre endpoints
    path('genres/', views.genre_list, name='genre_list'),
    path('genres/<int:genre_id>/', views.genre_detail, name='genre_detail'),
    
    # Book-Category assignment
    path('book-categories/assign/', views.assign_category, name='assign_category'),
    path('books/<int:book_id>/categories/', views.book_categories, name='book_categories'),
    path('categories/<int:category_id>/books/', views.category_books, name='category_books'),
    
    # Book-Genre assignment
    path('book-genres/assign/', views.assign_genre, name='assign_genre'),
    path('books/<int:book_id>/genres/', views.book_genres, name='book_genres'),
    path('genres/<int:genre_id>/books/', views.genre_books, name='genre_books'),
]
