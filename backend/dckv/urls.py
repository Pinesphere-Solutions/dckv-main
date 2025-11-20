from django.urls import path
from .views import get_hoods

urlpatterns = [
    path("hoods/<int:hotel_id>/<int:kitchen_id>/<str:date>/", get_hoods, name="hoods"),
]
