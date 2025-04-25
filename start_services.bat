@echo off
echo Starting Face Recognition Services...

start cmd /k python add_service.py
echo Add Face Service started on port 5001

start cmd /k python recognize_service.py
echo Recognize Face Service started on port 5002

start cmd /k python api_service.py
echo API Service started on port 5000

echo All services started successfully!