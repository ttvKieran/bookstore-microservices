from rest_framework import serializers
from .models import Book


class BookSerializer(serializers.ModelSerializer):
    price = serializers.FloatField()
    
    class Meta:
        model = Book
        fields = ['id', 'isbn', 'title', 'author', 'publisher', 'publication_year', 
                  'price', 'stock_quantity', 'description', 'cover_image_url', 
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class BookCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = ['isbn', 'title', 'author', 'publisher', 'publication_year', 
                  'price', 'stock_quantity', 'description', 'cover_image_url']
    
    def validate_isbn(self, value):
        if Book.objects.filter(isbn=value).exists():
            raise serializers.ValidationError("ISBN already exists")
        return value


class BookUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = ['title', 'author', 'publisher', 'publication_year', 
                  'price', 'stock_quantity', 'description', 'cover_image_url']


class StockUpdateSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=0)
    
    def update(self, instance, validated_data):
        instance.stock_quantity = validated_data['quantity']
        instance.save()
        return instance