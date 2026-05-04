import json
import os
import time
from datetime import datetime
from typing import List, Dict, Optional
import cv2
import numpy as np
from fastapi import APIRouter, Depends, HTTPException
from auth import get_current_active_user, is_admin, User

router = APIRouter(prefix="/alerts", tags=["alerts"])

DATA_FILE = "data/alerts.json"
ALERTS_DIR = "data/alerts_images"

# Dictionnaire global pour tracker les dernieres alertes par personne
last_alert_time = {}
COOLDOWN_SECONDS = 30  # Delai minimum entre 2 alertes pour la meme personne

# Creer les dossiers si necessaire
os.makedirs("data", exist_ok=True)
os.makedirs(ALERTS_DIR, exist_ok=True)

def load_alerts() -> List[Dict]:
    """Charge toutes les alertes depuis le fichier JSON"""
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding='utf-8') as f:
                return json.load(f)
        except:
            return []
    return []

def save_alerts(alerts: List[Dict]):
    """Sauvegarde les alertes dans le fichier JSON"""
    with open(DATA_FILE, "w", encoding='utf-8') as f:
        json.dump(alerts, f, indent=2, ensure_ascii=False)

def can_create_alert(name: str) -> bool:
    """Verifie si on peut creer une alerte pour cette personne (cooldown)"""
    global last_alert_time
    current_time = time.time()
    
    if name in last_alert_time:
        time_since_last = current_time - last_alert_time[name]
        if time_since_last < COOLDOWN_SECONDS:
            return False
    
    last_alert_time[name] = current_time
    return True

def create_alert(name: str, violation: str, frame: np.ndarray) -> Optional[Dict]:
    """Cree une nouvelle alerte avec image"""
    try:
        # Verifier le cooldown avant de creer l'alerte
        if not can_create_alert(name):
            return None
            
        alert_id = f"{int(time.time())}_{name.replace(' ', '_')}"
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        image_filename = f"{alert_id}.jpg"
        image_path = os.path.join(ALERTS_DIR, image_filename)
        cv2.imwrite(image_path, frame)
        
        alert_data = {
            "id": alert_id,
            "name": name,
            "violation": violation,
            "time": timestamp,
             "image": f"data/alerts_images/{image_filename}",
            "date": datetime.now().strftime("%Y-%m-%d")
        }
        
        existing_alerts = load_alerts()
        existing_alerts.append(alert_data)
        save_alerts(existing_alerts)
        
        return alert_data
    except Exception as e:
        print(f"Erreur sauvegarde alerte: {str(e)}")
        return None

@router.get("/", response_model=List[Dict])
async def get_all_alerts(current_user: User = Depends(get_current_active_user)):
    """Recupere toutes les alertes"""
    return load_alerts()

@router.get("/today")
async def get_today_alerts(current_user: User = Depends(get_current_active_user)):
    """Recupere les alertes du jour"""
    today = datetime.now().strftime("%Y-%m-%d")
    alerts = load_alerts()
    return [a for a in alerts if a.get("date") == today]

@router.delete("/{alert_id}")
async def delete_alert(alert_id: str, current_user: User = Depends(is_admin)):
    """Supprime une alerte et son image (admin uniquement)"""
    alerts = load_alerts()
    
    alert_to_delete = None
    for alert in alerts:
        if alert.get("id") == alert_id:
            alert_to_delete = alert
            break
    
    if not alert_to_delete:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    # Supprimer l'image
    img_path = alert_to_delete.get("image")
    if img_path and os.path.exists(img_path):
        os.remove(img_path)
    
    # Supprimer de la liste
    alerts.remove(alert_to_delete)
    save_alerts(alerts)
    
    return {"message": "Alert deleted successfully"}

@router.get("/stats")
async def get_alert_stats(current_user: User = Depends(get_current_active_user)):
    """Recupere les statistiques des alertes"""
    alerts = load_alerts()
    
    if not alerts:
        return {
            "total": 0,
            "unique_employees": 0,
            "today": 0,
            "top_violation": None
        }
    
    from collections import Counter
    
    today = datetime.now().strftime("%Y-%m-%d")
    violations = [a.get("violation") for a in alerts if a.get("violation")]
    
    return {
        "total": len(alerts),
        "unique_employees": len(set(a.get("name") for a in alerts if a.get("name"))),
        "today": len([a for a in alerts if a.get("date") == today]),
        "top_violation": Counter(violations).most_common(1)[0][0] if violations else None
    }