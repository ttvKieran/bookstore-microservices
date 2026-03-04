from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
from datetime import datetime
import time
import requests
from django.conf import settings

from .models import Category, Genre, BookCategory, BookGenre
from .serializers import (
    CategorySerializer,
    GenreSerializer,
    BookCategorySerializer,
    BookGenreSerializer,
    AssignCategorySerializer,
    AssignGenreSerializer
)

# Metrics tracking
request_count = 0
start_time = time.time()


# ============================
# Health & Metrics Endpoints
# ============================

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Health check endpoint"""
    try:
        connection.ensure_connection()
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return Response({
        'status': 'healthy' if db_status == "connected" else 'unhealthy',
        'service': 'catalog-service',
        'database': db_status,
        'timestamp': datetime.now().isoformat()
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def metrics(request):
    """Metrics endpoint"""
    global request_count, start_time
    
    uptime = time.time() - start_time
    requests_per_second = request_count / uptime if uptime > 0 else 0
    
    total_categories = Category.objects.count()
    total_genres = Genre.objects.count()
    total_book_categories = BookCategory.objects.count()
    total_book_genres = BookGenre.objects.count()
    
    return Response({
        'requests_total': request_count,
        'requests_per_second': round(requests_per_second, 2),
        'uptime_seconds': round(uptime, 2),
        'total_categories': total_categories,
        'total_genres': total_genres,
        'total_book_categories': total_book_categories,
        'total_book_genres': total_book_genres,
        'timestamp': datetime.now().isoformat()
    }, status=status.HTTP_200_OK)


# ============================
# Category Endpoints
# ============================

@api_view(['GET', 'POST'])
def category_list(request):
    """List all categories or create new category"""
    global request_count
    request_count += 1
    
    if request.method == 'GET':
        # Get root categories (no parent)
        root_only = request.GET.get('root_only', 'false').lower() == 'true'
        
        if root_only:
            categories = Category.objects.filter(parent=None)
        else:
            categories = Category.objects.all()
        
        serializer = CategorySerializer(categories, many=True)
        return Response({
            'total': categories.count(),
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        serializer = CategorySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
def category_detail(request, category_id):
    """Get, update or delete category"""
    global request_count
    request_count += 1
    
    try:
        category = Category.objects.get(id=category_id)
    except Category.DoesNotExist:
        return Response(
            {'error': 'Category not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'GET':
        serializer = CategorySerializer(category)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    elif request.method == 'PUT':
        serializer = CategorySerializer(category, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        category.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================
# Genre Endpoints
# ============================

@api_view(['GET', 'POST'])
def genre_list(request):
    """List all genres or create new genre"""
    global request_count
    request_count += 1
    
    if request.method == 'GET':
        genres = Genre.objects.all()
        serializer = GenreSerializer(genres, many=True)
        return Response({
            'total': genres.count(),
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        serializer = GenreSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
def genre_detail(request, genre_id):
    """Get, update or delete genre"""
    global request_count
    request_count += 1
    
    try:
        genre = Genre.objects.get(id=genre_id)
    except Genre.DoesNotExist:
        return Response(
            {'error': 'Genre not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'GET':
        serializer = GenreSerializer(genre)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    elif request.method == 'PUT':
        serializer = GenreSerializer(genre, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        genre.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================
# Book-Category Assignment Endpoints
# ============================

@api_view(['POST'])
def assign_category(request):
    """Assign category to book"""
    global request_count
    request_count += 1
    
    serializer = AssignCategorySerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    book_id = serializer.validated_data['book_id']
    category_id = serializer.validated_data['category_id']
    
    # Verify book exists
    try:
        book_response = requests.get(f"{settings.BOOK_SERVICE_URL}/books/{book_id}/", timeout=5)
        if book_response.status_code != 200:
            return Response(
                {'error': 'Book not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    except Exception as e:
        return Response(
            {'error': f'Failed to verify book: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Verify category exists
    try:
        category = Category.objects.get(id=category_id)
    except Category.DoesNotExist:
        return Response(
            {'error': 'Category not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Create or get assignment
    book_category, created = BookCategory.objects.get_or_create(
        book_id=book_id,
        category=category
    )
    
    return Response(
        BookCategorySerializer(book_category).data,
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
    )


@api_view(['GET', 'POST'])
def book_categories(request, book_id):
    """Get all categories for a book OR assign a category to a book"""
    global request_count
    request_count += 1
    
    if request.method == 'GET':
        # Get all categories for this book
        categories = BookCategory.objects.filter(book_id=book_id)
        serializer = BookCategorySerializer(categories, many=True)
        
        return Response({
            'book_id': book_id,
            'categories': serializer.data
        }, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        # Assign a category to this book
        category_id = request.data.get('category_id')
        
        if not category_id:
            return Response(
                {'error': 'category_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify book exists
        try:
            book_response = requests.get(f"{settings.BOOK_SERVICE_URL}/books/{book_id}/", timeout=5)
            if book_response.status_code != 200:
                return Response(
                    {'error': 'Book not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        except Exception as e:
            return Response(
                {'error': f'Failed to verify book: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Verify category exists
        try:
            category = Category.objects.get(id=category_id)
        except Category.DoesNotExist:
            return Response(
                {'error': 'Category not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create or get assignment
        book_category, created = BookCategory.objects.get_or_create(
            book_id=book_id,
            category=category
        )
        
        return Response(
            BookCategorySerializer(book_category).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )


@api_view(['GET'])
def category_books(request, category_id):
    """Get all books in a category"""
    global request_count
    request_count += 1
    
    try:
        category = Category.objects.get(id=category_id)
    except Category.DoesNotExist:
        return Response(
            {'error': 'Category not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    book_categories = BookCategory.objects.filter(category=category)
    book_ids = [bc.book_id for bc in book_categories]
    
    # Fetch book details from book-service
    books = []
    try:
        for book_id in book_ids:
            book_response = requests.get(f"{settings.BOOK_SERVICE_URL}/books/{book_id}/", timeout=5)
            if book_response.status_code == 200:
                books.append(book_response.json())
    except Exception as e:
        return Response(
            {'error': f'Failed to fetch books: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    return Response({
        'category': CategorySerializer(category).data,
        'books': books
    }, status=status.HTTP_200_OK)


# ============================
# Book-Genre Assignment Endpoints
# ============================

@api_view(['POST'])
def assign_genre(request):
    """Assign genre to book"""
    global request_count
    request_count += 1
    
    serializer = AssignGenreSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    book_id = serializer.validated_data['book_id']
    genre_id = serializer.validated_data['genre_id']
    
    # Verify book exists
    try:
        book_response = requests.get(f"{settings.BOOK_SERVICE_URL}/books/{book_id}/", timeout=5)
        if book_response.status_code != 200:
            return Response(
                {'error': 'Book not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    except Exception as e:
        return Response(
            {'error': f'Failed to verify book: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Verify genre exists
    try:
        genre = Genre.objects.get(id=genre_id)
    except Genre.DoesNotExist:
        return Response(
            {'error': 'Genre not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Create or get assignment
    book_genre, created = BookGenre.objects.get_or_create(
        book_id=book_id,
        genre=genre
    )
    
    return Response(
        BookGenreSerializer(book_genre).data,
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
    )


@api_view(['GET'])
def book_genres(request, book_id):
    """Get all genres for a book"""
    global request_count
    request_count += 1
    
    genres = BookGenre.objects.filter(book_id=book_id)
    serializer = BookGenreSerializer(genres, many=True)
    
    return Response({
        'book_id': book_id,
        'genres': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
def genre_books(request, genre_id):
    """Get all books in a genre"""
    global request_count
    request_count += 1
    
    try:
        genre = Genre.objects.get(id=genre_id)
    except Genre.DoesNotExist:
        return Response(
            {'error': 'Genre not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    book_genres = BookGenre.objects.filter(genre=genre)
    book_ids = [bg.book_id for bg in book_genres]
    
    # Fetch book details from book-service
    books = []
    try:
        for book_id in book_ids:
            book_response = requests.get(f"{settings.BOOK_SERVICE_URL}/books/{book_id}/", timeout=5)
            if book_response.status_code == 200:
                books.append(book_response.json())
    except Exception as e:
        return Response(
            {'error': f'Failed to fetch books: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    return Response({
        'genre': GenreSerializer(genre).data,
        'books': books
    }, status=status.HTTP_200_OK)
