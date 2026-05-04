from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Form, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import StreamingResponse
from contextlib import asynccontextmanager
import os
import shutil
import cv2
import numpy as np
import base64
import time
import json
import asyncio
from datetime import datetime, timedelta
from typing import Optional
from collections import deque
import io

# Import des modules locaux
from auth import (
    authenticate_user, create_access_token, 
    get_current_active_user, Token, User,
    ACCESS_TOKEN_EXPIRE_MINUTES, fake_users_db
)
from detection import process_frame, load_employees
from alerts import router as alerts_router, create_alert, load_alerts
from employees import router as employees_router
from websocket import websocket_endpoint, manager

# Creation des dossiers necessaires
os.makedirs("data", exist_ok=True)
os.makedirs("data/alerts_images", exist_ok=True)
os.makedirs("models", exist_ok=True)
os.makedirs("temp", exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up PPE Detection API...")
    yield
    print("Shutting down...")

app = FastAPI(
    title="PPE Detection API",
    description="API pour la detection d'EPI et reconnaissance faciale",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Monter les fichiers statiques
app.mount("/data/alerts_images", StaticFiles(directory="data/alerts_images"), name="alerts_images")
app.mount("/temp", StaticFiles(directory="temp"), name="temp")

# Inclusion des routers
app.include_router(alerts_router)
app.include_router(employees_router)

# WebSocket endpoint
@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket):
    await websocket_endpoint(websocket)

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(fake_users_db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role}, 
        expires_delta=access_token_expires
    )
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "role": user.role
    }

@app.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

# ========== NOUVEAU: Streaming WebSocket pour upload video ==========

@app.websocket("/ws/video-upload")
async def video_upload_websocket(websocket: WebSocket):
    """WebSocket pour traiter une video uploadée frame par frame avec streaming"""
    await websocket.accept()
    
    detection_buffer = deque(maxlen=5)
    last_alert_time = {}
    frame_count = 0
    alert_count = 0
    employee_data = load_employees()
    
    # Parametres recus du client
    frame_skip = 2
    resize_factor = 0.5
    conf_threshold = 0.5
    
    temp_video_path = None
    output_video_path = None
    
    try:
        # Etape 1: Recevoir les parametres et la video
        data = await websocket.receive_text()
        config = json.loads(data)
        
        frame_skip = config.get('frame_skip', 2)
        resize_factor = config.get('resize_factor', 0.5)
        conf_threshold = config.get('conf_threshold', 0.5)
        
        # Recevoir le fichier video en chunks
        temp_video_path = f"temp/upload_{int(time.time())}.mp4"
        
        await websocket.send_json({
            "type": "status",
            "message": "Reception de la video..."
        })
        
        # Recevoir la video (base64 chunks)
        video_chunks = []
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            
            if msg.get("type") == "video_chunk":
                video_chunks.append(msg["data"])
            elif msg.get("type") == "video_end":
                break
        
        # Assembler et sauvegarder la video
        full_video = "".join(video_chunks)
        video_bytes = base64.b64decode(full_video)
        
        with open(temp_video_path, "wb") as f:
            f.write(video_bytes)
        
        await websocket.send_json({
            "type": "status",
            "message": "Traitement en cours..."
        })
        
        # Etape 2: Traiter la video frame par frame
        cap = cv2.VideoCapture(temp_video_path)
        
        # Obtenir les proprietes de la video
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        # Creer le writer pour la video de sortie annotee
        output_video_path = f"temp/output_{int(time.time())}.mp4"
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_video_path, fourcc, fps / frame_skip, 
                             (int(width * resize_factor), int(height * resize_factor)))
        
        processed_count = 0
        start_time = time.time()
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_count += 1
            
            # Skip frames selon parametre
            if frame_count % frame_skip != 0:
                continue
            
            # Redimensionner
            if resize_factor != 1.0:
                frame = cv2.resize(frame, None, fx=resize_factor, fy=resize_factor)
            
            # Traiter la frame (detection + reconnaissance)
            display_frame, alerts_list = process_frame(
                frame, employee_data, detection_buffer, 
                frame_count, last_alert_time
            )
            
            # Sauvegarder dans la video de sortie
            out.write(display_frame)
            
            # Sauvegarder les alertes
            for alert in alerts_list:
                result = create_alert(alert["name"], alert["violation"], alert["frame"])
                if result:
                    alert_count += 1
            
            # Envoyer la frame annotee au client (toutes les 5 frames pour performance)
            if processed_count % 5 == 0:
                # Encoder en JPEG
                encode_params = [cv2.IMWRITE_JPEG_QUALITY, 60]
                _, buffer = cv2.imencode('.jpg', display_frame, encode_params)
                frame_base64 = base64.b64encode(buffer).decode('utf-8')
                
                progress = min(100, int((frame_count / total_frames) * 100)) if total_frames > 0 else 0
                
                await websocket.send_json({
                    "type": "frame",
                    "image": frame_base64,
                    "progress": progress,
                    "frame_number": frame_count,
                    "total_frames": total_frames,
                    "alerts_count": alert_count
                })
            
            processed_count += 1
        
        cap.release()
        out.release()
        
        elapsed = time.time() - start_time
        
        # Envoyer le resultat final avec lien vers la video annotee
        await websocket.send_json({
            "type": "complete",
            "total_frames": total_frames,
            "processed_frames": processed_count,
            "alerts_generated": alert_count,
            "processing_time": round(elapsed, 2),
            "video_url": f"/temp/{os.path.basename(output_video_path)}"
        })
        
    except Exception as e:
        print(f"Error in video upload: {e}")
        await websocket.send_json({
            "type": "error",
            "message": str(e)
        })
    finally:
        # Nettoyage du fichier temporaire d'upload
        if temp_video_path and os.path.exists(temp_video_path):
            try:
                os.remove(temp_video_path)
            except:
                pass
        
        # Note: on garde la video de sortie pour qu'elle soit accessible
        # Elle sera nettoyee plus tard ou manuellement

