from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, File, UploadFile, Query, Header
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import requests
import io
import tempfile
import base64
import zipfile
from mutagen import File as MutagenFile
from mutagen.mp3 import MP3
from mutagen.id3 import ID3

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'default-secret-key')
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "fitbeats"
storage_key = None

AUDIO_CACHE_DIR = Path("/tmp/fitbeats_audio_cache")
AUDIO_CACHE_DIR.mkdir(exist_ok=True)

SPOTIFY_CLIENT_ID = os.environ.get("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.environ.get("SPOTIFY_CLIENT_SECRET")
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_API_BASE = "https://api.spotify.com/v1"
SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"
spotify_client_token = None
spotify_client_token_expires = None

app = FastAPI(title="FitBeats API")
api_router = APIRouter(prefix="/api")

def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        logger.info("Object storage initialized successfully")
        return storage_key
    except Exception as e:
        logger.error(f"Failed to initialize storage: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not initialized")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str) -> tuple:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not initialized")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=120
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

def get_cached_audio(audio_path: str) -> tuple:
    safe_name = audio_path.replace("/", "_").replace("\\", "_")
    cache_file = AUDIO_CACHE_DIR / safe_name
    cache_meta = AUDIO_CACHE_DIR / f"{safe_name}.meta"
    if cache_file.exists() and cache_meta.exists():
        content_type = cache_meta.read_text().strip()
        data = cache_file.read_bytes()
        return data, content_type
    data, content_type = get_object(audio_path)
    try:
        tmp = cache_file.with_suffix('.tmp')
        tmp.write_bytes(data)
        tmp.rename(cache_file)
        cache_meta.write_text(content_type)
    except Exception as e:
        logger.warning(f"Failed to cache audio: {e}")
    return data, content_type

def extract_audio_metadata(audio_content: bytes, filename: str) -> dict:
    metadata = {"duration": None, "bpm": None, "genre": None}
    try:
        suffix = "." + filename.split(".")[-1] if "." in filename else ".mp3"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_content)
            tmp_path = tmp.name
        try:
            audio = MutagenFile(tmp_path)
            if audio is not None:
                if hasattr(audio, 'info') and hasattr(audio.info, 'length'):
                    metadata["duration"] = int(audio.info.length)
                if hasattr(audio, 'tags') and audio.tags:
                    if hasattr(audio.tags, 'getall'):
                        genres = audio.tags.getall('TCON')
                        if genres:
                            metadata["genre"] = str(genres[0])
                        bpms = audio.tags.getall('TBPM')
                        if bpms:
                            try:
                                metadata["bpm"] = int(str(bpms[0]))
                            except:
                                pass
                    elif isinstance(audio.tags, dict):
                        if 'genre' in audio.tags:
                            metadata["genre"] = str(audio.tags['genre'][0])
                        if 'bpm' in audio.tags:
                            try:
                                metadata["bpm"] = int(str(audio.tags['bpm'][0]))
                            except:
                                pass
        finally:
            os.unlink(tmp_path)
    except Exception as e:
        logger.warning(f"Error extracting audio metadata: {e}")
    return metadata

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def require_instructor_or_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") not in ["admin", "instructor"]:
        raise HTTPException(status_code=403, detail="Instructor or admin access required")
    return user

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    role: str
    studio_id: Optional[str] = None
    picture: Optional[str] = None
    created_at: str

