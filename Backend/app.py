from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, join_room, leave_room, send, emit
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import DuplicateKeyError
from datetime import datetime, timedelta
from dotenv import load_dotenv
import random
import os
import jwt
import bcrypt
from functools import wraps
from bson import ObjectId

load_dotenv()

# ── APP SETUP ──────────────────────────────────────────────────────────────────
app = Flask(__name__)

#setting secret key for creating token for users
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
#cross platform resource sharing bw react(frontend) and python(backend)
CORS(app)
#real time conversation
socketio = SocketIO(app, cors_allowed_origins="*")

#RATE LIMITING(for stopping spam message or account creation)_____________________________________________________________________
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per hour"],
    storage_uri="memory://"
)

# MONGODB connection set up for interacting with db for persitent chat and login info i am using this db cause wo db those info of texts will not persist────────────────────────────────────────────────────────────────────
client = MongoClient(os.getenv('MONGO_URI'))
db = client['clientserverchat_db']
room_collection    = db['roominfo_db']
message_collection = db['message_txt']
user_collection    = db['registration_db']

# for the collections(tables) in mongo db creating some unique keys for easy access and providing other facilities ────────────────────────────────────────────────────────────────────
room_collection.create_index("room_id", unique=True)
room_collection.create_index([("created_at", DESCENDING)])
message_collection.create_index([("room_id", ASCENDING), ("timestamp", ASCENDING)])
user_collection.create_index("username", unique=True)


# ── JWT function section ────────────────────────────────────────────────────────────────

#this function helps to generate tokens for every valid user wo token no body can enter room or create room
#token= payload + secret key (From .env file) + algorithm
def generate_token(username):
    payload = {
        "username": username,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm="HS256")

#verification part of token
def verify_token(token):
    try:
        return jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({"message": "Token missing"}), 401
        payload = verify_token(token)
        if not payload:
            return jsonify({"message": "Invalid or expired token"}), 401
        request.current_user = payload['username']
        return f(*args, **kwargs)
    return decorated


#ERROR HANDLER section───────────────────────────────────────────────────────
@app.errorhandler(Exception)
def handle_error(e):
    return jsonify({"message": str(e)}), 500


# ══════════════════════════════════════════════════════════════════════════════
#  AUTH ROUTES
# ══════════════════════════════════════════════════════════════════════════════

# REGISTERATION FOR NEW USERS 
@app.route('/register', methods=['POST'])
@limiter.limit("10 per minute")   #10 req / min not more than that for stopiing spams
def register():
    data     = request.get_json()     #getting data 
    username = data.get("username", "").strip()   #stripping unnecessary white spaces " sibasish  "----->"sibasish" (example)
    password = data.get("password", "") #getting password   2nd argument in data.get func are a default value if nothing is given then "" comes so .strip() works fine 

    #no username / pw so error
    if not username or not password:
        return jsonify({"message": "Username and password required"}), 400
    #pw length should be greater than or eq to 4 
    if len(password) < 4:
        return jsonify({"message": "Password must be at least 4 characters"}), 400

    # for security purpose not storing the exact pw user gave. using hashing on pw for making it a cypher text then we will store that into db
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    #inserting user detail in mongodb collection name "Registration_db"
    try:
        user_collection.insert_one({
            "username":   username,
            "password":   hashed.decode('utf-8'),  # store as string
            "created_at": datetime.utcnow()
        })
    #if same name of user exists then regn not possible
    except DuplicateKeyError:
        return jsonify({"message": "Username already taken"}), 409
    
    #generating token for a valid user regn so that he can move further
    token = generate_token(username)
    return jsonify({"message": "Registered successfully", "token": token, "username": username}), 201


#  LOGIN
@app.route('/login', methods=['POST'])
@limiter.limit("20 per minute")
def login():
    data     = request.get_json() 
    username = data.get("username", "").strip()
    password = data.get("password", "")    #all same like regn route

    user = user_collection.find_one({"username": username})
    if not user:
        return jsonify({"message": "Invalid username or password"}), 401

    stored_hash = user['password']
    if isinstance(stored_hash, str):
        stored_hash = stored_hash.encode('utf-8')  #re-encode for bcrypt comparison

    if not bcrypt.checkpw(password.encode('utf-8'), stored_hash):
        return jsonify({"message": "Invalid username or password"}), 401

    token = generate_token(username)
    return jsonify({"message": "Login successful", "token": token, "username": username}), 200


# ══════════════════════════════════════════════════════════════════════════════
#  ROOM ROUTES
# ══════════════════════════════════════════════════════════════════════════════

