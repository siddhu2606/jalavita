@echo off
REM Start the ORCA backend server
cd /d "d:\ocean analytics\orca-backend"
echo Starting ORCA Backend...
call .venv\Scripts\activate
.venv\Scripts\python seed.py
.venv\Scripts\uvicorn main:app --reload --host 0.0.0.0 --port 8000
