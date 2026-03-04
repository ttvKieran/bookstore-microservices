from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
from datetime import datetime
import time

from .models import Staff, StaffActivity
from .serializers import (
    StaffSerializer,
    StaffRegistrationSerializer,
    CredentialVerificationSerializer,
    StaffUpdateSerializer,
    StaffActivitySerializer,
    ActivityCreateSerializer
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
        'service': 'staff-service',
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
    
    total_staff = Staff.objects.count()
    active_staff = Staff.objects.filter(is_active=True).count()
    
    return Response({
        'requests_total': request_count,
        'requests_per_second': round(requests_per_second, 2),
        'uptime_seconds': round(uptime, 2),
        'total_staff': total_staff,
        'active_staff': active_staff,
        'timestamp': datetime.now().isoformat()
    }, status=status.HTTP_200_OK)


# ============================
# Staff Endpoints
# ============================

@api_view(['POST'])
def register_staff(request):
    """Register new staff (manager only)"""
    global request_count
    request_count += 1
    
    serializer = StaffRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        staff = serializer.save()
        return Response(
            StaffSerializer(staff).data,
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def staff_detail(request, staff_id):
    """Get staff profile"""
    global request_count
    request_count += 1
    
    try:
        staff = Staff.objects.get(id=staff_id)
        serializer = StaffSerializer(staff)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Staff.DoesNotExist:
        return Response(
            {'error': 'Staff not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['PUT'])
def update_staff(request, staff_id):
    """Update staff profile (manager only)"""
    global request_count
    request_count += 1
    
    try:
        staff = Staff.objects.get(id=staff_id)
    except Staff.DoesNotExist:
        return Response(
            {'error': 'Staff not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = StaffUpdateSerializer(staff, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(
            StaffSerializer(staff).data,
            status=status.HTTP_200_OK
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def list_staff(request):
    """List all staff members"""
    global request_count
    request_count += 1
    
    role = request.GET.get('role')
    is_active = request.GET.get('is_active')
    
    staff = Staff.objects.all()
    
    if role:
        staff = staff.filter(role=role)
    if is_active is not None:
        staff = staff.filter(is_active=is_active.lower() == 'true')
    
    serializer = StaffSerializer(staff, many=True)
    return Response({
        'total': staff.count(),
        'data': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_credentials(request):
    """Verify staff credentials (for API Gateway)"""
    global request_count
    request_count += 1
    
    serializer = CredentialVerificationSerializer(data=request.data)
    if serializer.is_valid():
        result = serializer.validated_data
        return Response(result, status=status.HTTP_200_OK)
    return Response({'valid': False}, status=status.HTTP_200_OK)


# ============================
# Activity Endpoints
# ============================

@api_view(['GET'])
def staff_activities(request, staff_id):
    """Get staff activities"""
    global request_count
    request_count += 1
    
    try:
        staff = Staff.objects.get(id=staff_id)
    except Staff.DoesNotExist:
        return Response(
            {'error': 'Staff not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    limit = int(request.GET.get('limit', 10))
    activities = staff.activities.all()[:limit]
    
    serializer = StaffActivitySerializer(activities, many=True)
    return Response({
        'staff_id': str(staff.id),
        'activities': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
def log_activity(request, staff_id):
    """Log staff activity"""
    global request_count
    request_count += 1
    
    try:
        staff = Staff.objects.get(id=staff_id)
    except Staff.DoesNotExist:
        return Response(
            {'error': 'Staff not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = ActivityCreateSerializer(data=request.data)
    if serializer.is_valid():
        activity = StaffActivity.objects.create(
            staff=staff,
            **serializer.validated_data
        )
        return Response(
            StaffActivitySerializer(activity).data,
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