class StudioCreate(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None

class StudioResponse(BaseModel):
    studio_id: str
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    created_at: str
    is_active: bool = True

class InstructorCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    studio_id: Optional[str] = None

class AlbumCreate(BaseModel):
    name: str
    artist: str
    year: int
    description: Optional[str] = None

class AlbumResponse(BaseModel):
    album_id: str
    name: str
    artist: str
    year: int
    description: Optional[str] = None
    cover_path: Optional[str] = None
    created_at: str
    is_active: bool = True
    mix_count: int = 0

class MixCreate(BaseModel):
    name: str
    artist: str
    album_id: str
    bpm: Optional[int] = None
    duration: Optional[int] = None
    genre: Optional[str] = None
    description: Optional[str] = None

class MixResponse(BaseModel):
    mix_id: str
    name: str
    artist: str
    bpm: Optional[int] = None
    duration: Optional[int] = None
    genre: Optional[str] = None
    album_id: str
    album_name: Optional[str] = None
    description: Optional[str] = None
    audio_path: Optional[str] = None
    cover_path: Optional[str] = None
    created_at: str
    is_active: bool = True

class PlaylistCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: bool = False

class PlaylistUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None
    mix_ids: Optional[List[str]] = None

class PlaylistResponse(BaseModel):
    playlist_id: str
    name: str
    description: Optional[str] = None
    is_public: bool = False
    user_id: str = ""
    user_name: str = ""
    mix_ids: List[str] = []
    items: list = []
    spotify_source: Optional[str] = None
    created_at: str = ""
    updated_at: str = ""

class ClassTrackConfig(BaseModel):
    type: str
    mix_id: Optional[str] = None
    spotify_id: Optional[str] = None
    name: str
    artist: str
    album_image: Optional[str] = None
    uri: Optional[str] = None
    preview_url: Optional[str] = None
    original_duration: Optional[int] = None
    custom_duration: Optional[int] = None
    transition: str = "crossfade"

class ClassSessionCreate(BaseModel):
    name: str
    playlist_id: Optional[str] = None
    tracks: List[ClassTrackConfig]
    total_duration: Optional[int] = None
    transition_duration: int = 3

class ClassSessionUpdate(BaseModel):
    name: Optional[str] = None
    tracks: Optional[List[ClassTrackConfig]] = None
    total_duration: Optional[int] = None
    transition_duration: Optional[int] = None

@api_router.post("/auth/register")
async def register(user_data: UserCreate, response: Response):
    email = user_data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": email,
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "role": "instructor",
        "studio_id": None,
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    token = create_access_token(user_id, email, "instructor")
    response.set_cookie(key="access_token", value=token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")
    user_doc.pop("password_hash")
    user_doc.pop("_id", None)
    return user_doc

@api_router.post("/auth/login")
async def login(credentials: UserLogin, response: Response):
    email = credentials.email.lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user["user_id"], email, user["role"])
    response.set_cookie(key="access_token", value=token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")
    user.pop("password_hash", None)
    return user

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"message": "Logged out successfully"}

@api_router.get("/auth/me")
async def get_me(request: Request):
    return await get_current_user(request)

@api_router.post("/auth/google/session")
async def google_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    try:
        auth_resp = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
            timeout=30
        )
        auth_resp.raise_for_status()
        google_data = auth_resp.json()
    except Exception as e:
        logger.error(f"Google auth error: {e}")
        raise HTTPException(status_code=401, detail="Invalid session")
    email = google_data.get("email", "").lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": email,
            "name": google_data.get("name", ""),
            "picture": google_data.get("picture"),
            "role": "instructor",
            "studio_id": None,
            "password_hash": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
    token = create_access_token(user["user_id"], email, user["role"])
    response.set_cookie(key="access_token", value=token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")
    user.pop("password_hash", None)
    user.pop("_id", None)
    return user

class ProfileUpdate(BaseModel):
    name: Optional[str] = None

@api_router.put("/auth/profile")
async def update_profile(data: ProfileUpdate, request: Request):
    user = await get_current_user(request)
    update_fields = {}
    if data.name is not None and data.name.strip():
        update_fields["name"] = data.name.strip()
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": update_fields})
    return {"message": "Profile updated", **update_fields}

@api_router.get("/auth/profile")
async def get_profile(request: Request):
    user = await get_current_user(request)
    user_full = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    return user_full

@api_router.post("/admin/instructors", response_model=UserResponse)
async def create_instructor(data: InstructorCreate, request: Request):
    await require_admin(request)
    email = data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": email,
        "password_hash": hash_password(data.password),
        "name": data.name,
        "role": "instructor",
        "studio_id": data.studio_id,
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    user_doc.pop("password_hash")
    user_doc.pop("_id", None)
    return UserResponse(**user_doc)

@api_router.get("/admin/instructors", response_model=List[UserResponse])
async def list_instructors(request: Request):
    await require_admin(request)
    instructors = await db.users.find({"role": "instructor"}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return [UserResponse(**i) for i in instructors]

@api_router.delete("/admin/instructors/{user_id}")
async def delete_instructor(user_id: str, request: Request):
    await require_admin(request)
    result = await db.users.delete_one({"user_id": user_id, "role": "instructor"})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Instructor not found")
    return {"message": "Instructor deleted"}

@api_router.post("/studios", response_model=StudioResponse)
async def create_studio(data: StudioCreate, request: Request):
    await require_admin(request)
    studio_id = f"studio_{uuid.uuid4().hex[:12]}"
    studio_doc = {
        "studio_id": studio_id,
        "name": data.name,
        "address": data.address,
        "phone": data.phone,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True
    }
    await db.studios.insert_one(studio_doc)
    studio_doc.pop("_id", None)
    return StudioResponse(**studio_doc)

@api_router.get("/studios", response_model=List[StudioResponse])
async def list_studios(request: Request):
    await get_current_user(request)
    studios = await db.studios.find({"is_active": True}, {"_id": 0}).to_list(1000)
    return [StudioResponse(**s) for s in studios]

@api_router.put("/studios/{studio_id}")
async def update_studio(studio_id: str, data: StudioCreate, request: Request):
    await require_admin(request)
    result = await db.studios.update_one({"studio_id": studio_id}, {"$set": {"name": data.name, "address": data.address, "phone": data.phone}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Studio not found")
    return {"message": "Studio updated"}

@api_router.delete("/studios/{studio_id}")
async def delete_studio(studio_id: str, request: Request):
    await require_admin(request)
    await db.studios.update_one({"studio_id": studio_id}, {"$set": {"is_active": False}})
    return {"message": "Studio deactivated"}

@api_router.post("/albums")
async def create_album(request: Request, name: str = Query(...), artist: str = Query(...), year: int = Query(...), description: Optional[str] = Query(None), cover: Optional[UploadFile] = File(None)):
    await require_admin(request)
    album_id = f"album_{uuid.uuid4().hex[:12]}"
    cover_path = None
    if cover:
        cover_content = await cover.read()
        cover_ext = cover.filename.split(".")[-1] if "." in cover.filename else "jpg"
        cover_path = f"{APP_NAME}/albums/{album_id}/cover.{cover_ext}"
        put_object(cover_path, cover_content, cover.content_type or "image/jpeg")
    album_doc = {
        "album_id": album_id,
        "name": name,
        "artist": artist,
        "year": year,
        "description": description,
        "cover_path": cover_path,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True
    }
    await db.albums.insert_one(album_doc)
    album_doc.pop("_id", None)
    album_doc["mix_count"] = 0
    return album_doc

@api_router.get("/albums", response_model=List[AlbumResponse])
async def list_albums(request: Request):
    await get_current_user(request)
    albums = await db.albums.find({"is_active": True}, {"_id": 0}).to_list(1000)
    for album in albums:
        mix_count = await db.mixes.count_documents({"album_id": album["album_id"], "is_active": True})
        album["mix_count"] = mix_count
    return [AlbumResponse(**a) for a in albums]

@api_router.get("/albums/{album_id}")
async def get_album(album_id: str, request: Request):
    await get_current_user(request)
    album = await db.albums.find_one({"album_id": album_id, "is_active": True}, {"_id": 0})
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    mixes = await db.mixes.find({"album_id": album_id, "is_active": True}, {"_id": 0}).to_list(1000)
    album["mixes"] = mixes
    album["mix_count"] = len(mixes)
    return album

@api_router.put("/albums/{album_id}")
async def update_album(album_id: str, request: Request, name: str = Query(...), artist: str = Query(...), year: int = Query(...), description: Optional[str] = Query(None), cover: Optional[UploadFile] = File(None)):
    await require_admin(request)
    update_data = {"name": name, "artist": artist, "year": year, "description": description}
    if cover:
        cover_content = await cover.read()
        cover_ext = cover.filename.split(".")[-1] if "." in cover.filename else "jpg"
        cover_path = f"{APP_NAME}/albums/{album_id}/cover.{cover_ext}"
        put_object(cover_path, cover_content, cover.content_type or "image/jpeg")
        update_data["cover_path"] = cover_path
    result = await db.albums.update_one({"album_id": album_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Album not found")
    return {"message": "Album updated"}

@api_router.delete("/albums/{album_id}")
async def delete_album(album_id: str, request: Request):
    await require_admin(request)
    mix_count = await db.mixes.count_documents({"album_id": album_id, "is_active": True})
    if mix_count > 0:
        raise HTTPException(status_code=400, detail=f"No se puede eliminar: el álbum tiene {mix_count} mixes")
    await db.albums.update_one({"album_id": album_id}, {"$set": {"is_active": False}})
    return {"message": "Album deactivated"}

@api_router.get("/albums/{album_id}/cover")
async def get_album_cover(album_id: str, request: Request, authorization: str = Header(None), auth: str = Query(None)):
    auth_header = authorization or (f"Bearer {auth}" if auth else None)
    if auth_header:
        request._headers = {**dict(request.headers), "authorization": auth_header}
    await get_current_user(request)
    album = await db.albums.find_one({"album_id": album_id, "is_active": True}, {"_id": 0})
    if not album or not album.get("cover_path"):
        raise HTTPException(status_code=404, detail="Cover not found")
    data, content_type = get_object(album["cover_path"])
    return Response(content=data, media_type=content_type)

@api_router.post("/mixes")
async def create_mix(request: Request, name: str = Query(...), artist: str = Query(...), album_id: str = Query(...), bpm: Optional[int] = Query(None), duration: Optional[int] = Query(None), genre: Optional[str] = Query(None), description: Optional[str] = Query(None), audio: UploadFile = File(...), cover: Optional[UploadFile] = File(None)):
    await require_admin(request)
    album = await db.albums.find_one({"album_id": album_id, "is_active": True})
    if not album:
        raise HTTPException(status_code=400, detail="Album no encontrado")
    mix_id = f"mix_{uuid.uuid4().hex[:12]}"
    audio_content = await audio.read()
    metadata = extract_audio_metadata(audio_content, audio.filename)
    final_duration = duration if duration else metadata.get("duration")
    final_bpm = bpm if bpm else metadata.get("bpm")
    final_genre = genre if genre else metadata.get("genre")
    audio_ext = audio.filename.split(".")[-1] if "." in audio.filename else "mp3"
    audio_path = f"{APP_NAME}/mixes/{mix_id}/audio.{audio_ext}"
    put_object(audio_path, audio_content, audio.content_type or "audio/mpeg")
    cover_path = album.get("cover_path")
    if cover:
        cover_content = await cover.read()
        cover_ext = cover.filename.split(".")[-1] if "." in cover.filename else "jpg"
        cover_path = f"{APP_NAME}/mixes/{mix_id}/cover.{cover_ext}"
        put_object(cover_path, cover_content, cover.content_type or "image/jpeg")
    mix_doc = {
        "mix_id": mix_id,
        "name": name,
        "artist": artist,
        "bpm": final_bpm,
        "duration": final_duration,
        "genre": final_genre,
        "album_id": album_id,
        "description": description,
        "audio_path": audio_path,
        "cover_path": cover_path,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True
    }
    await db.mixes.insert_one(mix_doc)
    mix_doc.pop("_id", None)
    mix_doc["album_name"] = album["name"]
    return mix_doc

@api_router.post("/mixes/batch")
async def batch_upload_mixes(request: Request, artist: str = Query(...), album_id: Optional[str] = Query(None), new_album_name: Optional[str] = Query(None), new_album_year: Optional[int] = Query(None), audio_files: List[UploadFile] = File(...), album_cover: Optional[UploadFile] = File(None)):
    await require_admin(request)
    album = None
    if album_id:
        album = await db.albums.find_one({"album_id": album_id, "is_active": True})
        if not album:
            raise HTTPException(status_code=400, detail="Álbum no encontrado")
    elif new_album_name:
        album_id = f"album_{uuid.uuid4().hex[:12]}"
        cover_path = None
        if album_cover:
            cover_content = await album_cover.read()
            cover_ext = album_cover.filename.split(".")[-1] if "." in album_cover.filename else "jpg"
            cover_path = f"{APP_NAME}/albums/{album_id}/cover.{cover_ext}"
            put_object(cover_path, cover_content, album_cover.content_type or "image/jpeg")
        album = {
            "album_id": album_id,
            "name": new_album_name,
            "artist": artist,
            "year": new_album_year or datetime.now().year,
            "description": None,
            "cover_path": cover_path,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_active": True
        }
        await db.albums.insert_one(album)
    else:
        raise HTTPException(status_code=400, detail="Debes seleccionar un álbum existente o crear uno nuevo")
    created_mixes = []
    errors = []
    for audio_file in audio_files:
        try:
            audio_content = await audio_file.read()
            metadata = extract_audio_metadata(audio_content, audio_file.filename)
            filename = audio_file.filename
            name = filename.rsplit(".", 1)[0] if "." in filename else filename
            mix_id = f"mix_{uuid.uuid4().hex[:12]}"
            audio_ext = filename.split(".")[-1] if "." in filename else "mp3"
            audio_path = f"{APP_NAME}/mixes/{mix_id}/audio.{audio_ext}"
            put_object(audio_path, audio_content, audio_file.content_type or "audio/mpeg")
            mix_doc = {
                "mix_id": mix_id,
                "name": name,
                "artist": artist,
                "bpm": metadata.get("bpm"),
                "duration": metadata.get("duration"),
                "genre": metadata.get("genre"),
                "album_id": album["album_id"],
                "description": None,
                "audio_path": audio_path,
                "cover_path": album.get("cover_path"),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "is_active": True
            }
            await db.mixes.insert_one(mix_doc)
            mix_doc.pop("_id", None)
            mix_doc["album_name"] = album["name"]
            created_mixes.append(mix_doc)
        except Exception as e:
            logger.error(f"Error uploading {audio_file.filename}: {e}")
            errors.append({"filename": audio_file.filename, "error": str(e)})
    return {"album": {"album_id": album["album_id"], "name": album["name"]}, "created_mixes": len(created_mixes), "mixes": created_mixes, "errors": errors}

@api_router.get("/mixes", response_model=List[MixResponse])
async def list_mixes(request: Request, genre: Optional[str] = None, album_id: Optional[str] = None, min_bpm: Optional[int] = None, max_bpm: Optional[int] = None, search: Optional[str] = None):
    await get_current_user(request)
    query = {"is_active": True}
    if genre:
        query["genre"] = genre
    if album_id:
        query["album_id"] = album_id
    if min_bpm:
        query["bpm"] = {"$gte": min_bpm}
    if max_bpm:
        query.setdefault("bpm", {})["$lte"] = max_bpm
    if search:
        query["$or"] = [{"name": {"$regex": search, "$options": "i"}}, {"artist": {"$regex": search, "$options": "i"}}]
    mixes = await db.mixes.find(query, {"_id": 0}).to_list(1000)
    album_ids = list(set(m.get("album_id") for m in mixes if m.get("album_id")))
    albums = await db.albums.find({"album_id": {"$in": album_ids}}, {"_id": 0, "album_id": 1, "name": 1}).to_list(1000)
    album_map = {a["album_id"]: a["name"] for a in albums}
    for mix in mixes:
        mix["album_name"] = album_map.get(mix.get("album_id"), "")
    return [MixResponse(**m) for m in mixes]

@api_router.get("/mixes/{mix_id}", response_model=MixResponse)
async def get_mix(mix_id: str, request: Request):
    await get_current_user(request)
    mix = await db.mixes.find_one({"mix_id": mix_id, "is_active": True}, {"_id": 0})
    if not mix:
        raise HTTPException(status_code=404, detail="Mix not found")
    return MixResponse(**mix)

@api_router.delete("/mixes/{mix_id}")
async def delete_mix(mix_id: str, request: Request):
    await require_admin(request)
    await db.mixes.update_one({"mix_id": mix_id}, {"$set": {"is_active": False}})
    return {"message": "Mix deactivated"}

@api_router.get("/mixes/{mix_id}/audio")
async def stream_audio(mix_id: str, request: Request, authorization: str = Header(None), auth: str = Query(None)):
    auth_header = authorization or (f"Bearer {auth}" if auth else None)
    if auth_header:
        request._headers = {**dict(request.headers), "authorization": auth_header}
    await get_current_user(request)
    mix = await db.mixes.find_one({"mix_id": mix_id, "is_active": True}, {"_id": 0})
    if not mix or not mix.get("audio_path"):
        raise HTTPException(status_code=404, detail="Audio not found")
    data, content_type = get_cached_audio(mix["audio_path"])
    file_size = len(data)
    range_header = request.headers.get("range")
    if range_header:
        range_match = range_header.replace("bytes=", "").split("-")
        start = int(range_match[0]) if range_match[0] else 0
        end = int(range_match[1]) if range_match[1] else file_size - 1
        start = min(start, file_size - 1)
        end = min(end, file_size - 1)
        chunk = data[start:end + 1]
        return Response(content=chunk, status_code=206, headers={"Content-Range": f"bytes {start}-{end}/{file_size}", "Accept-Ranges": "bytes", "Content-Length": str(len(chunk)), "Content-Type": content_type, "Cache-Control": "public, max-age=86400"}, media_type=content_type)
    return Response(content=data, media_type=content_type, headers={"Content-Length": str(file_size), "Accept-Ranges": "bytes", "Cache-Control": "public, max-age=86400", "Content-Disposition": f"inline; filename={mix['name']}.mp3"})

@api_router.post("/mixes/preload")
async def preload_audio(request: Request):
    await get_current_user(request)
    body = await request.json()
    mix_ids = body.get("mix_ids", [])
    cached = 0
    for mid in mix_ids[:5]:
        mix = await db.mixes.find_one({"mix_id": mid, "is_active": True}, {"_id": 0})
        if mix and mix.get("audio_path"):
            safe_name = mix["audio_path"].replace("/", "_").replace("\\", "_")
            cache_file = AUDIO_CACHE_DIR / safe_name
            if not cache_file.exists():
                try:
                    get_cached_audio(mix["audio_path"])
                    cached += 1
                except Exception as e:
                    logger.warning(f"Preload failed for {mid}: {e}")
    return {"preloaded": cached}

@api_router.get("/mixes/{mix_id}/download")
async def download_audio(mix_id: str, request: Request):
    await get_current_user(request)
    mix = await db.mixes.find_one({"mix_id": mix_id, "is_active": True}, {"_id": 0})
    if not mix or not mix.get("audio_path"):
        raise HTTPException(status_code=404, detail="Audio not found")
    data, content_type = get_object(mix["audio_path"])
    filename = f"{mix['name']} - {mix['artist']}.mp3".replace("/", "-")
    return StreamingResponse(io.BytesIO(data), media_type="application/octet-stream", headers={"Content-Disposition": f"attachment; filename=\"{filename}\""})

@api_router.get("/mixes/{mix_id}/cover")
async def get_cover(mix_id: str, request: Request, authorization: str = Header(None), auth: str = Query(None)):
    auth_header = authorization or (f"Bearer {auth}" if auth else None)
    if auth_header:
        request._headers = {**dict(request.headers), "authorization": auth_header}
    await get_current_user(request)
    mix = await db.mixes.find_one({"mix_id": mix_id, "is_active": True}, {"_id": 0})
    if not mix or not mix.get("cover_path"):
        raise HTTPException(status_code=404, detail="Cover not found")
    data, content_type = get_object(mix["cover_path"])
    return Response(content=data, media_type=content_type)

@api_router.get("/genres")
async def list_genres(request: Request):
    await get_current_user(request)
    genres = await db.mixes.distinct("genre", {"is_active": True})
    return genres

@api_router.post("/playlists", response_model=PlaylistResponse)
async def create_playlist(data: PlaylistCreate, request: Request):
    user = await require_instructor_or_admin(request)
    playlist_id = f"playlist_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    playlist_doc = {"playlist_id": playlist_id, "name": data.name, "description": data.description, "is_public": data.is_public, "user_id": user["user_id"], "user_name": user["name"], "mix_ids": [], "created_at": now, "updated_at": now}
    await db.playlists.insert_one(playlist_doc)
    playlist_doc.pop("_id", None)
    return PlaylistResponse(**playlist_doc)

@api_router.get("/playlists", response_model=List[PlaylistResponse])
async def list_playlists(request: Request, public_only: bool = False):
    user = await get_current_user(request)
    query = {"is_public": True} if public_only else {"$or": [{"user_id": user["user_id"]}, {"is_public": True}]}
    playlists = await db.playlists.find(query, {"_id": 0}).to_list(1000)
    results = []
    for p in playlists:
        if "user_name" not in p: p["user_name"] = ""
        if "mix_ids" not in p: p["mix_ids"] = []
        if "items" not in p: p["items"] = []
        results.append(PlaylistResponse(**p))
    return results

@api_router.get("/playlists/mine", response_model=List[PlaylistResponse])
async def my_playlists(request: Request):
    user = await get_current_user(request)
    playlists = await db.playlists.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(1000)
    results = []
    for p in playlists:
        if "user_name" not in p: p["user_name"] = user.get("name", user.get("email", ""))
        if "mix_ids" not in p: p["mix_ids"] = []
        if "items" not in p: p["items"] = []
        results.append(PlaylistResponse(**p))
    return results

@api_router.get("/playlists/{playlist_id}", response_model=PlaylistResponse)
async def get_playlist(playlist_id: str, request: Request):
    user = await get_current_user(request)
    playlist = await db.playlists.find_one({"playlist_id": playlist_id}, {"_id": 0})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    if not playlist.get("is_public") and playlist.get("user_id") != user["user_id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    if "user_name" not in playlist:
        owner = await db.users.find_one({"user_id": playlist.get("user_id")}, {"_id": 0, "name": 1, "email": 1})
        playlist["user_name"] = owner.get("name", owner.get("email", "")) if owner else ""
    if "mix_ids" not in playlist: playlist["mix_ids"] = []
    if "items" not in playlist: playlist["items"] = []
    return PlaylistResponse(**playlist)

@api_router.put("/playlists/{playlist_id}")
async def update_playlist(playlist_id: str, data: PlaylistUpdate, request: Request):
    user = await get_current_user(request)
    playlist = await db.playlists.find_one({"playlist_id": playlist_id}, {"_id": 0})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    if playlist["user_id"] != user["user_id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if data.name is not None: update_data["name"] = data.name
    if data.description is not None: update_data["description"] = data.description
    if data.is_public is not None: update_data["is_public"] = data.is_public
    if data.mix_ids is not None: update_data["mix_ids"] = data.mix_ids
    await db.playlists.update_one({"playlist_id": playlist_id}, {"$set": update_data})
    updated = await db.playlists.find_one({"playlist_id": playlist_id}, {"_id": 0})
    return PlaylistResponse(**updated)

@api_router.post("/playlists/{playlist_id}/mixes/{mix_id}")
async def add_mix_to_playlist(playlist_id: str, mix_id: str, request: Request):
    user = await get_current_user(request)
    playlist = await db.playlists.find_one({"playlist_id": playlist_id}, {"_id": 0})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    if playlist["user_id"] != user["user_id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    mix = await db.mixes.find_one({"mix_id": mix_id, "is_active": True})
    if not mix:
        raise HTTPException(status_code=404, detail="Mix not found")
    if mix_id not in playlist.get("mix_ids", []):
        await db.playlists.update_one({"playlist_id": playlist_id}, {"$push": {"mix_ids": mix_id}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"message": "Mix added to playlist"}

@api_router.delete("/playlists/{playlist_id}/mixes/{mix_id}")
async def remove_mix_from_playlist(playlist_id: str, mix_id: str, request: Request):
    user = await get_current_user(request)
    playlist = await db.playlists.find_one({"playlist_id": playlist_id}, {"_id": 0})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    if playlist["user_id"] != user["user_id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    await db.playlists.update_one({"playlist_id": playlist_id}, {"$pull": {"mix_ids": mix_id}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"message": "Mix removed from playlist"}

@api_router.delete("/playlists/{playlist_id}")
async def delete_playlist(playlist_id: str, request: Request):
    user = await get_current_user(request)
    playlist = await db.playlists.find_one({"playlist_id": playlist_id}, {"_id": 0})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    if playlist["user_id"] != user["user_id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    await db.playlists.delete_one({"playlist_id": playlist_id})
    return {"message": "Playlist deleted"}

@api_router.post("/class-sessions")
async def create_class_session(data: ClassSessionCreate, request: Request):
    user = await get_current_user(request)
    session_id = f"class_{uuid.uuid4().hex[:12]}"
    session_doc = {"session_id": session_id, "name": data.name, "user_id": user["user_id"], "user_name": user.get("name", ""), "playlist_id": data.playlist_id, "tracks": [t.dict() for t in data.tracks], "total_duration": data.total_duration, "transition_duration": data.transition_duration, "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.class_sessions.insert_one(session_doc)
    session_doc.pop("_id", None)
    return session_doc

@api_router.get("/class-sessions")
async def list_class_sessions(request: Request):
    user = await get_current_user(request)
    sessions = await db.class_sessions.find({"user_id": user["user_id"]}, {"_id": 0}).sort("updated_at", -1).to_list(100)
    return sessions

@api_router.get("/class-sessions/{session_id}")
async def get_class_session(session_id: str, request: Request):
    user = await get_current_user(request)
    session = await db.class_sessions.find_one({"session_id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["user_id"] != user["user_id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    return session

@api_router.put("/class-sessions/{session_id}")
async def update_class_session(session_id: str, data: ClassSessionUpdate, request: Request):
    user = await get_current_user(request)
    session = await db.class_sessions.find_one({"session_id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["user_id"] != user["user_id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    update_fields = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if data.name is not None: update_fields["name"] = data.name
    if data.tracks is not None: update_fields["tracks"] = [t.dict() for t in data.tracks]
    if data.total_duration is not None: update_fields["total_duration"] = data.total_duration
    if data.transition_duration is not None: update_fields["transition_duration"] = data.transition_duration
    await db.class_sessions.update_one({"session_id": session_id}, {"$set": update_fields})
    return {"message": "Session updated"}

@api_router.delete("/class-sessions/{session_id}")
async def delete_class_session(session_id: str, request: Request):
    user = await get_current_user(request)
    session = await db.class_sessions.find_one({"session_id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["user_id"] != user["user_id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    await db.class_sessions.delete_one({"session_id": session_id})
    return {"message": "Session deleted"}

def get_spotify_client_token():
    global spotify_client_token, spotify_client_token_expires
    now = datetime.now(timezone.utc)
    if spotify_client_token and spotify_client_token_expires and now < spotify_client_token_expires:
        return spotify_client_token
    if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Spotify credentials not configured")
    auth_str = base64.b64encode(f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_CLIENT_SECRET}".encode()).decode()
    resp = requests.post(SPOTIFY_TOKEN_URL, headers={"Authorization": f"Basic {auth_str}", "Content-Type": "application/x-www-form-urlencoded"}, data={"grant_type": "client_credentials"}, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    spotify_client_token = data["access_token"]
    spotify_client_token_expires = now + timedelta(seconds=data.get("expires_in", 3600) - 60)
    return spotify_client_token

@api_router.get("/spotify/search")
async def spotify_search(q: str, request: Request, limit: int = 20):
    await get_current_user(request)
    token = get_spotify_client_token()
    resp = requests.get(f"{SPOTIFY_API_BASE}/search", headers={"Authorization": f"Bearer {token}"}, params={"q": q, "type": "track", "limit": min(limit, 50), "market": "US"}, timeout=15)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail="Spotify search failed")
    data = resp.json()
    tracks = []
    for item in data.get("tracks", {}).get("items", []):
        tracks.append({"spotify_id": item["id"], "name": item["name"], "artist": ", ".join(a["name"] for a in item["artists"]), "album": item["album"]["name"], "album_image": item["album"]["images"][0]["url"] if item["album"]["images"] else None, "album_image_small": item["album"]["images"][-1]["url"] if item["album"]["images"] else None, "duration_ms": item["duration_ms"], "uri": item["uri"], "preview_url": item.get("preview_url"), "external_url": item.get("external_urls", {}).get("spotify"), "type": "spotify"})
    return {"tracks": tracks, "total": data.get("tracks", {}).get("total", 0)}

@api_router.get("/spotify/auth-url")
async def spotify_auth_url(request: Request):
    user = await get_current_user(request)
    if not SPOTIFY_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Spotify not configured")
    frontend_url = os.environ.get("FRONTEND_URL", "").rstrip("/")
    if not frontend_url:
        referer = request.headers.get("referer", "")
        if referer:
            from urllib.parse import urlparse
            parsed = urlparse(referer)
            frontend_url = f"{parsed.scheme}://{parsed.netloc}"
        else:
            frontend_url = request.headers.get('origin', '')
    redirect_uri = f"{frontend_url}/spotify-callback"
    scopes = "user-read-playback-state user-modify-playback-state user-read-private streaming playlist-read-private playlist-read-collaborative"
    auth_url = f"{SPOTIFY_AUTH_URL}?response_type=code&client_id={SPOTIFY_CLIENT_ID}&scope={scopes}&redirect_uri={redirect_uri}&state={user['user_id']}"
    return {"auth_url": auth_url, "redirect_uri": redirect_uri}

@api_router.post("/spotify/callback")
async def spotify_callback(request: Request):
    user = await get_current_user(request)
    body = await request.json()
    code = body.get("code")
    redirect_uri = body.get("redirect_uri")
    if not code:
        raise HTTPException(status_code=400, detail="Code required")
    auth_str = base64.b64encode(f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_CLIENT_SECRET}".encode()).decode()
    resp = requests.post(SPOTIFY_TOKEN_URL, headers={"Authorization": f"Basic {auth_str}", "Content-Type": "application/x-www-form-urlencoded"}, data={"grant_type": "authorization_code", "code": code, "redirect_uri": redirect_uri}, timeout=15)
    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to exchange code")
    token_data = resp.json()
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"spotify_access_token": token_data["access_token"], "spotify_refresh_token": token_data.get("refresh_token"), "spotify_token_expires": (datetime.now(timezone.utc) + timedelta(seconds=token_data.get("expires_in", 3600))).isoformat()}})
    return {"connected": True}

@api_router.get("/spotify/token")
async def get_spotify_user_token(request: Request):
    user = await get_current_user(request)
    user_full = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not user_full.get("spotify_access_token"):
        return {"connected": False, "access_token": None}
    expires = user_full.get("spotify_token_expires", "")
    if expires:
        try:
            exp_dt = datetime.fromisoformat(expires)
            if datetime.now(timezone.utc) >= exp_dt:
                refresh = user_full.get("spotify_refresh_token")
                if refresh:
                    auth_str = base64.b64encode(f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_CLIENT_SECRET}".encode()).decode()
                    resp = requests.post(SPOTIFY_TOKEN_URL, headers={"Authorization": f"Basic {auth_str}", "Content-Type": "application/x-www-form-urlencoded"}, data={"grant_type": "refresh_token", "refresh_token": refresh}, timeout=15)
                    if resp.status_code == 200:
                        td = resp.json()
                        new_token = td["access_token"]
                        new_expires = (datetime.now(timezone.utc) + timedelta(seconds=td.get("expires_in", 3600))).isoformat()
                        await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"spotify_access_token": new_token, "spotify_token_expires": new_expires}})
                        return {"connected": True, "access_token": new_token}
                return {"connected": False, "access_token": None}
        except Exception:
            pass
    return {"connected": True, "access_token": user_full["spotify_access_token"]}

@api_router.post("/spotify/disconnect")
async def spotify_disconnect(request: Request):
    user = await get_current_user(request)
    await db.users.update_one({"user_id": user["user_id"]}, {"$unset": {"spotify_access_token": "", "spotify_refresh_token": "", "spotify_token_expires": ""}})
    return {"disconnected": True}

@api_router.put("/spotify/transfer")
async def spotify_transfer_playback(request: Request):
    user = await get_current_user(request)
    body = await request.json()
    device_id = body.get("device_id")
    if not device_id:
        raise HTTPException(status_code=400, detail="device_id required")
    token_resp = await get_spotify_user_token(request)
    if not token_resp.get("connected") or not token_resp.get("access_token"):
        raise HTTPException(status_code=401, detail="Spotify not connected")
    token = token_resp["access_token"]
    resp = requests.put(f"{SPOTIFY_API_BASE}/me/player", headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}, json={"device_ids": [device_id], "play": False}, timeout=10)
    if resp.status_code in (200, 204):
        return {"transferred": True}
    raise HTTPException(status_code=resp.status_code, detail=f"Transfer failed: {resp.text}")

@api_router.post("/spotify/play")
async def spotify_play_server_side(request: Request):
    user = await get_current_user(request)
    body = await request.json()
    uri = body.get("uri")
    if not uri:
        raise HTTPException(status_code=400, detail="uri required")
    token_resp = await get_spotify_user_token(request)
    if not token_resp.get("connected") or not token_resp.get("access_token"):
        raise HTTPException(status_code=401, detail="Spotify not connected")
    token = token_resp["access_token"]
    dev_resp = requests.get(f"{SPOTIFY_API_BASE}/me/player/devices", headers={"Authorization": f"Bearer {token}"}, timeout=10)
    if dev_resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to get devices")
    devices = dev_resp.json().get("devices", [])
    if not devices:
        raise HTTPException(status_code=404, detail="No Spotify devices available.")
    target = None
    for d in devices:
        if "FitBeats" in d.get("name", ""):
            target = d
            break
    if not target:
        target = next((d for d in devices if d.get("is_active")), devices[0])
    requests.put(f"{SPOTIFY_API_BASE}/me/player", headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}, json={"device_ids": [target["id"]], "play": False}, timeout=10)
    import time
    time.sleep(0.5)
    play_resp = requests.put(f"{SPOTIFY_API_BASE}/me/player/play?device_id={target['id']}", headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}, json={"uris": [uri]}, timeout=10)
    if play_resp.status_code in (200, 204):
        return {"playing": True, "device": target["name"], "device_id": target["id"]}
    raise HTTPException(status_code=play_resp.status_code, detail=f"Play failed: {play_resp.text}")

@api_router.get("/spotify/playlists")
async def get_user_spotify_playlists(request: Request, limit: int = 50):
    token_resp = await get_spotify_user_token(request)
    if not token_resp.get("connected") or not token_resp.get("access_token"):
        raise HTTPException(status_code=401, detail="Spotify not connected.")
    token = token_resp["access_token"]
    resp = requests.get(f"{SPOTIFY_API_BASE}/me/playlists", headers={"Authorization": f"Bearer {token}"}, params={"limit": min(limit, 50)}, timeout=15)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail="Failed to fetch Spotify playlists")
    data = resp.json()
    playlists = []
    for item in data.get("items", []):
        playlists.append({"spotify_playlist_id": item["id"], "name": item["name"], "description": item.get("description", ""), "image": item["images"][0]["url"] if item.get("images") else None, "track_count": item["tracks"]["total"], "owner": item["owner"]["display_name"], "external_url": item.get("external_urls", {}).get("spotify")})
    return {"playlists": playlists, "total": data.get("total", 0)}

@api_router.post("/spotify/playlists/{spotify_playlist_id}/import")
async def import_spotify_playlist(spotify_playlist_id: str, request: Request):
    user = await get_current_user(request)
    existing = await db.playlists.find_one({"user_id": user["user_id"], "spotify_source": spotify_playlist_id}, {"_id": 0, "playlist_id": 1})
    if existing:
        return existing
    token_resp = await get_spotify_user_token(request)
    if not token_resp.get("connected") or not token_resp.get("access_token"):
        raise HTTPException(status_code=401, detail="Spotify not connected")
    token = token_resp["access_token"]
    resp = requests.get(f"{SPOTIFY_API_BASE}/playlists/{spotify_playlist_id}", headers={"Authorization": f"Bearer {token}"}, params={"fields": "name,description,images,tracks.items(track(id,name,artists,album,duration_ms,uri,preview_url,external_urls)),tracks.total"}, timeout=15)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail="Failed to fetch playlist from Spotify")
    sp_data = resp.json()
    playlist_id = f"pl_{uuid.uuid4().hex[:12]}"
    items = []
    for entry in sp_data.get("tracks", {}).get("items", []):
        track = entry.get("track")
        if not track or not track.get("id"):
            continue
        items.append({"type": "spotify", "spotify_id": track["id"], "name": track["name"], "artist": ", ".join(a["name"] for a in track.get("artists", [])), "album": track.get("album", {}).get("name", ""), "album_image": track["album"]["images"][0]["url"] if track.get("album", {}).get("images") else None, "duration_ms": track.get("duration_ms"), "uri": track.get("uri"), "preview_url": track.get("preview_url")})
    playlist_doc = {"playlist_id": playlist_id, "name": sp_data.get("name", "Spotify Import"), "user_id": user["user_id"], "user_name": user.get("name", user.get("email", "")), "items": items, "mix_ids": [], "is_public": False, "spotify_source": spotify_playlist_id, "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.playlists.insert_one(playlist_doc)
    playlist_doc.pop("_id", None)
    return playlist_doc

class PlaylistItemAdd(BaseModel):
    type: str
    mix_id: Optional[str] = None
    spotify_id: Optional[str] = None
    name: Optional[str] = None
    artist: Optional[str] = None
    album: Optional[str] = None
    album_image: Optional[str] = None
    duration_ms: Optional[int] = None
    uri: Optional[str] = None
    preview_url: Optional[str] = None

@api_router.post("/playlists/{playlist_id}/items")
async def add_item_to_playlist(playlist_id: str, item: PlaylistItemAdd, request: Request):
    user = await get_current_user(request)
    playlist = await db.playlists.find_one({"playlist_id": playlist_id}, {"_id": 0})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    if playlist["user_id"] != user["user_id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    items = playlist.get("items", [])
    if item.type == "mix":
        if not item.mix_id:
            raise HTTPException(status_code=400, detail="mix_id required for mix items")
        mix = await db.mixes.find_one({"mix_id": item.mix_id, "is_active": True})
        if not mix:
            raise HTTPException(status_code=404, detail="Mix not found")
        new_item = {"type": "mix", "mix_id": item.mix_id}
        if any(i.get("mix_id") == item.mix_id for i in items):
            return {"message": "Already in playlist"}
    elif item.type == "spotify":
        if not item.spotify_id:
            raise HTTPException(status_code=400, detail="spotify_id required")
        new_item = {"type": "spotify", "spotify_id": item.spotify_id, "name": item.name, "artist": item.artist, "album": item.album, "album_image": item.album_image, "duration_ms": item.duration_ms, "uri": item.uri, "preview_url": item.preview_url}
        if any(i.get("spotify_id") == item.spotify_id for i in items):
            return {"message": "Already in playlist"}
    else:
        raise HTTPException(status_code=400, detail="Invalid item type")
    items.append(new_item)
    mix_ids = playlist.get("mix_ids", [])
    if item.type == "mix" and item.mix_id not in mix_ids:
        mix_ids.append(item.mix_id)
    await db.playlists.update_one({"playlist_id": playlist_id}, {"$set": {"items": items, "mix_ids": mix_ids, "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"message": "Item added to playlist"}

@api_router.delete("/playlists/{playlist_id}/items/{item_index}")
async def remove_item_from_playlist(playlist_id: str, item_index: int, request: Request):
    user = await get_current_user(request)
    playlist = await db.playlists.find_one({"playlist_id": playlist_id}, {"_id": 0})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    if playlist["user_id"] != user["user_id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    items = playlist.get("items", [])
    if item_index < 0 or item_index >= len(items):
        raise HTTPException(status_code=400, detail="Invalid item index")
    items.pop(item_index)
    mix_ids = [i["mix_id"] for i in items if i.get("type") == "mix"]
    await db.playlists.update_one({"playlist_id": playlist_id}, {"$set": {"items": items, "mix_ids": mix_ids, "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"message": "Item removed"}

@api_router.get("/playlists/{playlist_id}/items")
async def get_playlist_items(playlist_id: str, request: Request):
    user = await get_current_user(request)
    playlist = await db.playlists.find_one({"playlist_id": playlist_id}, {"_id": 0})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    if not playlist.get("is_public") and playlist["user_id"] != user["user_id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    items = playlist.get("items", [])
    if not items and playlist.get("mix_ids"):
        items = [{"type": "mix", "mix_id": mid} for mid in playlist["mix_ids"]]
        await db.playlists.update_one({"playlist_id": playlist_id}, {"$set": {"items": items}})
    enriched = []
    for item in items:
        if item.get("type") == "mix":
            mix = await db.mixes.find_one({"mix_id": item["mix_id"], "is_active": True}, {"_id": 0})
            if mix:
                album = await db.albums.find_one({"album_id": mix.get("album_id")}, {"_id": 0, "name": 1})
                enriched.append({"type": "mix", "mix_id": mix["mix_id"], "name": mix["name"], "artist": mix["artist"], "album_name": album["name"] if album else "", "duration": mix.get("duration"), "cover_path": mix.get("cover_path"), "bpm": mix.get("bpm"), "genre": mix.get("genre")})
        elif item.get("type") == "spotify":
            enriched.append({"type": "spotify", "spotify_id": item["spotify_id"], "name": item.get("name", ""), "artist": item.get("artist", ""), "album": item.get("album", ""), "album_image": item.get("album_image"), "duration_ms": item.get("duration_ms"), "uri": item.get("uri"), "preview_url": item.get("preview_url")})
    return {"items": enriched}

@api_router.get("/playlists/{playlist_id}/download")
async def download_playlist(playlist_id: str, request: Request):
    user = await get_current_user(request)
    playlist = await db.playlists.find_one({"playlist_id": playlist_id}, {"_id": 0})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    if not playlist.get("is_public") and playlist["user_id"] != user["user_id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    items = playlist.get("items", [])
    if not items and playlist.get("mix_ids"):
        items = [{"type": "mix", "mix_id": mid} for mid in playlist["mix_ids"]]
    mix_items = [i for i in items if i.get("type") == "mix"]
    if not mix_items:
        raise HTTPException(status_code=400, detail="No hay mixes locales para descargar")
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        for idx, item in enumerate(mix_items):
            mix = await db.mixes.find_one({"mix_id": item["mix_id"], "is_active": True}, {"_id": 0})
            if not mix or not mix.get("audio_path"):
                continue
            try:
                data, _ = get_object(mix["audio_path"])
                ext = mix["audio_path"].split(".")[-1] if "." in mix["audio_path"] else "mp3"
                filename = f"{idx+1:02d} - {mix['name']} - {mix['artist']}.{ext}".replace("/", "-")
                zf.writestr(filename, data)
            except Exception as e:
                logger.warning(f"Failed to add {mix['name']} to zip: {e}")
    zip_buffer.seek(0)
    safe_name = playlist["name"].replace("/", "-").replace('"', '')
    return StreamingResponse(zip_buffer, media_type="application/zip", headers={"Content-Disposition": f'attachment; filename="{safe_name}.zip"'})

@api_router.get("/public/playlists/{playlist_id}")
async def get_public_playlist(playlist_id: str):
    playlist = await db.playlists.find_one({"playlist_id": playlist_id, "is_public": True}, {"_id": 0})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found or not public")
    return playlist

@api_router.get("/public/playlists/{playlist_id}/items")
async def get_public_playlist_items(playlist_id: str):
    playlist = await db.playlists.find_one({"playlist_id": playlist_id, "is_public": True}, {"_id": 0})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found or not public")
    items = playlist.get("items", [])
    if not items and playlist.get("mix_ids"):
        items = [{"type": "mix", "mix_id": mid} for mid in playlist["mix_ids"]]
    enriched = []
    for item in items:
        if item.get("type") == "mix":
            mix = await db.mixes.find_one({"mix_id": item["mix_id"], "is_active": True}, {"_id": 0})
            if mix:
                album = await db.albums.find_one({"album_id": mix.get("album_id")}, {"_id": 0, "name": 1})
                enriched.append({"type": "mix", "mix_id": mix["mix_id"], "name": mix["name"], "artist": mix["artist"], "album_name": album["name"] if album else "", "duration": mix.get("duration"), "cover_path": mix.get("cover_path"), "bpm": mix.get("bpm"), "genre": mix.get("genre")})
        elif item.get("type") == "spotify":
            enriched.append({"type": "spotify", "spotify_id": item["spotify_id"], "name": item.get("name", ""), "artist": item.get("artist", ""), "album": item.get("album", ""), "album_image": item.get("album_image"), "duration_ms": item.get("duration_ms"), "uri": item.get("uri"), "preview_url": item.get("preview_url")})
    return {"items": enriched}

@api_router.get("/")
async def root():
    return {"message": "FitBeats API is running", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

@app.on_event("startup")
async def startup():
    try:
        init_storage()
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.studios.create_index("studio_id", unique=True)
    await db.albums.create_index("album_id", unique=True)
    await db.mixes.create_index("mix_id", unique=True)
    await db.mixes.create_index("album_id")
    await db.playlists.create_index("playlist_id", unique=True)
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@fitbeats.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin123!")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        admin_doc = {"user_id": f"user_{uuid.uuid4().hex[:12]}", "email": admin_email, "password_hash": hash_password(admin_password), "name": "Administrator", "role": "admin", "studio_id": None, "picture": None, "created_at": datetime.now(timezone.utc).isoformat()}
        await db.users.insert_one(admin_doc)
        logger.info(f"Admin user created: {admin_email}")
    elif not verify_password(admin_password, existing.get("password_hash", "")):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info("Admin password updated")
    try:
        os.makedirs("/tmp/memory", exist_ok=True)
        with open("/tmp/memory/test_credentials.md", "w") as f:
            f.write("# Test Credentials\n\n")
            f.write("## Admin\n")
            f.write(f"- Email: {admin_email}\n")
            f.write(f"- Password: {admin_password}\n")
            f.write("- Role: admin\n")
    except Exception as e:
        logger.warning(f"Could not write credentials file: {e}")
    logger.info("FitBeats API started successfully")

@app.on_event("shutdown")
async def shutdown():
    client.close()

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
