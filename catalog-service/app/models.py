from django.db import models


class Category(models.Model):
    """Hierarchical categories for books"""
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='subcategories'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        db_table = 'categories'
        verbose_name_plural = 'Categories'
        ordering = ['name']


class Genre(models.Model):
    """Book genres"""
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        db_table = 'genres'
        ordering = ['name']


class BookCategory(models.Model):
    """Junction table: Book to Category (many-to-many)"""
    id = models.AutoField(primary_key=True)
    book_id = models.IntegerField(db_index=True)  # Reference to book-service
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    assigned_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Book {self.book_id} - {self.category.name}"
    
    class Meta:
        db_table = 'book_categories'
        unique_together = ['book_id', 'category']
        indexes = [
            models.Index(fields=['book_id']),
            models.Index(fields=['category']),
        ]


class BookGenre(models.Model):
    """Junction table: Book to Genre (many-to-many)"""
    id = models.AutoField(primary_key=True)
    book_id = models.IntegerField(db_index=True)  # Reference to book-service
    genre = models.ForeignKey(Genre, on_delete=models.CASCADE)
    assigned_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Book {self.book_id} - {self.genre.name}"
    
    class Meta:
        db_table = 'book_genres'
        unique_together = ['book_id', 'genre']
        indexes = [
            models.Index(fields=['book_id']),
            models.Index(fields=['genre']),
        ]
