from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from models import create_user, find_user_by_username, find_user_by_id, bcrypt
from utils import create_token, decode_token

load_dotenv()
app = Flask(__name__)
CORS(app)

@app.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()
    name = data.get("name")
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    if not all([name, username, email, password]):
        return jsonify({"error": "All fields are required"}), 400

    if find_user_by_username(username):
        return jsonify({"error": "Username already exists"}), 400

    user = create_user(name, username, email, password)
    token = create_token(user)
    return jsonify({
        "token": token,
        "user": {
            "id": str(user["_id"]),
            "name": name,
            "username": username,
            "email": email
        }
    })

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    user = find_user_by_username(username)
    if not user or not bcrypt.check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid username or password"}), 401

    token = create_token(user)
    return jsonify({
        "token": token,
        "user": {
            "id": str(user["_id"]),
            "name": user["name"],
            "username": user["username"],
            "email": user["email"]
        }
    })

@app.route("/me", methods=["GET"])
def me():
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return jsonify({"error": "No token provided"}), 401

    token = auth_header.split(" ")[1]
    decoded = decode_token(token)
    if not decoded:
        return jsonify({"error": "Invalid or expired token"}), 401

    user = find_user_by_id(decoded["id"])
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "id": str(user["_id"]),
        "name": user["name"],
        "username": user["username"],
        "email": user["email"]
    })

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "Auth Service"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8001, debug=True)
