AgriFlow v2 - Agricultural Marketplace (login, roles, vendors)

ROLES
  Farmer : adds crops, edits price/stock, confirms & delivers orders
  Vendor : buys wholesale from farmers, sets own retail price, sells to buyers
  Buyer  : searches the marketplace and buys crops

RUN
1. Open a terminal in this folder (AgriFlow)
2. python -m venv venv
   Windows:     venv\Scripts\activate
   Mac/Linux:   source venv/bin/activate
3. pip install -r requirements.txt
4. cd backend
   uvicorn main:app --reload
5. Open frontend/index.html in your browser (backend must keep running)

TRY IT (use 3 browser windows, or log out between roles)
  1. Register a Farmer, add "Tomato" 100 kg at Rs 20
  2. Register a Vendor, Wholesale Market -> buy 40 kg  (appears in My Store at Rs 24)
  3. Register a Buyer, Marketplace -> buy from the farmer or the vendor
  4. Farmer/Vendor: update order status Pending -> Confirmed -> Delivered
  5. Check each user's Dashboard

API docs: http://127.0.0.1:8000/docs
RESET all data: stop the server, delete backend/agriflow.db (and secret.key to also
invalidate old logins).
