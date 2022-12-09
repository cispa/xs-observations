from django.urls import path

from . import views

urlpatterns = [
    path('<int:url_id>/', views.echo_id, name='id_url'),
    path('<int:url_id>/info/', views.echo_id_info, name='id_url_info'),
    path('get_ver/', views.get_ver, name='version_info'),
    path('', views.echo, name='responses'),
]