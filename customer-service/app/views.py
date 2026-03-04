from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from django.db import connection
from datetime import datetime
import time

from .models import Customer, CustomerAddress
from .serializers import (
    CustomerSerializer, 
    CustomerRegistrationSerializer, 
    CredentialVerificationSerializer,
    CustomerAddressSerializer
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
        # Check database connection
        connection.ensure_connection()
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return Response({
        'status': 'healthy' if db_status == "connected" else 'unhealthy',
        'service': 'customer-service',
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
    
    return Response({
        'requests_total': request_count,
        'requests_per_second': round(requests_per_second, 2),
        'uptime_seconds': round(uptime, 2),
        'database_connections': len(connection.queries),
        'timestamp': datetime.now().isoformat()
    }, status=status.HTTP_200_OK)


# ============================
# Customer Endpoints
# ============================

@api_view(['POST'])
@permission_classes([AllowAny])
def register_customer(request):
    """Register new customer"""
    global request_count
    request_count += 1
    
    serializer = CustomerRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        customer = serializer.save()
        return Response(
            CustomerSerializer(customer).data, 
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT'])
def customer_detail(request, customer_id):
    """Get or update customer profile"""
    global request_count
    request_count += 1
    
    try:
        customer = Customer.objects.get(id=customer_id)
    except Customer.DoesNotExist:
        return Response(
            {'error': 'Customer not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'GET':
        serializer = CustomerSerializer(customer)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = CustomerSerializer(customer, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_credentials(request):
    """Verify customer credentials (for API Gateway)"""
    global request_count
    request_count += 1
    
    serializer = CredentialVerificationSerializer(data=request.data)
    if serializer.is_valid():
        result = serializer.validated_data
        return Response(result, status=status.HTTP_200_OK)
    return Response({'valid': False}, status=status.HTTP_200_OK)


@api_view(['POST'])
def add_address(request, customer_id):
    """Add address for customer"""
    global request_count
    request_count += 1
    
    try:
        customer = Customer.objects.get(id=customer_id)
    except Customer.DoesNotExist:
        return Response(
            {'error': 'Customer not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = CustomerAddressSerializer(data=request.data)
    if serializer.is_valid():
        address = serializer.save(customer=customer)
        return Response(
            CustomerAddressSerializer(address).data, 
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def list_addresses(request, customer_id):
    """List all addresses for customer"""
    global request_count
    request_count += 1
    
    try:
        customer = Customer.objects.get(id=customer_id)
    except Customer.DoesNotExist:
        return Response(
            {'error': 'Customer not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    addresses = customer.addresses.all()
    serializer = CustomerAddressSerializer(addresses, many=True)
    return Response(serializer.data)


# ============================
# Legacy Endpoints (for backward compatibility)
# ============================

class CustomerListCreate(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        global request_count
        request_count += 1
        
        customers = Customer.objects.all()
        serializer = CustomerSerializer(customers, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        global request_count
        request_count += 1
        
        serializer = CustomerRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            customer = serializer.save()
            return Response(
                CustomerSerializer(customer).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)