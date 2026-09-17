@echo off
REM Start the Jalavita backend server
cd /d "d:\ocean analytics\orca-backend"
echo Starting Jalavita Backend...
call .venv\Scripts\activate
.venv\Scripts\python seed.py
.venv\Scripts\uvicorn main:app --reload --host 0.0.0.0 --port 8000
