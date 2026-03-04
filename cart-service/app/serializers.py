from rest_framework import serializers
from .models import CartItem, Cart


class CartItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CartItem
        fields = ['id', 'book_id', 'quantity', 'added_at']
        read_only_fields = ['id', 'added_at']


class CartItemDetailSerializer(serializers.Serializer):
    """Serializer with book details from book-service"""
    id = serializers.IntegerField()
    book_id = serializers.IntegerField()
    title = serializers.CharField()
    author = serializers.CharField(required=False, allow_null=True)
    cover_image_url = serializers.URLField(required=False, allow_null=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    quantity = serializers.IntegerField()
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2)
    added_at = serializers.DateTimeField()


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Cart
        fields = ['id', 'customer_id', 'items', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class AddToCartSerializer(serializers.Serializer):
    book_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, default=1)


class UpdateCartItemSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1)