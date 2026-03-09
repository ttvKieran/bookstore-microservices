from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from django.db import connection
from django.db.models import Q
from datetime import datetime
import time
import logging

logger = logging.getLogger(__name__)

from .models import Book
from .serializers import BookSerializer, BookCreateSerializer, BookUpdateSerializer, StockUpdateSerializer, StockReduceSerializer

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


@api_view(['POST'])
def reduce_stock(request, book_id):
    """Reduce book stock quantity (for orders)"""

    print("==== DEBUG DJANGO RECEIVE ====")
    print("1. CONTENT_TYPE:", request.META.get('CONTENT_TYPE'))
    print("2. RAW BODY:", request.body)
    print("3. DRF DATA:", request.data)
    print("==============================")

    global request_count
    request_count += 1
    
    try:
        book = Book.objects.get(id=book_id)
    except Book.DoesNotExist:
        return Response(
            {'error': 'Book not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = StockReduceSerializer(book, data=request.data)
    if serializer.is_valid():
        try:
            serializer.save()
            return Response({
                'id': book.id,
                'stock_quantity': book.stock_quantity,
                'message': 'Stock reduced successfully'
            }, status=status.HTTP_200_OK)
        except serializers.ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
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


# ============================
# Two-Phase Commit Endpoints
# ============================

@api_view(['POST'])
@permission_classes([AllowAny])
def prepare_stock_reduction(request):
    """
    2PC PREPARE Phase: Validate and lock stock for reduction
    Request body: {
        "transaction_id": "string",
        "book_id": "integer",
        "quantity": "integer"
    }
    """
    from .transaction_manager import TransactionManager
    
    global request_count
    request_count += 1
    
    transaction_id = request.data.get('transaction_id')
    book_id = request.data.get('book_id')
    quantity = request.data.get('quantity')
    
    logger.info(f"📥 [BOOK-PREPARE] Global TxnID: {transaction_id}, Book: {book_id}, Qty: {quantity}")
    
    if not all([transaction_id, book_id, quantity]):
        return Response({
            'ready': False,
            'transaction_id': None,
            'message': 'Missing required fields: transaction_id, book_id, quantity'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        book = Book.objects.get(id=book_id)
        logger.info(f"📚 [BOOK-PREPARE] Found book {book_id}, current stock: {book.stock_quantity}")
    except Book.DoesNotExist:
        return Response({
            'ready': False,
            'transaction_id': None,
            'message': f'Book not found: {book_id}'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Prepare transaction
    success, txn_id, message = TransactionManager.prepare_stock_reduction(
        book, quantity, transaction_id
    )
    logger.info(f"📝 [BOOK-PREPARE] Result: success={success}, txn_id={txn_id}, msg={message}")
    
    if success:
        return Response({
            'ready': True,
            'transaction_id': txn_id,
            'message': message,
            'data': {
                'book_id': book_id,
                'quantity': quantity,
                'available_stock': book.stock_quantity
            }
        }, status=status.HTTP_200_OK)
    else:
        return Response({
            'ready': False,
            'transaction_id': None,
            'message': message
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def commit_transaction(request):
    """
    2PC COMMIT Phase: Actually perform the stock reduction
    Request body: {
        "transaction_id": "string",
        "action": "COMMIT"
    }
    """
    from .transaction_manager import TransactionManager
    
    global request_count
    request_count += 1
    
    transaction_id = request.data.get('transaction_id')
    action = request.data.get('action')
    
    logger.info(f"✅ [BOOK-COMMIT] Received: txn_id={transaction_id}, action={action}")
    
    if not transaction_id:
        logger.error(f"❌ [BOOK-COMMIT] Missing transaction_id in request!")
        return Response({
            'success': False,
            'message': 'Missing transaction_id'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if action != 'COMMIT':
        logger.error(f"❌ [BOOK-COMMIT] Invalid action: {action}")
        return Response({
            'success': False,
            'message': f'Invalid action: {action}. Expected: COMMIT'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Commit transaction
    success, message = TransactionManager.commit_transaction(transaction_id)
    logger.info(f"💾 [BOOK-COMMIT] Result: success={success}, msg={message}")
    
    if success:
        return Response({
            'success': True,
            'message': message
        }, status=status.HTTP_200_OK)
    else:
        logger.error(f"❌ [BOOK-COMMIT] Commit failed for txn {transaction_id}: {message}")
        return Response({
            'success': False,
            'message': message
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def abort_transaction(request):
    """
    2PC ABORT Phase: Rollback/cancel the prepared transaction
    Request body: {
        "transaction_id": "string",
        "action": "ABORT"
    }
    """
    from .transaction_manager import TransactionManager
    
    global request_count
    request_count += 1
    
    transaction_id = request.data.get('transaction_id')
    action = request.data.get('action')
    
    if not transaction_id:
        return Response({
            'success': False,
            'message': 'Missing transaction_id'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if action != 'ABORT':
        return Response({
            'success': False,
            'message': f'Invalid action: {action}. Expected: ABORT'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Abort transaction
    success, message = TransactionManager.abort_transaction(transaction_id)
    
    return Response({
        'success': True,
        'message': message
    }, status=status.HTTP_200_OK)