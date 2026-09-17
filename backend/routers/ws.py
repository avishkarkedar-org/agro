from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json, asyncio
from datetime import datetime, timezone
from dependencies import ws_manager, logger

router = APIRouter()

@router.websocket("/ws/prices")
async def websocket_prices_endpoint(websocket: WebSocket):
    client_ip = websocket.client.host if websocket.client else "unknown"
    for header_name, header_val in websocket.headers.raw:
        if header_name == b"cf-connecting-ip":
            client_ip = header_val.decode("utf-8", errors="ignore")[:45]
            break
        elif header_name == b"x-forwarded-for":
            client_ip = header_val.decode("utf-8", errors="ignore").split(",")[0].strip()[:45]
            break

    connected = await ws_manager.connect(websocket, client_ip=client_ip)
    if not connected:
        return

    try:
        while True:
            # 5 minute timeout to prevent zombie connections
            data = await asyncio.wait_for(websocket.receive_text(), timeout=300.0)
            if data == "ping":
                await websocket.send_text("pong")
    except (WebSocketDisconnect, asyncio.TimeoutError):
        ws_manager.disconnect(websocket, client_ip=client_ip)
    except Exception as e:
        logger.warning(f"WebSocket anomaly: {e}")
        ws_manager.disconnect(websocket, client_ip=client_ip)
