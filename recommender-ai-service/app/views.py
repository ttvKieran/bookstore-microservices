from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
from django.db.models import Count, Q
from datetime import datetime, timedelta
import time
import requests
import random
from django.conf import settings

from .models import Recommendation, CustomerInteraction
from .serializers import (
    RecommendationSerializer,
    CustomerInteractionSerializer,
    TrackInteractionSerializer
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
        'service': 'recommender-ai-service',
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
    
    total_recommendations = Recommendation.objects.count()
    total_interactions = CustomerInteraction.objects.count()
    
    return Response({
        'requests_total': request_count,
        'requests_per_second': round(requests_per_second, 2),
        'uptime_seconds': round(uptime, 2),
        'total_recommendations': total_recommendations,
        'total_interactions': total_interactions,
        'timestamp': datetime.now().isoformat()
    }, status=status.HTTP_200_OK)


# ============================
# Recommendation Endpoints
# ============================

@api_view(['GET'])
def personalized_recommendations(request, customer_id):
    """Get personalized recommendations for a customer"""
    global request_count
    request_count += 1
    
    limit = int(request.GET.get('limit', 10))
    
    # Get existing recommendations
    recommendations = Recommendation.objects.filter(customer_id=customer_id)[:limit]
    
    # If no recommendations exist, generate some based on popular books
    if not recommendations.exists():
        try:
            generate_recommendations_for_customer(customer_id)
            recommendations = Recommendation.objects.filter(customer_id=customer_id)[:limit]
        except Exception as e:
            return Response(
                {'error': f'Failed to generate recommendations: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    # Fetch book details
    book_recommendations = []
    for rec in recommendations:
        try:
            book_response = requests.get(f"{settings.BOOK_SERVICE_URL}/books/{rec.book_id}/", timeout=5)
            if book_response.status_code == 200:
                book_data = book_response.json()
                book_data['recommendation_score'] = rec.score
                book_data['algorithm'] = rec.algorithm
                book_recommendations.append(book_data)
        except Exception:
            continue
    
    return Response({
        'customer_id': customer_id,
        'recommendations': book_recommendations
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
def similar_books(request, book_id):
    """Get similar books based on a book"""
    global request_count
    request_count += 1
    
    limit = int(request.GET.get('limit', 10))
    
    # Simple similar books: books that were interacted with by customers who also interacted with this book
    customers_who_interacted = CustomerInteraction.objects.filter(
        book_id=book_id
    ).values_list('customer_id', flat=True).distinct()
    
    similar_book_ids = CustomerInteraction.objects.filter(
        customer_id__in=customers_who_interacted
    ).exclude(
        book_id=book_id
    ).values('book_id').annotate(
        interaction_count=Count('book_id')
    ).order_by('-interaction_count')[:limit]
    
    # Fetch book details
    similar_books = []
    for item in similar_book_ids:
        try:
            book_response = requests.get(f"{settings.BOOK_SERVICE_URL}/books/{item['book_id']}/", timeout=5)
            if book_response.status_code == 200:
                book_data = book_response.json()
                book_data['similarity_score'] = item['interaction_count']
                similar_books.append(book_data)
        except Exception:
            continue
    
    return Response({
        'book_id': book_id,
        'similar_books': similar_books
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
def trending_books(request):
    """Get trending books based on recent interactions"""
    global request_count
    request_count += 1
    
    limit = int(request.GET.get('limit', 10))
    days = int(request.GET.get('days', 7))
    
    since_date = datetime.now() - timedelta(days=days)
    
    trending_book_ids = CustomerInteraction.objects.filter(
        timestamp__gte=since_date
    ).values('book_id').annotate(
        interaction_count=Count('book_id')
    ).order_by('-interaction_count')[:limit]
    
    # Fetch book details
    trending_books = []
    for item in trending_book_ids:
        try:
            book_response = requests.get(f"{settings.BOOK_SERVICE_URL}/books/{item['book_id']}/", timeout=5)
            if book_response.status_code == 200:
                book_data = book_response.json()
                book_data['trending_score'] = item['interaction_count']
                trending_books.append(book_data)
        except Exception:
            continue
    
    return Response({
        'period_days': days,
        'trending_books': trending_books
    }, status=status.HTTP_200_OK)


# ============================
# Interaction Tracking Endpoints
# ============================

@api_view(['POST'])
def track_interaction(request):
    """Track customer interaction with a book"""
    global request_count
    request_count += 1
    
    serializer = TrackInteractionSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    customer_id = serializer.validated_data['customer_id']
    book_id = serializer.validated_data['book_id']
    interaction_type = serializer.validated_data['interaction_type']
    
    # Create interaction
    interaction = CustomerInteraction.objects.create(
        customer_id=customer_id,
        book_id=book_id,
        interaction_type=interaction_type
    )
    
    # Trigger recommendation regeneration on purchase
    if interaction_type == 'purchase':
        try:
            generate_recommendations_for_customer(customer_id)
        except Exception:
            pass  # Silent fail, interaction is still recorded
    
    return Response(
        CustomerInteractionSerializer(interaction).data,
        status=status.HTTP_201_CREATED
    )


@api_view(['GET'])
def customer_interactions(request, customer_id):
    """Get customer interaction history"""
    global request_count
    request_count += 1
    
    limit = int(request.GET.get('limit', 50))
    interaction_type = request.GET.get('type')
    
    interactions = CustomerInteraction.objects.filter(customer_id=customer_id)
    
    if interaction_type:
        interactions = interactions.filter(interaction_type=interaction_type)
    
    interactions = interactions[:limit]
    
    serializer = CustomerInteractionSerializer(interactions, many=True)
    return Response({
        'customer_id': customer_id,
        'total': interactions.count(),
        'interactions': serializer.data
    }, status=status.HTTP_200_OK)


# ============================
# Helper Functions
# ============================

def generate_recommendations_for_customer(customer_id):
    """Generate recommendations for a customer based on their interactions"""
    
    # Get customer's interactions
    interactions = CustomerInteraction.objects.filter(customer_id=customer_id)
    
    if not interactions.exists():
        # No interactions, generate popular books
        algorithm = 'popular'
        try:
            books_response = requests.get(f"{settings.BOOK_SERVICE_URL}/books/?limit=20", timeout=5)
            if books_response.status_code == 200:
                books = books_response.json().get('data', [])
                for i, book in enumerate(books[:10]):
                    score = 1.0 - (i * 0.05)  # Decreasing score
                    Recommendation.objects.update_or_create(
                        customer_id=customer_id,
                        book_id=book['id'],
                        defaults={'score': score, 'algorithm': algorithm}
                    )
        except Exception:
            pass
    else:
        # Has interactions, use collaborative filtering (simplified)
        algorithm = 'collaborative'
        
        # Get books customer interacted with
        interacted_book_ids = interactions.values_list('book_id', flat=True).distinct()
        
        # Find other customers who interacted with same books
        similar_customers = CustomerInteraction.objects.filter(
            book_id__in=interacted_book_ids
        ).exclude(
            customer_id=customer_id
        ).values_list('customer_id', flat=True).distinct()
        
        # Get books these similar customers interacted with
        recommended_books = CustomerInteraction.objects.filter(
            customer_id__in=similar_customers
        ).exclude(
            book_id__in=interacted_book_ids
        ).values('book_id').annotate(
            interaction_count=Count('book_id')
        ).order_by('-interaction_count')[:10]
        
        for i, item in enumerate(recommended_books):
            score = 1.0 - (i * 0.05)
            Recommendation.objects.update_or_create(
                customer_id=customer_id,
                book_id=item['book_id'],
                defaults={'score': score, 'algorithm': algorithm}
            )
