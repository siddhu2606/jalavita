@echo off
cd /d %~dp0backend
if not exist venv (
    where py >nul 2>nul
    if %errorlevel%==0 (
        py -3.12 -m venv venv 2>nul || py -3 -m venv venv 2>nul || python -m venv venv
    ) else (
        python -m venv venv
    )
)
call venv\Scripts\activate.bat
pip install -r requirements.txt -q
echo.
echo Jalavita running at http://localhost:8000  (Command Deck)
echo Wayfinder app at    http://localhost:8000/app
echo.
uvicorn app.main:app --host 0.0.0.0 --port 8000
