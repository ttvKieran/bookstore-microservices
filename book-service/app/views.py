from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from django.db import connection
from django.db.models import Q
from datetime import datetime
import time

from .models import Book
from .serializers import BookSerializer, BookCreateSerializer, BookUpdateSerializer, StockUpdateSerializer

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
        'service': 'book-service',
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
    
    total_books = Book.objects.count()
    low_stock_count = Book.objects.filter(stock_quantity__lt=10).count()
    
    return Response({
        'requests_total': request_count,
        'requests_per_second': round(requests_per_second, 2),
        'uptime_seconds': round(uptime, 2),
        'total_books': total_books,
        'low_stock_count': low_stock_count,
        'timestamp': datetime.now().isoformat()
    }, status=status.HTTP_200_OK)


# ============================
# Book Endpoints
# ============================

@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def list_books(request):
    """List all books (GET) or create new book (POST)"""
    global request_count
    request_count += 1
    
    if request.method == 'POST':
        # Create new book
        serializer = BookCreateSerializer(data=request.data)
        if serializer.is_valid():
            book = serializer.save()
            return Response(
                BookSerializer(book).data, 
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # GET - List books with pagination
    page = int(request.GET.get('page', 1))
    limit = int(request.GET.get('limit', 20))
    sort_by = request.GET.get('sort', 'title')
    
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    
    books = Book.objects.all().order_by(sort_by)[start_idx:end_idx]
    total = Book.objects.count()
    
    serializer = BookSerializer(books, many=True)
    
    return Response({
        'total': total,
        'page': page,
        'limit': limit,
        'data': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([AllowAny])
def book_detail(request, book_id):
    """Get, update or delete book"""
    global request_count
    request_count += 1
    
    try:
        book = Book.objects.get(id=book_id)
    except Book.DoesNotExist:
        return Response(
            {'error': 'Book not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'GET':
        serializer = BookSerializer(book)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    elif request.method in ['PUT', 'PATCH']:
        serializer = BookUpdateSerializer(book, data=request.data, partial=(request.method == 'PATCH'))
        if serializer.is_valid():
            serializer.save()
            response_serializer = BookSerializer(book)
            return Response(response_serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        book.delete()
        return Response(
            {'message': 'Book deleted successfully'},
            status=status.HTTP_204_NO_CONTENT
        )


@api_view(['POST'])
def create_book(request):
    """Create new book (admin only)"""
    global request_count
    request_count += 1
    
    serializer = BookCreateSerializer(data=request.data)
    if serializer.is_valid():
        book = serializer.save()
        return Response(
            BookSerializer(book).data, 
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT'])
def update_book(request, book_id):
    """Update book details"""
    global request_count
    request_count += 1
    
    try:
        book = Book.objects.get(id=book_id)
    except Book.DoesNotExist:
        return Response(
            {'error': 'Book not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = BookUpdateSerializer(book, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(BookSerializer(book).data, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
def delete_book(request, book_id):
    """Delete book"""
    global request_count
    request_count += 1
    
    try:
        book = Book.objects.get(id=book_id)
        book.delete()
        return Response(
            {'message': 'Book deleted successfully'}, 
            status=status.HTTP_200_OK
        )
    except Book.DoesNotExist:
        return Response(
            {'error': 'Book not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def search_books(request):
    """Search books by title, author, or ISBN"""
    global request_count
    request_count += 1
    
    query = request.GET.get('q', '')
    author = request.GET.get('author', '')
    
    books = Book.objects.all()
    
    if query:
        books = books.filter(
            Q(title__icontains=query) | 
            Q(isbn__icontains=query) |
            Q(author__icontains=query)
        )
    
    if author:
        books = books.filter(author__icontains=author)
    
    serializer = BookSerializer(books, many=True)
    
    return Response({
        'total': books.count(),
        'data': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['PUT'])
def update_stock(request, book_id):
    """Update book stock quantity"""
    global request_count
    request_count += 1
    
    try:
        book = Book.objects.get(id=book_id)
    except Book.DoesNotExist:
        return Response(
            {'error': 'Book not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = StockUpdateSerializer(book, data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({
            'id': book.id,
            'stock_quantity': book.stock_quantity
        }, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ============================
# Legacy Endpoints
# ============================

class BookListCreate(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        global request_count
        request_count += 1
        
        books = Book.objects.all()
        serializer = BookSerializer(books, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        global request_count
        request_count += 1
        
        serializer = BookCreateSerializer(data=request.data)
        if serializer.is_valid():
            book = serializer.save()
            return Response(
                BookSerializer(book).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)