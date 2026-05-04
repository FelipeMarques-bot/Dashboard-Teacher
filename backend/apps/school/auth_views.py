import json
import os

import firebase_admin
from django.contrib.auth.models import User
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials as firebase_credentials

from .auth_serializers import GoogleLoginSerializer, MeSerializer, RegisterSerializer


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = MeSerializer(request.user)
        return Response(serializer.data)


class LoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []


class RefreshTokenView(TokenRefreshView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []


def _initialize_firebase() -> None:
    if firebase_admin._apps:
        return

    raw_credentials = os.getenv("FIREBASE_CREDENTIALS_JSON", "").strip()
    if not raw_credentials:
        raise RuntimeError("FIREBASE_CREDENTIALS_JSON nao configurado no backend.")

    if raw_credentials.startswith("{"):
        firebase_admin.initialize_app(firebase_credentials.Certificate(json.loads(raw_credentials)))
        return

    firebase_admin.initialize_app(firebase_credentials.Certificate(raw_credentials))


def _build_username(email: str) -> str:
    base = "".join(ch for ch in email.split("@")[0].lower() if ch.isalnum() or ch == "_")
    if not base:
        base = "usuario"

    candidate = base
    index = 1
    while User.objects.filter(username=candidate).exists():
        candidate = f"{base}{index}"
        index += 1
    return candidate


def _first_and_last_name_from_payload(payload: dict) -> tuple[str, str]:
    first_name = payload.get("given_name", "")
    last_name = payload.get("family_name", "")

    if first_name or last_name:
        return first_name, last_name

    display_name = (payload.get("name") or "").strip()
    if not display_name:
        return "", ""

    parts = display_name.split()
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


class GoogleLoginView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = GoogleLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            _initialize_firebase()
            payload = firebase_auth.verify_id_token(serializer.validated_data["id_token"])
        except Exception as exc:  # pragma: no cover - external dependency
            return Response({"detail": f"Falha ao validar token Google: {exc}"}, status=status.HTTP_400_BAD_REQUEST)

        email = (payload.get("email") or "").strip().lower()
        if not email:
            return Response({"detail": "Token Google sem email."}, status=status.HTTP_400_BAD_REQUEST)

        first_name, last_name = _first_and_last_name_from_payload(payload)
        user = User.objects.filter(email__iexact=email).first()

        if not user:
            user = User(
                username=_build_username(email),
                email=email,
                first_name=first_name,
                last_name=last_name,
            )
            user.set_unusable_password()
            user.save()
        else:
            changed = False
            if first_name and user.first_name != first_name:
                user.first_name = first_name
                changed = True
            if last_name and user.last_name != last_name:
                user.last_name = last_name
                changed = True
            if changed:
                user.save(update_fields=["first_name", "last_name"])

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "user": MeSerializer(user).data,
            }
        )
