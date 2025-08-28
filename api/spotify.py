# api/spotify.py
import os, json, base64, urllib.parse, urllib.request, time, traceback
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

from pymongo import MongoClient

TOKEN_URL  = "https://accounts.spotify.com/api/token"
PLAYER_URL = "https://api.spotify.com/v1/me/player"

# --- Simple logger helpers (stdout) ---
def log(msg, **kv):
    stamp = int(time.time() * 1000)
    if kv:
        print(f"[spotify-fn] {stamp} | {msg} | {json.dumps(kv)}", flush=True)
    else:
        print(f"[spotify-fn] {stamp} | {msg}", flush=True)

# --- Mongo (global client reused on warm invocations) ---
_client = None
def _get_collection():
    uri  = os.environ.get("MONGODB_URI")
    dbn  = os.environ.get("MONGODB_DB")
    coln = os.environ.get("MONGODB_COLLECTION")
    have_mongo = bool(uri and dbn and coln)
    log("mongo.config", have=have_mongo, db=dbn, col=coln if coln else None)

    if not have_mongo:
        return None, None

    global _client
    if _client is None:
        t0 = time.time()
        _client = MongoClient(uri, connectTimeoutMS=5000)
        log("mongo.client.created", ms=int((time.time() - t0) * 1000))
    db = _client[dbn]
    col = db[coln]
    return db, col

def _cache_save(doc: dict):
    """Insert new snapshot, then delete ALL previous docs."""
    _, col = _get_collection()
    if col is None:
        log("cache.save.skipped", reason="no_collection")
        return
    try:
        # best-effort index (created once)
        col.create_index([("_id", -1)], background=True)
    except Exception as e:
        log("cache.index.warn", err=str(e))

    try:
        res = col.insert_one(doc)
        new_id = res.inserted_id
        log("cache.save.ok", id=str(new_id))

        # prune: delete everything except the newly inserted doc
        try:
            result = col.delete_many({"_id": {"$ne": new_id}})
            log("cache.prune.ok", deleted=result.deleted_count)
        except Exception as pe:
            log("cache.prune.err", err=str(pe))
    except Exception as e:
        log("cache.save.err", err=str(e))

def _cache_latest():
    _, col = _get_collection()
    if col is None:
        log("cache.latest.skipped", reason="no_collection")
        return None
    try:
        doc = col.find_one({}, sort=[("_id", -1)])
        log("cache.latest.result", found=bool(doc))
        return doc
    except Exception as e:
        log("cache.latest.err", err=str(e))
        return None

# --- Spotify helpers ---
def _mint_access_token():
    cid  = os.environ["SPOTIFY_CLIENT_ID"]
    csec = os.environ["SPOTIFY_CLIENT_SECRET"]
    rtok = os.environ["SPOTIFY_REFRESH_TOKEN"]

    basic = base64.b64encode(f"{cid}:{csec}".encode()).decode()
    data = urllib.parse.urlencode({
        "grant_type": "refresh_token",
        "refresh_token": rtok
    }).encode()

    t0 = time.time()
    req = urllib.request.Request(
        TOKEN_URL, data=data,
        headers={
            "Authorization": f"Basic {basic}",
            "Content-Type": "application/x-www-form-urlencoded"
        }, method="POST"
    )
    log("spotify.token.request")
    with urllib.request.urlopen(req) as r:
        raw = r.read()
        ms = int((time.time() - t0) * 1000)
        log("spotify.token.response", status=r.status, bytes=len(raw), ms=ms)
        payload = json.loads(raw.decode("utf-8"))
        return payload["access_token"]

def _get_player(access_token: str):
    req = urllib.request.Request(
        PLAYER_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        method="GET"
    )
    t0 = time.time()
    log("spotify.player.request")
    with urllib.request.urlopen(req) as r:
        raw = r.read()
        ms = int((time.time() - t0) * 1000)
        body = raw.decode("utf-8") if raw else ""
        log("spotify.player.response", status=r.status, bytes=len(raw), ms=ms)
        return r.status, body

