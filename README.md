# Real-Time PPE Detection and Worker Identification using YOLOv8 and Face Recognition

## Overview

This project combines YOLOv8-based Personal Protective Equipment (PPE) detection with real-time face recognition to identify workers violating safety regulations on construction sites.

When a worker is detected without mandatory safety equipment such as a helmet or safety vest, the system automatically identifies the worker, captures evidence, and generates an alert for administrators.

The project was developed as part of a Master's degree in Data Analytics and Artificial Intelligence.

---

## Features

- Real-time PPE detection using YOLOv8
- Face recognition and worker identification
- Automatic violation alerts
- Administrative dashboard
- React-based frontend
- Real-time monitoring system
- Violation screenshot capture
- Detection of missing helmets and safety vests

---

## Technologies Used

- Python
- YOLOv8
- PyTorch
- Face Recognition
- React
- REST API
- WebSocket
- Google Colab (Tesla T4)

---

## Results

| Model | mAP@50 | Precision | Recall |
|---------|---------|---------|---------|
| YOLOv8s | 0.849 | 0.883 | 0.796 |
| YOLOv8s Fine-Tuned | **0.857** | **0.896** | **0.805** |
| YOLOv8m | 0.831 | 0.865 | 0.783 |

Key finding:

> Fine-tuning a smaller YOLOv8s model achieved better performance than the larger YOLOv8m model on the filtered PPE dataset.

---

## Research Paper

This project has been documented in a research article.

📄 Paper:
[Real-Time PPE Detection and Worker Identification on Construction Sites Using YOLOv8 and Face Recognition](paper/PPE_Article.pdf)

## Authors

- Oumaima Kourchte
- Zineb Lagrida

Master's Students in Data Analytics & Artificial Intelligence