# CREATE ROOM
@app.route('/create', methods=['POST'])
@token_required
@limiter.limit("10 per minute")
def create_room():
    data      = request.get_json()
    room_name = data.get("room_name", "").strip() or "Unnamed Room" #if room name ==""/ empty change it to "unnamed room" if (   ) or ("unnamed room") if 1st part exists i will use 1st part else 2nd part
    password  = data.get("password", "")
    max_users = int(data.get("max_users", 50))   #if someone gove max_users of a room we will retrieve that else 50 will be default max users
    user_name = request.current_user  

    # store room password as string too (same fix as user password)  (giving pw for rooms are optional u may or may not)
    hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8') if password else None

    # creating a random no bw 100000 to 999999 that will be a unique room no for every created room that is unique primary key in db. reason of loop: if the generated rand no== existing room no then it will be problem so we will use a loop till the randno!=any existing room no
    while True:
        room_id = str(random.randint(100000, 999999))
        try:
            room_collection.insert_one({
                "room_id":room_id,
                "room_name":room_name,
                "users":[user_name],  #  have to store info of multiple users so this set up
                "created_by":user_name,
                "password":hashed_pw,  
                "max_users":max_users,
                "created_at":datetime.utcnow(),
                "last_active":datetime.utcnow()
            })
            return jsonify({"message": "Room created", "room_id": room_id, "room_name": room_name}), 201
        except DuplicateKeyError:
            continue


# JOIN ROOM
@app.route('/join', methods=['POST'])
@token_required
@limiter.limit("20 per minute")
def join_existing_room():
    data=request.get_json()
    room_id=str(data.get("room_id", ""))
    password=data.get("password", "")
    user_id=request.current_user

    if not room_id:
        return jsonify({"message": "room_id required"}), 400

    room = room_collection.find_one({"room_id": room_id})
    if not room:
        return jsonify({"message": "Room does not exist"}), 404

    #Block only new users when the room is full, but allow existing users
    if len(room.get("users", [])) >= room.get("max_users", 50) and user_id not in room["users"]:
        return jsonify({"message": "Room is full"}), 403

    # same bcrypt fix for room password comparison
    if room.get("password"):
        if not password:
            return jsonify({"message": "This room requires a password"}), 403
        stored_pw = room["password"]
        if isinstance(stored_pw, str):
            stored_pw = stored_pw.encode('utf-8')
        if not bcrypt.checkpw(password.encode('utf-8'), stored_pw):
            return jsonify({"message": "Wrong room password"}), 403

    room_collection.update_one(
        {"room_id": room_id},
        {
            "$addToSet":{"users": user_id},
            "$set":{"last_active": datetime.utcnow()}
        }
    )

    return jsonify({
        "message":"Joined room successfully",
        "room_id":room_id,
        "room_name":room.get("room_name", "Unnamed Room")
    }), 200


# LEAVE ROOM PERMANENTLY
@app.route('/room/<room_id>/leave', methods=['POST'])
@token_required
def leave_room_permanent(room_id):
    user_id = request.current_user
    result  = room_collection.update_one(
        {"room_id": room_id},
        {"$pull": {"users": user_id}}
    )
    if result.matched_count == 0:
        return jsonify({"message": "Room not found"}), 404
    return jsonify({"message": "Left room successfully"}), 200


# GET ALL ROOMS FOR A USER
@app.route('/rooms/<user_name>', methods=['GET'])
@token_required
def get_user_rooms(user_name):
    rooms = list(
        room_collection.find(
            {"users": user_name},
            {"_id": 0, "room_id": 1, "room_name": 1, "users": 1, "created_at": 1, "last_active": 1, "created_by": 1}
        ).sort("last_active", DESCENDING)
    )
    for r in rooms:
        if r.get('created_at'):
            r['created_at'] = r['created_at'].isoformat()
        if r.get('last_active'):
            r['last_active'] = r['last_active'].isoformat()
    return jsonify(rooms), 200


# GET SINGLE ROOM INFO
@app.route('/room/<room_id>', methods=['GET'])
@token_required
def get_room(room_id):
    room = room_collection.find_one(
        {"room_id": room_id},
        {"_id": 0, "room_id": 1, "room_name": 1, "users": 1, "created_by": 1, "max_users": 1}
    )
    if not room:
        return jsonify({"message": "Room not found"}), 404
    return jsonify(room), 200


