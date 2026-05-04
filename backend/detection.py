import cv2
import numpy as np
import face_recognition
from ultralytics import YOLO
from typing import List, Tuple, Dict, Any
import pickle
import os
from collections import deque
import time
from datetime import datetime

# Charger le modele YOLO
MODEL_PATH = "models/finetun.pt"
model = YOLO(MODEL_PATH)

# Configuration
FRAME_SKIP = 2
RESIZE_FACTOR = 0.5
CONFIDENCE_THRESHOLD = 0.5

# VARIABLE GLOBALE pour tracker les alertes (conservee entre les appels)
# Structure: {nom_personne: timestamp_derniere_alerte}
_global_last_alert_time = {}
ALERT_COOLDOWN = 30  # 30 secondes entre alertes pour la meme personne

def load_employees():
    """Charge les employes depuis le fichier pickle"""
    emp_file = "data/employees.pkl"
    if os.path.exists(emp_file):
        with open(emp_file, "rb") as f:
            data = pickle.load(f)
            if "ids" not in data:
                data["ids"] = [f"EMP{i:03d}" for i in range(1, len(data["names"]) + 1)]
            if "departments" not in data:
                data["departments"] = ["Non assigne"] * len(data["names"])
            return data
    return {"encodings": [], "names": [], "ids": [], "departments": []}

def check_ppe_overlap(person_box: Tuple, ppe_boxes: List, iou_threshold: float = 0.1) -> bool:
    """Verifie si un EPI chevauche une personne"""
    px1, py1, px2, py2 = person_box
    person_area = (px2 - px1) * (py2 - py1)
    
    for ppe_box in ppe_boxes:
        bx1, by1, bx2, by2 = ppe_box
        ix1, iy1 = max(px1, bx1), max(py1, by1)
        ix2, iy2 = min(px2, bx2), min(py2, by2)
        
        if ix2 > ix1 and iy2 > iy1:
            intersection = (ix2 - ix1) * (iy2 - iy1)
            ppe_area = (bx2 - bx1) * (by2 - by1)
            min_area = min(person_area, ppe_area)
            
            if intersection / min_area > iou_threshold:
                return True
            
            ppe_center_x = (bx1 + bx2) / 2
            ppe_center_y = (by1 + by2) / 2
            if px1 <= ppe_center_x <= px2 and py1 <= ppe_center_y <= py2:
                return True
    return False

def is_face_in_person(face_box: Tuple, person_box: Tuple) -> bool:
    """Verifie si un visage est dans le cadre d'une personne"""
    fx1, fy1, fx2, fy2 = face_box
    px1, py1, px2, py2 = person_box
    face_center_y = (fy1 + fy2) / 2
    person_top_third = py1 + (py2 - py1) * 0.4
    
    return (fx1 >= px1 and fy1 >= py1 and 
            fx2 <= px2 and fy2 <= py2 and 
            face_center_y <= person_top_third)

def can_create_alert(name: str) -> bool:
    """Verifie si on peut creer une alerte pour cette personne (cooldown global)"""
    global _global_last_alert_time
    current_time = time.time()
    
    if name in _global_last_alert_time:
        time_since_last = current_time - _global_last_alert_time[name]
        if time_since_last < ALERT_COOLDOWN:
            return False
    
    _global_last_alert_time[name] = current_time
    return True

