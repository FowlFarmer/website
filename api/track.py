# api/track.py
# Stores every page view forever in MongoDB: the same things Vercel Analytics
# shows (page, referrer, UTM, country/region/city, device, browser, OS,
# visitors), minus its retention window.
import os, json, re, time, urllib.parse
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler

from pymongo import MongoClient, ASCENDING

BOT_RE = re.compile(r"bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|embedly|curl|wget|python-requests", re.I)

def log(msg, **kv):
    print(f"[track-fn] {int(time.time() * 1000)} | {msg} | {json.dumps(kv)}", flush=True)

# --- Mongo (global client reused on warm invocations) ---
# Own collection: api/spotify.py prunes everything in MONGODB_COLLECTION.
_col = None
def _collection():
    global _col
    if _col is None:
        uri = os.environ.get("MONGODB_URI")
        dbn = os.environ.get("MONGODB_DB")
        if not (uri and dbn):
            return None
        coln = os.environ.get("MONGODB_ANALYTICS_COLLECTION", "analytics")
        _col = MongoClient(uri, connectTimeoutMS=5000)[dbn][coln]
        try:
            _col.create_index([("ts", ASCENDING)], background=True)
            _col.create_index([("path", ASCENDING), ("ts", ASCENDING)], background=True)
        except Exception as e:
            log("index.warn", err=str(e))
    return _col

# --- User agent parsing (coarse, like Vercel's dashboard) ---
def _browser(ua):
    for name, pat in (("Edge", r"Edg/"), ("Opera", r"OPR/|Opera"), ("Samsung Internet", r"SamsungBrowser"),
                      ("Firefox", r"Firefox/|FxiOS"), ("Chrome", r"Chrome/|CriOS"), ("Safari", r"Safari/")):
        if re.search(pat, ua):
            return name
    return "Other"

def _os(ua):
    for name, pat in (("iOS", r"iPhone|iPad|iPod"), ("Android", r"Android"), ("Windows", r"Windows"),
                      ("macOS", r"Mac OS X|Macintosh"), ("ChromeOS", r"CrOS"), ("Linux", r"Linux")):
        if re.search(pat, ua):
            return name
    return "Other"

def _device(ua):
    if re.search(r"iPad|Tablet", ua) or (re.search(r"Android", ua) and not re.search(r"Mobile", ua)):
        return "tablet"
    if re.search(r"Mobi|iPhone|iPod|Android", ua):
        return "mobile"
    return "desktop"

def _referrer_host(ref, own_host):
    if not ref:
        return None
    host = urllib.parse.urlparse(ref).hostname
    if not host or host == own_host:
        return None
    return host[4:] if host.startswith("www.") else host

class handler(BaseHTTPRequestHandler):
    # POST /api/track  body: {path, query, referrer, visitor, session, width}
    def do_POST(self):
        try:
            ua = self.headers.get("user-agent", "")
            if not BOT_RE.search(ua):
                self._store(ua)
        except Exception as e:
            log("store.err", err=str(e))
        self.send_response(204)
        self.end_headers()

    def _store(self, ua):
        col = _collection()
        if col is None:
            log("store.skipped", reason="no_mongo")
            return
        length = min(int(self.headers.get("content-length") or 0), 8192)
        body = json.loads(self.rfile.read(length) or b"{}")

        query = urllib.parse.parse_qs(str(body.get("query") or "").lstrip("?"))
        utm = {k[4:]: v[0] for k, v in query.items() if k.startswith("utm_")}
        header = lambda name: urllib.parse.unquote(self.headers.get(name) or "") or None
        referrer = str(body.get("referrer") or "")[:1000] or None

        col.insert_one({
            "ts": datetime.now(timezone.utc),
            "path": str(body.get("path") or "/")[:500],
            "referrer": referrer,
            "referrer_host": _referrer_host(referrer, (self.headers.get("host") or "").split(":")[0]),
            "utm": utm or None,
            "visitor": str(body.get("visitor") or "")[:64] or None,
            "session": str(body.get("session") or "")[:64] or None,
            "country": header("x-vercel-ip-country"),
            "region": header("x-vercel-ip-country-region"),
            "city": header("x-vercel-ip-city"),
            "device": _device(ua),
            "browser": _browser(ua),
            "os": _os(ua),
            "width": body.get("width") if isinstance(body.get("width"), int) else None,
            "ua": ua[:500],
        })
