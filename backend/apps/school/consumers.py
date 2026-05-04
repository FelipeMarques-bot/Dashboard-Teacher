import json

from channels.generic.websocket import AsyncWebsocketConsumer


class DashboardConsumer(AsyncWebsocketConsumer):
    async def connect(self) -> None:
        self.group_name = "dashboard_updates"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code: int) -> None:
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data: str) -> None:
        await self.send(text_data=json.dumps({"message": "Conexao ativa"}))

    async def dashboard_event(self, event: dict) -> None:
        await self.send(text_data=json.dumps(event["payload"]))
