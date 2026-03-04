from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from django.db import connection
from django.conf import settings
from datetime import datetime
import time
import requests

from .models import Cart, CartItem
from .serializers import (
    CartSerializer, 
    CartItemSerializer, 
    AddToCartSerializer, 
    UpdateCartItemSerializer,
    CartItemDetailSerializer
)

# Service URLs
BOOK_SERVICE_URL = settings.BOOK_SERVICE_URL

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
        'service': 'cart-service',
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
    
    total_carts = Cart.objects.count()
    total_items = CartItem.objects.count()
    
    return Response({
        'requests_total': request_count,
        'requests_per_second': round(requests_per_second, 2),
        'uptime_seconds': round(uptime, 2),
        'total_carts': total_carts,
        'total_cart_items': total_items,
        'timestamp': datetime.now().isoformat()
    }, status=status.HTTP_200_OK)


# ============================
# Cart Endpoints
# ============================

@api_view(['GET'])
@permission_classes([AllowAny])
def get_cart(request, customer_id):
    """Get customer's cart with book details"""
    global request_count
    request_count += 1
    
    # Get or create cart
    cart, created = Cart.objects.get_or_create(customer_id=str(customer_id))
    
    # Get cart items
    items = CartItem.objects.filter(cart=cart)
    
    if not items.exists():
        return Response({
            'cart_id': cart.id,
            'customer_id': cart.customer_id,
            'items': [],
            'total_items': 0,
            'total_amount': 0.0,
            'updated_at': cart.updated_at
        }, status=status.HTTP_200_OK)
    
    # Fetch book details from book-service
    items_with_details = []
    total_amount = 0.0
    
    for item in items:
        try:
            response = requests.get(
                f"{BOOK_SERVICE_URL}/books/{item.book_id}/",
                timeout=5
            )
            if response.status_code == 200:
                book = response.json()
                subtotal = float(book['price']) * item.quantity
                
                items_with_details.append({
                    'id': item.id,
                    'book_id': item.book_id,
                    'title': book['title'],
                    'author': book.get('author', 'Unknown Author'),
                    'cover_image_url': book.get('cover_image_url'),
                    'price': book['price'],
                    'quantity': item.quantity,
                    'subtotal': round(subtotal, 2),
                    'added_at': item.added_at
                })
                total_amount += subtotal
        except Exception as e:
            # If book service is unavailable, return basic info
            items_with_details.append({
                'id': item.id,
                'book_id': item.book_id,
                'title': 'Unknown',
                'price': 0.0,
                'quantity': item.quantity,
                'subtotal': 0.0,
                'added_at': item.added_at
            })
    
    return Response({
        'cart_id': cart.id,
        'customer_id': cart.customer_id,
        'items': items_with_details,
        'total_items': items.count(),
        'total_amount': round(total_amount, 2),
        'updated_at': cart.updated_at
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def add_to_cart(request, customer_id):
    """Add item to cart"""
    global request_count
    request_count += 1
    
    serializer = AddToCartSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    book_id = serializer.validated_data['book_id']
    quantity = serializer.validated_data['quantity']
    
    # Verify book exists
    try:
        response = requests.get(
            f"{BOOK_SERVICE_URL}/books/{book_id}/",
            timeout=5
        )
        if response.status_code != 200:
            return Response(
                {'error': 'Book not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    except Exception as e:
        return Response(
            {'error': 'Book service unavailable'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    # Get or create cart
    cart, created = Cart.objects.get_or_create(customer_id=str(customer_id))
    
    # Add or update cart item
    cart_item, item_created = CartItem.objects.get_or_create(
        cart=cart,
        book_id=book_id,
        defaults={'quantity': quantity}
    )
    
    if not item_created:
        cart_item.quantity += quantity
        cart_item.save()
    
    return Response({
        'item_id': cart_item.id,
        'book_id': cart_item.book_id,
        'quantity': cart_item.quantity,
        'added_at': cart_item.added_at
    }, status=status.HTTP_201_CREATED)


@api_view(['PUT'])
@permission_classes([AllowAny])
def update_cart_item(request, customer_id, item_id):
    """Update cart item quantity"""
    global request_count
    request_count += 1
    
    serializer = UpdateCartItemSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        cart = Cart.objects.get(customer_id=str(customer_id))
        cart_item = CartItem.objects.get(id=item_id, cart=cart)
    except (Cart.DoesNotExist, CartItem.DoesNotExist):
        return Response(
            {'error': 'Cart item not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    cart_item.quantity = serializer.validated_data['quantity']
    cart_item.save()
    
    return Response({
        'item_id': cart_item.id,
        'quantity': cart_item.quantity,
        'updated_at': cart.updated_at
    }, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([AllowAny])
def remove_cart_item(request, customer_id, item_id):
    """Remove item from cart"""
    global request_count
    request_count += 1
    
    try:
        cart = Cart.objects.get(customer_id=str(customer_id))
        cart_item = CartItem.objects.get(id=item_id, cart=cart)
        cart_item.delete()
        
        return Response(
            {'message': 'Item removed from cart'},
            status=status.HTTP_200_OK
        )
    except (Cart.DoesNotExist, CartItem.DoesNotExist):
        return Response(
            {'error': 'Cart item not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['DELETE'])
@permission_classes([AllowAny])
def clear_cart(request, customer_id):
    """Clear all items from cart"""
    global request_count
    request_count += 1
    
    try:
        cart = Cart.objects.get(customer_id=str(customer_id))
        CartItem.objects.filter(cart=cart).delete()
        
        return Response(
            {'message': 'Cart cleared successfully'},
            status=status.HTTP_200_OK
        )
    except Cart.DoesNotExist:
        return Response(
            {'error': 'Cart not found'},
            status=status.HTTP_404_NOT_FOUND
        )


# ============================
# Legacy Endpoints
# ============================

class CartCreate(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        global request_count
        request_count += 1
        
        serializer = CartSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AddCartItem(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        global request_count
        request_count += 1
        
        book_id = request.data.get('book_id')
        
        # Verify book exists
        try:
            r = requests.get(f"{BOOK_SERVICE_URL}/books/{book_id}/", timeout=5)
            if r.status_code != 200:
                return Response({"error": "Book not found"}, status=status.HTTP_404_NOT_FOUND)
        except:
            return Response({"error": "Book service unavailable"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        serializer = CartItemSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ViewCart(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request, customer_id):
        global request_count
        request_count += 1
        
        try:
            cart = Cart.objects.get(customer_id=str(customer_id))
            items = CartItem.objects.filter(cart=cart)
            serializer = CartItemSerializer(items, many=True)
            return Response(serializer.data)
        except Cart.DoesNotExist:
            return Response([], status=status.HTTP_200_OK)