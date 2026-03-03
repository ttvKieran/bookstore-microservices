"""
URL configuration for api_gateway project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path
from . import views  # Import file views.py mà bạn đã tạo ở Bước 2 phần trước

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Tạo đường link http://localhost:8000/books/ để xem danh sách sách
    path('books/', views.book_list, name='book_list'), 
    
    # Tạo đường link http://localhost:8000/cart/1/ để xem giỏ hàng của user có ID là 1
    path('cart/<int:customer_id>/', views.view_cart, name='view_cart'), 
]