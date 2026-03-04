from rest_framework import serializers
from .models import Category, Genre, BookCategory, BookGenre


class CategorySerializer(serializers.ModelSerializer):
    subcategories = serializers.SerializerMethodField()
    parent_name = serializers.CharField(source='parent.name', read_only=True)
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'parent', 'parent_name', 'subcategories', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_subcategories(self, obj):
        if obj.subcategories.exists():
            return CategorySerializer(obj.subcategories.all(), many=True).data
        return []


class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ['id', 'name', 'description', 'created_at']
        read_only_fields = ['id', 'created_at']


class BookCategorySerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = BookCategory
        fields = ['id', 'book_id', 'category', 'category_name', 'assigned_at']
        read_only_fields = ['id', 'assigned_at']


class BookGenreSerializer(serializers.ModelSerializer):
    genre_name = serializers.CharField(source='genre.name', read_only=True)
    
    class Meta:
        model = BookGenre
        fields = ['id', 'book_id', 'genre', 'genre_name', 'assigned_at']
        read_only_fields = ['id', 'assigned_at']


class AssignCategorySerializer(serializers.Serializer):
    book_id = serializers.IntegerField()
    category_id = serializers.IntegerField()


class AssignGenreSerializer(serializers.Serializer):
    book_id = serializers.IntegerField()
    genre_id = serializers.IntegerField()
