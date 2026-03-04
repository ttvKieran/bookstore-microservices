from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
from datetime import datetime, timedelta
import time
import requests
from django.conf import settings

from .models import Manager, Report
from .serializers import (
    ManagerSerializer,
    ManagerRegistrationSerializer,
    CredentialVerificationSerializer,
    ReportSerializer,
    ReportCreateSerializer
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
        'service': 'manager-service',
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
    
    total_managers = Manager.objects.count()
    active_managers = Manager.objects.filter(is_active=True).count()
    total_reports = Report.objects.count()
    
    return Response({
        'requests_total': request_count,
        'requests_per_second': round(requests_per_second, 2),
        'uptime_seconds': round(uptime, 2),
        'total_managers': total_managers,
        'active_managers': active_managers,
        'total_reports': total_reports,
        'timestamp': datetime.now().isoformat()
    }, status=status.HTTP_200_OK)


# ============================
# Manager Endpoints
# ============================

@api_view(['POST'])
def register_manager(request):
    """Register new manager"""
    global request_count
    request_count += 1
    
    serializer = ManagerRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        manager = serializer.save()
        return Response(
            ManagerSerializer(manager).data,
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def manager_detail(request, manager_id):
    """Get manager profile"""
    global request_count
    request_count += 1
    
    try:
        manager = Manager.objects.get(id=manager_id)
        serializer = ManagerSerializer(manager)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Manager.DoesNotExist:
        return Response(
            {'error': 'Manager not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['PUT'])
def update_manager(request, manager_id):
    """Update manager profile"""
    global request_count
    request_count += 1
    
    try:
        manager = Manager.objects.get(id=manager_id)
    except Manager.DoesNotExist:
        return Response(
            {'error': 'Manager not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = ManagerSerializer(manager, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_credentials(request):
    """Verify manager credentials (for API Gateway)"""
    global request_count
    request_count += 1
    
    serializer = CredentialVerificationSerializer(data=request.data)
    if serializer.is_valid():
        result = serializer.validated_data
        return Response(result, status=status.HTTP_200_OK)
    return Response({'valid': False}, status=status.HTTP_200_OK)


# ============================
# Dashboard & Analytics Endpoints
# ============================

@api_view(['GET'])
def dashboard(request):
    """Get dashboard overview"""
    global request_count
    request_count += 1
    
    try:
        # Get book statistics
        books_response = requests.get(f"{settings.BOOK_SERVICE_URL}/books/", timeout=5)
        book_data = books_response.json() if books_response.status_code == 200 else {}
        
        # Get customer count
        customers_response = requests.get(f"{settings.CUSTOMER_SERVICE_URL}/customers/", timeout=5)
        customer_data = customers_response.json() if customers_response.status_code == 200 else {}
        
        dashboard_data = {
            'total_books': book_data.get('total', 0),
            'total_customers': customer_data.get('total', 0),
            'total_orders': 0,  # Will be implemented when order-service is ready
            'total_revenue': 0.0,
            'timestamp': datetime.now().isoformat()
        }
        
        return Response(dashboard_data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
def generate_report(request, manager_id):
    """Generate analytics report"""
    global request_count
    request_count += 1
    
    try:
        manager = Manager.objects.get(id=manager_id)
    except Manager.DoesNotExist:
        return Response(
            {'error': 'Manager not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = ReportCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    report_type = serializer.validated_data['report_type']
    
    # Generate report data based on type
    report_data = {}
    
    if report_type == 'inventory':
        try:
            books_response = requests.get(f"{settings.BOOK_SERVICE_URL}/books/", timeout=5)
            if books_response.status_code == 200:
                book_data = books_response.json()
                report_data = {
                    'total_books': book_data.get('total', 0),
                    'low_stock_count': book_data.get('low_stock_count', 0)
                }
        except Exception as e:
            report_data = {'error': str(e)}
    
    elif report_type == 'customer':
        try:
            customers_response = requests.get(f"{settings.CUSTOMER_SERVICE_URL}/customers/", timeout=5)
            if customers_response.status_code == 200:
                customer_data = customers_response.json()
                report_data = {
                    'total_customers': customer_data.get('total', 0)
                }
        except Exception as e:
            report_data = {'error': str(e)}
    
    elif report_type in ['sales', 'revenue']:
        report_data = {
            'message': 'Order service not yet implemented',
            'total_sales': 0,
            'total_revenue': 0.0
        }
    
    # Create report
    report = Report.objects.create(
        report_type=report_type,
        generated_by=manager,
        data=report_data
    )
    
    return Response(
        ReportSerializer(report).data,
        status=status.HTTP_201_CREATED
    )


@api_view(['GET'])
def list_reports(request):
    """List all reports"""
    global request_count
    request_count += 1
    
    report_type = request.GET.get('type')
    
    reports = Report.objects.all()
    if report_type:
        reports = reports.filter(report_type=report_type)
    
    limit = int(request.GET.get('limit', 20))
    reports = reports[:limit]
    
    serializer = ReportSerializer(reports, many=True)
    return Response({
        'total': reports.count(),
        'data': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
def report_detail(request, report_id):
    """Get report detail"""
    global request_count
    request_count += 1
    
    try:
        report = Report.objects.get(id=report_id)
        serializer = ReportSerializer(report)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Report.DoesNotExist:
        return Response(
            {'error': 'Report not found'},
            status=status.HTTP_404_NOT_FOUND
        )
