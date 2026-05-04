import asyncio
import json
import base64
import cv2
import numpy as np
from fastapi import WebSocket, WebSocketDisconnect
from typing import List, Dict
from detection import process_frame, load_employees
from alerts import create_alert
from collections import deque

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"Client connected. Total: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        print(f"Client disconnected. Total: {len(self.active_connections)}")
    
    async def send_frame(self, websocket: WebSocket, data: dict):
        try:
            await websocket.send_json(data)
        except:
            pass

manager = ConnectionManager()

async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    
    # Initialiser les buffers et variables de détection
    detection_buffer = deque(maxlen=5)
    last_alert_time = {}
    frame_count = 0
    employee_data = load_employees()
    
    print("WebSocket connected, waiting for frames...")
    
    try:
        while True:
            # Recevoir la frame encodée en base64
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "frame":
                # Décoder l'image base64
                img_data = base64.b64decode(message["image"])
                nparr = np.frombuffer(img_data, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if frame is None:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Invalid frame"
                    })
                    continue
                
                frame_count += 1
                
                # Traiter la frame avec détection PPE + reconnaissance faciale
                def alert_callback(alert_data: Dict):
                    # Envoyer l'alerte en temps réel
                    asyncio.create_task(
                        websocket.send_json({
                            "type": "alert",
                            "name": alert_data["name"],
                            "violation": alert_data["violation"],
                            "time": alert_data["time"]
                        })
                    )
                
                display_frame, alerts_list = process_frame(
                    frame, employee_data, detection_buffer, 
                    frame_count, last_alert_time, alert_callback
                )
                
                # Encoder la frame annotée en JPEG (qualité réduite pour performance)
                encode_params = [cv2.IMWRITE_JPEG_QUALITY, 70]
                _, buffer = cv2.imencode('.jpg', display_frame, encode_params)
                processed_image = base64.b64encode(buffer).decode('utf-8')
                
                # Envoyer la frame annotée au client
                response = {
                    "type": "frame",
                    "image": processed_image,
                    "frame_count": frame_count,
                    "persons_detected": len(alerts_list),
                    "alerts_count": len(alerts_list)
                }
                
                await websocket.send_json(response)
                
                # Sauvegarder les alertes en base de données
                for alert in alerts_list:
                    create_alert(alert["name"], alert["violation"], alert["frame"])
    
    except WebSocketDisconnect:
        print("Client disconnected")
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)