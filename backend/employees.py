import pickle
import os
import face_recognition
import cv2
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import List, Dict
from pydantic import BaseModel
from auth import get_current_active_user, is_admin, User

router = APIRouter(prefix="/employees", tags=["employees"])

EMP_FILE = "data/employees.pkl"
os.makedirs("data", exist_ok=True)

class EmployeeResponse(BaseModel):
    name: str
    id: str
    department: str

def load_employees_data() -> Dict:
    """Charge les données des employés"""
    if os.path.exists(EMP_FILE):
        with open(EMP_FILE, "rb") as f:
            data = pickle.load(f)
            if "ids" not in data:
                data["ids"] = [f"EMP{i:03d}" for i in range(1, len(data["names"]) + 1)]
            if "departments" not in data:
                data["departments"] = ["Non assigné"] * len(data["names"])
            return data
    return {"encodings": [], "names": [], "ids": [], "departments": []}

def save_employees_data(data: Dict):
    """Sauvegarde les données des employés"""
    with open(EMP_FILE, "wb") as f:
        pickle.dump(data, f)

@router.get("/", response_model=List[EmployeeResponse])
async def get_employees(current_user: User = Depends(get_current_active_user)):
    """Récupère la liste des employés"""
    data = load_employees_data()
    
    employees = []
    for i, name in enumerate(data["names"]):
        emp_id = data["ids"][i] if i < len(data["ids"]) else f"EMP{i+1:03d}"
        dept = data["departments"][i] if i < len(data["departments"]) else "Non assigné"
        employees.append(EmployeeResponse(name=name, id=emp_id, department=dept))
    
    return employees

@router.post("/", response_model=Dict)
async def create_employee(
    name: str = Form(...),
    employee_id: str = Form(""),
    department: str = Form("Sécurité"),
    image: UploadFile = File(...),
    current_user: User = Depends(is_admin)
):
    """Ajoute un nouvel employé avec reconnaissance faciale"""
    
    # Vérifier si l'employé existe déjà
    data = load_employees_data()
    if name in data["names"]:
        raise HTTPException(status_code=400, detail=f"Employee {name} already exists")
    
    # Traiter l'image
    contents = await image.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image file")
    
    # Convertir en RGB pour face_recognition
    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # Détecter les visages
    face_locations = face_recognition.face_locations(rgb_img)
    encs = face_recognition.face_encodings(rgb_img, face_locations)
    
    if len(encs) == 0:
        raise HTTPException(status_code=400, detail="No face detected in image")
    
    if len(encs) > 1:
        # Utiliser le premier visage détecté
        pass
    
    enc = encs[0]
    
    # Ajouter aux données
    data["encodings"].append(enc)
    data["names"].append(name)
    data["ids"].append(employee_id or f"EMP{len(data['names']):03d}")
    data["departments"].append(department)
    
    save_employees_data(data)
    
    return {
        "message": f"Employee {name} added successfully",
        "id": data["ids"][-1]
    }

@router.delete("/{employee_name}")
async def delete_employee(
    employee_name: str,
    current_user: User = Depends(is_admin)
):
    """Supprime un employé"""
    data = load_employees_data()
    
    if employee_name not in data["names"]:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    idx = data["names"].index(employee_name)
    
    # Supprimer de toutes les listes
    for key in ["encodings", "names", "ids", "departments"]:
        if key in data and isinstance(data[key], list) and len(data[key]) > idx:
            data[key].pop(idx)
    
    save_employees_data(data)
    
    return {"message": f"Employee {employee_name} deleted successfully"}