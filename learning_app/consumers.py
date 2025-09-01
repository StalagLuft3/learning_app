import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import ModuleChatMessage, Module, ModuleStudent

class ModuleChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.module_id = self.scope['url_route']['kwargs']['module_id']
        self.room_group_name = f'chat_module_{self.module_id}'

        # Check permissions
        user = self.scope["user"]
        if not user.is_authenticated or not await self.is_enrolled(user, self.module_id):
            await self.close()
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data['message']
        user = self.scope["user"]

        # Save message to DB
        msg = await self.save_message(user, self.module_id, message)

        # Broadcast message
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': msg.message,
                'username': user.username,
                'timestamp': msg.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
            }
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'message': event['message'],
            'username': event['username'],
            'timestamp': event['timestamp'],
        }))

    @database_sync_to_async
    def is_enrolled(self, user, module_id):
        return ModuleStudent.objects.filter(module_id=module_id, student=user).exists() or \
               Module.objects.filter(id=module_id, manager=user).exists()

    @database_sync_to_async
    def save_message(self, user, module_id, message):
        module = Module.objects.get(id=module_id)
        return ModuleChatMessage.objects.create(module=module, user=user, message=message)