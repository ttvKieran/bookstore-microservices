from django.shortcuts import render
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
import requests
import time
from datetime import datetime

# Service URLs from settings
CUSTOMER_SERVICE_URL = settings.CUSTOMER_SERVICE_URL
BOOK_SERVICE_URL = settings.BOOK_SERVICE_URL
CART_SERVICE_URL = settings.CART_SERVICE_URL
STAFF_SERVICE_URL = settings.STAFF_SERVICE_URL
MANAGER_SERVICE_URL = settings.MANAGER_SERVICE_URL
CATALOG_SERVICE_URL = settings.CATALOG_SERVICE_URL
RECOMMENDER_SERVICE_URL = settings.RECOMMENDER_SERVICE_URL
ORDER_SERVICE_URL = settings.ORDER_SERVICE_URL
PAYMENT_SERVICE_URL = settings.PAYMENT_SERVICE_URL
SHIPMENT_SERVICE_URL = settings.SHIPMENT_SERVICE_URL
COMMENT_RATE_SERVICE_URL = settings.COMMENT_RATE_SERVICE_URL

# Metrics tracking
request_count = 0
start_time = time.time()
error_count = 0


# ============================
# Health & Metrics Endpoints
# ============================

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Health check endpoint for API Gateway"""
    return Response({
        'status': 'healthy',
        'service': 'api-gateway',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0'
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def metrics(request):
    """Metrics endpoint for monitoring"""
    global request_count, start_time, error_count
    
    uptime = time.time() - start_time
    requests_per_second = request_count / uptime if uptime > 0 else 0
    error_rate = error_count / request_count if request_count > 0 else 0
    
    return Response({
        'requests_total': request_count,
        'requests_per_second': round(requests_per_second, 2),
        'error_count': error_count,
        'error_rate': round(error_rate, 4),
        'uptime_seconds': round(uptime, 2),
        'timestamp': datetime.now().isoformat()
    }, status=status.HTTP_200_OK)


# Authentication Endpoints

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """Customer login endpoint"""
    global request_count, error_count
    request_count += 1
    
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        error_count += 1
        return Response({
            'error': 'Username and password are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Forward to customer service for verification
        response = requests.post(
            f"{CUSTOMER_SERVICE_URL}/customers/verify-credentials/",
            json={'username': username, 'password': password},
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('valid'):
                # Generate JWT tokens
                refresh = RefreshToken()
                refresh['user_id'] = data.get('user_id')
                refresh['username'] = username
                refresh['role'] = 'customer'
                
                return Response({
                    'access_token': str(refresh.access_token),
                    'refresh_token': str(refresh),
                    'token_type': 'Bearer',
                    'expires_in': 3600,
                    'user': {
                        'id': data.get('user_id'),
                        'username': username,
                        'role': 'customer'
                    }
                }, status=status.HTTP_200_OK)
        
        error_count += 1
        return Response({
            'error': 'Invalid credentials'
        }, status=status.HTTP_401_UNAUTHORIZED)
        
    except requests.exceptions.RequestException as e:
        error_count += 1
        return Response({
            'error': 'Customer service unavailable'
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)


@api_view(['POST'])
@permission_classes([AllowAny])
def staff_login(request):
    """Staff login endpoint"""
    global request_count, error_count
    request_count += 1
    
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        error_count += 1
        return Response({
            'error': 'Username and password are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Forward to staff service for verification
        response = requests.post(
            f"{STAFF_SERVICE_URL}/staff/verify-credentials/",
            json={'username': username, 'password': password},
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('valid'):
                # Generate JWT tokens
                refresh = RefreshToken()
                refresh['user_id'] = data.get('user_id')
                refresh['username'] = username
                refresh['role'] = 'staff'
                
                return Response({
                    'access_token': str(refresh.access_token),
                    'refresh_token': str(refresh),
                    'token_type': 'Bearer',
                    'expires_in': 3600,
                    'user': {
                        'id': data.get('user_id'),
                        'username': username,
                        'role': 'staff'
                    }
                }, status=status.HTTP_200_OK)
        
        error_count += 1
        return Response({
            'error': 'Invalid credentials'
        }, status=status.HTTP_401_UNAUTHORIZED)
        
    except requests.exceptions.RequestException as e:
        error_count += 1
        return Response({
            'error': 'Staff service unavailable'
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)


@api_view(['POST'])
@permission_classes([AllowAny])
def manager_login(request):
    """Manager login endpoint"""
    global request_count, error_count
    request_count += 1
    
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        error_count += 1
        return Response({
            'error': 'Username and password are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Forward to manager service for verification
        response = requests.post(
            f"{MANAGER_SERVICE_URL}/managers/verify-credentials/",
            json={'username': username, 'password': password},
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('valid'):
                # Generate JWT tokens
                refresh = RefreshToken()
                refresh['user_id'] = data.get('user_id')
                refresh['username'] = username
                refresh['role'] = 'manager'
                
                return Response({
                    'access_token': str(refresh.access_token),
                    'refresh_token': str(refresh),
                    'token_type': 'Bearer',
                    'expires_in': 3600,
                    'user': {
                        'id': data.get('user_id'),
                        'username': username,
                        'role': 'manager'
                    }
                }, status=status.HTTP_200_OK)
        
        error_count += 1
        return Response({
            'error': 'Invalid credentials'
        }, status=status.HTTP_401_UNAUTHORIZED)
        
    except requests.exceptions.RequestException as e:
        error_count += 1
        return Response({
            'error': 'Manager service unavailable'
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token(request):
    """Refresh JWT token"""
    global request_count, error_count
    request_count += 1
    
    refresh_token_str = request.data.get('refresh_token')
    
    if not refresh_token_str:
        error_count += 1
        return Response({
            'error': 'Refresh token is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        refresh = RefreshToken(refresh_token_str)
        return Response({
            'access_token': str(refresh.access_token),
            'expires_in': 3600
        }, status=status.HTTP_200_OK)
    except Exception as e:
        error_count += 1
        return Response({
            'error': 'Invalid refresh token'
        }, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
def logout(request):
    """Logout endpoint (blacklist token)"""
    global request_count
    request_count += 1
    
    return Response({
        'message': 'Successfully logged out'
    }, status=status.HTTP_200_OK)


# ============================
# Legacy Template Views (for backward compatibility)
# ============================

def book_list(request):
    """Legacy view for book list"""
    global request_count
    request_count += 1
    
    try:
        r = requests.get(f"{BOOK_SERVICE_URL}/books/", timeout=5)
        return render(request, "books.html", {"books": r.json()})
    except:
        return render(request, "books.html", {"books": [], "error": "Service unavailable"})


def view_cart(request, customer_id):
    """Legacy view for cart"""
    global request_count
    request_count += 1
    
    try:
        r = requests.get(f"{CART_SERVICE_URL}/carts/{customer_id}/", timeout=5)
        return render(request, "cart.html", {"items": r.json()})
    except:
        return render(request, "cart.html", {"items": [], "error": "Service unavailable"})


# ============================
# API Proxy for Backend Services
# ============================

@api_view(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
@authentication_classes([])
@permission_classes([AllowAny])
def api_proxy(request, path):
    """Proxy requests to backend microservices"""
    global request_count, error_count
    request_count += 1
    
    # Service mapping
    SERVICE_MAP = {
        'customers': CUSTOMER_SERVICE_URL,
        'books': BOOK_SERVICE_URL,
        'carts': CART_SERVICE_URL,
        'staff': STAFF_SERVICE_URL,
        'managers': MANAGER_SERVICE_URL,
        'catalog': CATALOG_SERVICE_URL,
        'recommendations': RECOMMENDER_SERVICE_URL,
        'orders': ORDER_SERVICE_URL,
        'payments': PAYMENT_SERVICE_URL,
        'shipments': SHIPMENT_SERVICE_URL,
        'reviews': COMMENT_RATE_SERVICE_URL,
    }
    
    # Extract service name from path (first segment)
    service_name = path.split('/')[0] if path else ''
    
    # Get target service URL
    target_service = SERVICE_MAP.get(service_name)
    
    if not target_service:
        error_count += 1
        return Response({
            'error': f'Service "{service_name}" not found',
            'available_services': list(SERVICE_MAP.keys())
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Build target URL
    # Django services (Python) need trailing slash, Spring Boot & Node.js don't
    DJANGO_SERVICES = ['customers', 'books', 'carts', 'staff', 'managers', 'catalog', 'recommendations']
    
    if service_name in DJANGO_SERVICES and not path.endswith('/'):
        path = f"{path}/"
    
    target_url = f"{target_service}/{path}"
    if request.META.get('QUERY_STRING'):
        target_url += f"?{request.META['QUERY_STRING']}"
    
    print(f"[API_PROXY] {request.method} {path} -> {target_url}")
    
    try:
        # Prepare headers
        headers = {}
        if request.content_type and request.content_type != 'multipart/form-data':
            headers['Content-Type'] = request.content_type
        
        # Forward Authorization header if present
        if 'HTTP_AUTHORIZATION' in request.META:
            headers['Authorization'] = request.META['HTTP_AUTHORIZATION']
        
        # Prepare request body
        request_body = None
        if request.method in ['POST', 'PUT', 'PATCH']:
            request_body = request.data if request.data is not None else None
            print(f"[API_PROXY] Request body: {request_body}")
        
        # Forward request to backend service
        response = requests.request(
            method=request.method,
            url=target_url,
            headers=headers,
            json=request_body,
            timeout=30
        )
        
        # Parse response
        try:
            response_data = response.json() if response.content else {}
        except ValueError:
            # Not JSON response
            response_data = {
                'error': 'Backend service returned non-JSON response',
                'content': response.text[:500],
                'status_code': response.status_code
            }
        
        return Response(response_data, status=response.status_code)
        
    except requests.exceptions.Timeout:
        error_count += 1
        return Response({
            'error': 'Service timeout',
            'service': service_name
        }, status=status.HTTP_504_GATEWAY_TIMEOUT)
    
    except requests.exceptions.ConnectionError:
        error_count += 1
        return Response({
            'error': 'Service unavailable',
            'service': service_name
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    except Exception as e:
        error_count += 1
        print(f"[API_PROXY] Exception: {type(e).__name__}: {str(e)}")
        return Response({
            'error': 'Internal gateway error',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)