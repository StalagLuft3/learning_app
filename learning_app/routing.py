from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/chat/module/(?P<module_id>\d+)/$', consumers.ModuleChatConsumer.as_asgi()),
]