"""
URL configuration for dashboard project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
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
from dckv import views


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/login/', views.login_view),
    path('api/ingest/', views.ingest_view),
    path('api/hoods/', views.hoods_list),
    path('api/chart-data/', views.chart_data),
    path('api/set-benchmark/', views.set_benchmark),
    path('api/get-benchmark/', views.get_benchmark),
    path('api/energy-saved/', views.energy_saved),
    path('api/download-report/', views.download_report),
    
]