class handler(BaseHTTPRequestHandler):
    # GET /api/spotify[?debug=1]
    def do_GET(self):
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query or "")
        want_debug = qs.get("debug", ["0"])[0] in ("1", "true", "yes")
        log("request.start", path=parsed.path, query=parsed.query, debug=want_debug)

        try:
            token = _mint_access_token()
            status, body = _get_player(token)

            if status == 200:
                data = json.loads(body) if body else {}
                out = {
                    "ok": True,
                    "source": "live",
                    "is_playing": data.get("is_playing", False),
                    "progress_ms": data.get("progress_ms"),
                    "shuffle_state": data.get("shuffle_state"),
                    "repeat_state": data.get("repeat_state"),
                    "device": data.get("device"),
                    "item": data.get("item"),
                    "context": data.get("context"),
                    "raw": data
                }
                log("branch.live", is_playing=bool(out["is_playing"]),
                    have_item=bool(out["item"]), progress_ms=out["progress_ms"])

                # Save to cache (only if we have an item), then prune others
                try:
                    if out["item"]:
                        snapshot = {
                            "ts": int(time.time() * 1000),
                            "is_playing": out["is_playing"],
                            "progress_ms": out["progress_ms"],
                            "device": out["device"],
                            "item": out["item"],
                            "context": out["context"],
                        }
                        _cache_save(snapshot)
                except Exception as ce:
                    log("cache.save.exception", err=str(ce))

                if want_debug:
                    out["debug"] = {"branch": "live", "status": status}
                self._send_json(200, out)
                return

            if status == 204:
                log("branch.no_active_device", status=status)
                cached = _cache_latest()
                if cached:
                    # Synthesize a paused player payload identical in shape to live /me/player
                    raw_like = {
                        "device": cached.get("device"),
                        "repeat_state": None,
                        "shuffle_state": None,
                        "context": cached.get("context"),
                        "timestamp": int(time.time() * 1000),
                        "progress_ms": cached.get("progress_ms", 0),
                        "item": cached.get("item"),
                        "currently_playing_type": "track",  # or derive from item if you store episodes, etc.
                        "is_playing": False,                # paused
                        "actions": {"disallows": {}}        # minimal stub
                    }

                    out = {
                        "ok": True,
                        # keep for debugging; delete this line if you want it truly indistinguishable
                        "source": "cache",
                        # top-level fields identical to live branch:
                        "is_playing": False,
                        "progress_ms": raw_like["progress_ms"],
                        "shuffle_state": raw_like["shuffle_state"],
                        "repeat_state": raw_like["repeat_state"],
                        "device": raw_like["device"],
                        "item": raw_like["item"],
                        "context": raw_like["context"],
                        "raw": raw_like
                    }
                    log("cache.return", progress_ms=out["progress_ms"], have_item=bool(out["item"]))
                    if want_debug:
                        out["debug"] = {"branch": "cache", "status": status}
                    self._send_json(200, out)
                else:
                    log("cache.empty_fallback")
                    # nothing to return; this case matches your original "inactive" shape
                    out = {"ok": True, "active": False, "raw": None}
                    if want_debug:
                        out["debug"] = {"branch": "empty", "status": status}
                    self._send_json(200, out)
                return

            log("branch.unexpected_status", status=status)
            self._send_json(status, {"ok": False, "error": "unexpected_status"})
        except urllib.error.HTTPError as e:
            try:
                err_body = e.read().decode("utf-8")
            except Exception:
                err_body = ""
            log("http.error", status=e.code, error=err_body or str(e))
            self._send_json(e.code, {"ok": False, "error": err_body or str(e)})
        except Exception as e:
            log("handler.exception", error=str(e), trace=traceback.format_exc())
            self._send_json(500, {"ok": False, "error": str(e)})

    def _send_json(self, code: int, obj):
        payload = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        # self.send_header("Access-Control-Allow-Origin", "*")  # enable if needed
        self.end_headers()
        self.wfile.write(payload)
        log("response.sent", status=code, bytes=len(payload))