# ========== Ancien endpoint (conserve pour compatibilite) ==========

@app.post("/detect/video")
async def detect_video(
    file: UploadFile = File(...),
    frame_skip: int = Form(2),
    resize_factor: float = Form(0.5),
    conf_threshold: float = Form(0.5),
    current_user: User = Depends(get_current_active_user)
):
    """
    Endpoint traditionnel pour le traitement de video (sans streaming visuel)
    """
    temp_file = f"temp_{int(time.time())}_{file.filename}"
    
    with open(temp_file, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        cap = cv2.VideoCapture(temp_file)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        detection_buffer = deque(maxlen=5)
        last_alert_time = {}
        frame_count = 0
        alert_count = 0
        employee_data = load_employees()
        
        start_time = time.time()
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_count += 1
            if frame_count % frame_skip != 0:
                continue
            
            if resize_factor != 1.0:
                frame = cv2.resize(frame, None, fx=resize_factor, fy=resize_factor)
            
            display_frame, alerts_list = process_frame(
                frame, employee_data, detection_buffer, 
                frame_count, last_alert_time
            )
            
            for alert in alerts_list:
                result = create_alert(alert["name"], alert["violation"], alert["frame"])
                if result:
                    alert_count += 1
        
        cap.release()
        elapsed = time.time() - start_time
        
        return {
            "total_frames": total_frames,
            "processed_frames": frame_count // frame_skip,
            "alerts_generated": alert_count,
            "processing_time": round(elapsed, 2)
        }
        
    finally:
        if os.path.exists(temp_file):
            os.remove(temp_file)

@app.get("/")
async def root():
    return {
        "message": "PPE Detection API",
        "version": "1.0.0",
        "endpoints": {
            "auth": "/token",
            "alerts": "/alerts",
            "employees": "/employees",
            "websocket": "/ws",
            "video_upload_ws": "/ws/video-upload"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)