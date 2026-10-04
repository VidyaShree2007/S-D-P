AgriFlow - Agricultural Marketplace

1. Open a terminal in this folder (AgriFlow)
2. python -m venv venv
   Windows:     venv\Scripts\activate
   Mac/Linux:   source venv/bin/activate
3. pip install -r requirements.txt
4. cd backend
   uvicorn main:app --reload
5. Open frontend/index.html in your browser (backend must keep running)

API docs: http://127.0.0.1:8000/docs
To reset data: stop the server and delete backend/agriflow.db
