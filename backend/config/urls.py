from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def health_check(request):
    return JsonResponse({"status": "ok", "service": "dashboard-teacher-backend"})

urlpatterns = [
    path("", health_check),
    path("admin/", admin.site.urls),
    path("api/", include("apps.school.urls")),
]
