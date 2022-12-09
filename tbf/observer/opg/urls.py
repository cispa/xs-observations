from django.urls import path

from . import views

urlpatterns = [
    path('<str:inc_method>/', views.get_observation_page, name='get_observation_page'),
]