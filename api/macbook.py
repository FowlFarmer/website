# api/telemetry.py
import os, json, time, traceback
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

from pymongo import MongoClient
from bson import ObjectId

# --- Simple logger (stdout) ---
def log(msg, **kv):
    stamp = int(time.time() * 1000)
    if kv:
        print(f"[telemetry-fn] {stamp} | {msg} | {json.dumps(kv)}", flush=True)
    else:
        print(f"[telemetry-fn] {stamp} | {msg}", flush=True)

# --- Mongo (global client reused on warm invocations) ---
_client = None
def _get_collection():
    uri  = os.environ.get("MONGODB_URI")
    dbn  = os.environ.get("MONGO_MACBOOK_DB")
    coln = os.environ.get("MONGO_MACBOOK_COLLECTION")
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

def _bson_clean(o):
    """Make Mongo docs safe for JSON (ObjectId -> str)."""
    if isinstance(o, dict):
        return {k: _bson_clean(v) for k, v in o.items()}
    if isinstance(o, list):
        return [_bson_clean(v) for v in o]
    if isinstance(o, ObjectId):
        return str(o)
    return o

def _get_latest(doc_id: str | None):
    """
    If doc_id is provided, try that first (e.g., 'current').
    Otherwise return the most recent document by _id.
    """
    _, col = _get_collection()
    if col is None:
        log("read.skipped", reason="no_collection")
        return None

    try:
        if doc_id:
            doc = col.find_one({"_id": doc_id})
            if doc:
                log("read.by_id.hit", id=doc_id)
                return doc
            log("read.by_id.miss", id=doc_id)

        # Fallback: latest document (works if you store history instead of single rolling doc)
        doc = col.find_one({}, sort=[("_id", -1)])
        log("read.latest", found=bool(doc))
        return doc
    except Exception as e:
        log("read.err", err=str(e))
        return None

class handler(BaseHTTPRequestHandler):
    # GET /api/telemetry[?debug=1][&doc_id=current]
    def do_GET(self):
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query or "")
        want_debug = qs.get("debug", ["0"])[0] in ("1", "true", "yes")
        doc_id = qs.get("doc_id", [None])[0]  # default None; pass 'current' to target rolling doc

        log("request.start", path=parsed.path, query=parsed.query, debug=want_debug, doc_id=doc_id)

        try:
            doc = _get_latest(doc_id)
            if not doc:
                out = {"ok": True, "found": False, "doc": None}
                if want_debug:
                    out["debug"] = {"reason": "not_found"}
                self._send_json(200, out)
                return

            # Clean BSON types for JSON response
            safe = _bson_clean(doc)

            out = {
                "ok": True,
                "found": True,
                "doc": safe,
                # convenience: lift a few common fields (optional)
                "battery_percent": safe.get("battery", {}).get("percent"),
                "location": safe.get("location"),
                "timestamp": safe.get("timestamp"),
                "source": "mongo"
            }
            self._send_json(200, out)
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