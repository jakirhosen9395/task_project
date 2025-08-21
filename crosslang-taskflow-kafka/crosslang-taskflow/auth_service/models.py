from pymongo import MongoClient
from bson import ObjectId
import os
from dotenv import load_dotenv
from flask_bcrypt import Bcrypt

load_dotenv()
bcrypt = Bcrypt()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME")
client = MongoClient(MONGO_URI)
db = client[DB_NAME]

def create_user(name, username, email, password):
    hashed = bcrypt.generate_password_hash(password).decode("utf-8")
    user = {
        "name": name,
        "username": username,
        "email": email,
        "password": hashed
    }
    result = db.users.insert_one(user)
    user["_id"] = result.inserted_id
    return user

def find_user_by_username(username):
    return db.users.find_one({"username": username})

def find_user_by_id(user_id):
    return db.users.find_one({"_id": ObjectId(user_id)})
