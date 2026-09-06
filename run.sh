#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/backend"
if [ ! -d venv ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt -q
echo ""
echo "Jalavita running at http://localhost:8000  (Command Deck)"
echo "Wayfinder app at    http://localhost:8000/app"
echo ""
uvicorn app.main:app --host 0.0.0.0 --port 8000
