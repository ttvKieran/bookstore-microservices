from rest_framework import serializers
from .models import Recommendation, CustomerInteraction


class RecommendationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recommendation
        fields = ['id', 'customer_id', 'book_id', 'score', 'algorithm', 'created_at']
        read_only_fields = ['id', 'created_at']


class CustomerInteractionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerInteraction
        fields = ['id', 'customer_id', 'book_id', 'interaction_type', 'timestamp']
        read_only_fields = ['id', 'timestamp']


class TrackInteractionSerializer(serializers.Serializer):
    customer_id = serializers.CharField(max_length=255)
    book_id = serializers.IntegerField()
    interaction_type = serializers.ChoiceField(choices=['view', 'cart', 'purchase'])