# ══════════════════════════════════════════════════════════════════════════════
#  MESSAGE ROUTES
# ══════════════════════════════════════════════════════════════════════════════

# GET MESSAGES (paginated) (chatgpt helps to generate this i am also processing this)
@app.route('/messages/<room_id>', methods=['GET'])
@token_required
def get_messages(room_id):
    page  = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 50))
    skip  = (page - 1) * limit

    messages = list(
        message_collection.find(
            {"room_id": room_id},
            {"_id": 1, "user": 1, "message": 1, "timestamp": 1, "reactions": 1}
        ).sort("timestamp", ASCENDING).skip(skip).limit(limit)
    )

    for m in messages:
        m['_id'] = str(m['_id'])
        if m.get('timestamp'):
            m['timestamp'] = m['timestamp'].isoformat()
        if 'reactions' not in m:
            m['reactions'] = {}

    total = message_collection.count_documents({"room_id": room_id})

    return jsonify({
        "messages": messages,
        "page":     page,
        "limit":    limit,
        "total":    total,
        "has_more": (skip + limit) < total
    }), 200


#DELETE MESSAGE
@app.route('/messages/<message_id>', methods=['DELETE'])
@token_required
def delete_message(message_id):
    user_id = request.current_user
    try:
        msg = message_collection.find_one({"_id": ObjectId(message_id)})
    except Exception:
        return jsonify({"message": "Invalid message ID"}), 400

    if not msg:
        return jsonify({"message": "Message not found"}), 404
    if msg['user'] != user_id:
        return jsonify({"message": "Cannot delete another user's message"}), 403

    message_collection.delete_one({"_id": ObjectId(message_id)})
    socketio.emit('message_deleted', {"message_id": message_id}, to=msg['room_id'])
    return jsonify({"message": "Deleted"}), 200


#REACT TO MESSAGE
@app.route('/messages/<message_id>/react', methods=['POST'])
@token_required
def react_to_message(message_id):
    user_id = request.current_user
    emoji   = request.get_json().get("emoji", "")
    if not emoji:
        return jsonify({"message": "Emoji required"}), 400

    try:
        msg = message_collection.find_one({"_id": ObjectId(message_id)})
    except Exception:
        return jsonify({"message": "Invalid message ID"}), 400

    if not msg:
        return jsonify({"message": "Message not found"}), 404

    key = f"reactions.{emoji}"
    if user_id in msg.get("reactions", {}).get(emoji, []):
        message_collection.update_one({"_id": ObjectId(message_id)}, {"$pull": {key: user_id}})
    else:
        message_collection.update_one({"_id": ObjectId(message_id)}, {"$addToSet": {key: user_id}})

    updated   = message_collection.find_one({"_id": ObjectId(message_id)}, {"reactions": 1})
    reactions = updated.get("reactions", {})

    socketio.emit('reaction_updated', {"message_id": message_id, "reactions": reactions}, to=msg['room_id'])
    return jsonify({"reactions": reactions}), 200


# ══════════════════════════════════════════════════════════════════════════════
#  SOCKET EVENTS
# ══════════════════════════════════════════════════════════════════════════════

@socketio.on('join_room')
def handle_join(data):
    room_id = data.get("room_id")
    user_id = data.get("user_id")
    join_room(room_id)
    send(f"{user_id} joined the room", to=room_id)


@socketio.on('leave_room')
def handle_leave(data):
    room_id = data.get("room_id")
    user_id = data.get("user_id")
    leave_room(room_id)
    send(f"{user_id} left the room", to=room_id)


@socketio.on('send_message')
def handle_message(data):
    room_id = data.get("room_id")
    user_id = data.get("user_id")
    message = data.get("message", "").strip()

    if not message:
        return

    result = message_collection.insert_one({
        "room_id":    room_id,
         "user":       user_id,
        "message":    message,
        "timestamp":  datetime.utcnow(),
        "reactions":  {}
    })

    room_collection.update_one({"room_id": room_id}, {"$set": {"last_active": datetime.utcnow()}})

    send({
        "message_id": str(result.inserted_id),
        "user":       user_id,
        "message":    message,
        "reactions":  {}
    }, to=room_id)


@socketio.on('typing')
def handle_typing(data):
    emit('user_typing', {"user": data.get("user_id")}, to=data.get("room_id"), include_self=False)


@socketio.on('stop_typing')
def handle_stop_typing(data):
    emit('user_stop_typing', {"user": data.get("user_id")}, to=data.get("room_id"), include_self=False)


# ── RUN ────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    socketio.run(app, debug=True)