def process_frame(frame: np.ndarray, employee_data: Dict, 
                  detection_buffer: deque, frame_count: int,
                  last_alert_time: Dict, alert_callback=None) -> Tuple[np.ndarray, List[Dict]]:
    """
    Traite une frame pour la detection PPE et reconnaissance faciale
    """
    global _global_last_alert_time
    
    # Synchroniser le dictionnaire local avec le global
    if last_alert_time is not None:
        _global_last_alert_time.update(last_alert_time)
    
    display_frame = frame.copy()
    persons, helmets, vests, gloves = [], [], [], []
    
    # Detection YOLO
    results = model(frame, conf=CONFIDENCE_THRESHOLD, iou=0.45, verbose=False)[0]
    
    if results.boxes:
        for box, cls, conf in zip(results.boxes.xyxy, results.boxes.cls, results.boxes.conf):
            label = model.names[int(cls)]
            x1, y1, x2, y2 = map(int, box)
            
            if label == "person":
                persons.append((x1, y1, x2, y2, float(conf)))
            elif label == "helmet":
                helmets.append((x1, y1, x2, y2))
            elif label == "vest":
                vests.append((x1, y1, x2, y2))
            elif label in ["gloves", "glove"]:
                gloves.append((x1, y1, x2, y2))
    
    # Reconnaissance faciale (toutes les N frames)
    face_boxes, names_detected = [], []
    if frame_count % (FRAME_SKIP * 2) == 0:
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        scale_factor = 1.0
        if max(rgb.shape[:2]) > 800:
            scale_factor = 800 / max(rgb.shape[:2])
            rgb_small = cv2.resize(rgb, None, fx=scale_factor, fy=scale_factor)
        else:
            rgb_small = rgb
        
        faces = face_recognition.face_locations(rgb_small, model="hog")
        if scale_factor != 1.0:
            faces = [(int(top/scale_factor), int(right/scale_factor), 
                     int(bottom/scale_factor), int(left/scale_factor)) for t,r,b,l in faces]
        
        encs = face_recognition.face_encodings(rgb, faces)
        
        for (top, right, bottom, left), enc in zip(faces, encs):
            name = "Unknown"
            if len(employee_data["encodings"]) > 0:
                distances = face_recognition.face_distance(employee_data["encodings"], enc)
                best_match = np.argmin(distances)
                if distances[best_match] < 0.6:
                    name = employee_data["names"][best_match]
            names_detected.append(name)
            face_boxes.append((left, top, right, bottom))
        
        detection_buffer.append((face_boxes, names_detected))
    else:
        if detection_buffer:
            face_boxes, names_detected = detection_buffer[-1]
    
    alerts_generated = []
    
    # Analyse des personnes detectees
    for person in persons:
        px1, py1, px2, py2, p_conf = person
        
        has_helmet = check_ppe_overlap((px1, py1, px2, py2), helmets)
        has_vest = check_ppe_overlap((px1, py1, px2, py2), vests)
        has_gloves = check_ppe_overlap((px1, py1, px2, py2), gloves)
        
        # Reconnaissance du visage
        name = "Unknown"
        for fbox, fname in zip(face_boxes, names_detected):
            if is_face_in_person(fbox, (px1, py1, px2, py2)):
                name = fname
                break
        
        violations = []
        if not has_helmet:
            violations.append("No Helmet")
        if not has_vest:
            violations.append("No Vest")
        
        # Determiner couleur et statut
        if name == "Unknown":
            color = (0, 165, 255)  # Orange
            status = "? Unknown"
            if violations:
                status += " | " + " & ".join(violations)
        elif violations:
            color = (0, 0, 255)  # Rouge
            status = "X " + " | ".join(violations)
            
            # Generer alerte avec cooldown global
            if can_create_alert(name):
                msg = " & ".join(violations)
                
                alert_data = {
                    "name": name,
                    "violation": msg,
                    "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "frame": display_frame.copy()
                }
                alerts_generated.append(alert_data)
                
                if alert_callback:
                    alert_callback(alert_data)
                
                # Mettre a jour aussi le dictionnaire local pour compatibilite
                if last_alert_time is not None:
                    last_alert_time[name] = time.time()
        else:
            color = (0, 255, 0)  # Vert
            status = "OK " + name + " | PPE OK"
        
        # Dessiner les cadres
        cv2.rectangle(display_frame, (px1, py1), (px2, py2), color, 3)
        
        # Texte
        (text_w, text_h), _ = cv2.getTextSize(status, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)
        cv2.rectangle(display_frame, (px1, py1 - text_h - 10), (px1 + text_w, py1), color, -1)
        cv2.putText(display_frame, status, (px1, py1 - 5),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        # Dessiner les EPIs detectes
        for h in helmets:
            hx1, hy1, hx2, hy2 = h
            if check_ppe_overlap((px1, py1, px2, py2), [h]):
                cv2.rectangle(display_frame, (hx1, hy1), (hx2, hy2), (255, 255, 0), 2)
                cv2.putText(display_frame, "Helmet", (hx1, hy1 - 5),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 0), 1)
        
        for v in vests:
            vx1, vy1, vx2, vy2 = v
            if check_ppe_overlap((px1, py1, px2, py2), [v]):
                cv2.rectangle(display_frame, (vx1, vy1), (vx2, vy2), (255, 0, 255), 2)
                cv2.putText(display_frame, "Vest", (vx1, vy1 - 5),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 255), 1)
    
    return display_frame, alerts_generated