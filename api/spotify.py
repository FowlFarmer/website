# api/spotify.py
import os, json, base64, urllib.parse, urllib.request, urllib.error, time
from http.server import BaseHTTPRequestHandler
from pymongo import MongoClient, ASCENDING, DESCENDING

TOKEN_URL  = "https://accounts.spotify.com/api/token"
PLAYER_URL = "https://api.spotify.com/v1/me/player"

# --- Mongo client (reuse on warm starts) ---
_mclient = None
def _col():
    global _mclient
    if _mclient is None:
        _mclient = MongoClient(os.environ["MONGODB_URI"], connectTimeoutMS=5000)
    db  = _mclient[os.environ.get("MONGODB_DB", "spotifycache")]
    col = db[os.environ.get("MONGODB_COLLECTION", "latest")]
    return col

def _mint_access_token():
    basic = base64.b64encode(
        f"{os.environ['SPOTIFY_CLIENT_ID']}:{os.environ['SPOTIFY_CLIENT_SECRET']}".encode()
    ).decode()
    data = urllib.parse.urlencode({
        "grant_type": "refresh_token",
        "refresh_token": os.environ["SPOTIFY_REFRESH_TOKEN"]
    }).encode()
    req = urllib.request.Request(
        TOKEN_URL, data=data,
        headers={"Authorization": f"Basic {basic}",
                 "Content-Type": "application/x-www-form-urlencoded"},
        method="POST"
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode("utf-8"))["access_token"]

def _fetch_player(access_token: str):
    req = urllib.request.Request(
        PLAYER_URL, headers={"Authorization": f"Bearer {access_token}"}, method="GET"
    )
    with urllib.request.urlopen(req) as r:
        status = r.status
        body = r.read().decode("utf-8") if r.length != 0 else ""
        return status, (json.loads(body) if (status == 200 and body) else None)

def _normalize_from_live(data: dict):
    """Make a compact, consistent shape we can store & return."""
    item   = data.get("item") or {}
    album  = item.get("album") or {}
    images = album.get("images") or []
    artists = item.get("artists") or []
    return {
        "device": (data.get("device") or {}).get("name"),
        "is_playing": bool(data.get("is_playing", False)),
        "progress_ms": data.get("progress_ms"),
        "item": {
            "id": item.get("id"),
            "name": item.get("name"),
            "duration_ms": item.get("duration_ms"),
            "artists": [{"name": a.get("name")} for a in artists if a],
            "album": {
                "name": album.get("name"),
                "images": images,  # [{url, width, height}, ...]
            },
        },
        "fetched_at": int(time.time() * 1000),
        "source": "live",
    }

def _normalize_from_cache(doc: dict):
    # Ensure shape matches live, but force paused
    doc = dict(doc)  # copy
    doc.pop("_id", None)
    doc["is_playing"] = False
    doc["source"] = "cache"
    return doc

def _save_latest(normalized: dict):
    col = _col()
    # Keep a single “latest” doc (or keep a rolling history if you prefer)
    col.create_index([("fetched_at", DESCENDING)], background=True)
    col.replace_one({"_id": "latest"}, {**normalized, "_id": "latest"}, upsert=True)

def _load_latest():
    col = _col()
    # read the singleton doc
    doc = col.find_one({"_id": "latest"})
    if doc:
        return _normalize_from_cache(doc)
    # fallback: if you had history instead of singleton
    doc = col.find_one({}, sort=[("fetched_at", DESCENDING)])
    return _normalize_from_cache(doc) if doc else None

class handler(BaseHTTPRequestHandler):
    def _send_json(self, code: int, obj):
        payload = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        # CORS (optional for local dev; remove if same-origin only)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,OPTIONS")
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self):
        self._send_json(200, {"ok": True})

    def do_GET(self):
        try:
            # 1) Try live Spotify
            token = _mint_access_token()
            status, live = _fetch_player(token)

            if status == 200 and live:
                out = _normalize_from_live(live)
                # Save as latest
                try:
                    _save_latest(out)
                except Exception as e:
                    # non-fatal if cache write fails
                    pass
                self._send_json(200, {"ok": True, **out})
                return

            if status == 204:
                # 2) No active session → fall back to cache
                cached = _load_latest()
                if cached:
                    self._send_json(200, {"ok": True, **cached})
                else:
                    self._send_json(200, {"ok": True, "is_playing": False, "note": "no cache"})
                return

            # Unexpected status
            self._send_json(status, {"ok": False, "error": f"spotify_status_{status}"})
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8") if e.fp else ""
            self._send_json(e.code, {"ok": False, "error": body or str(e)})
        except Exception as e:
            self._send_json(500, {"ok": False, "error": str(e)})