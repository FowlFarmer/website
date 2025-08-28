# api/spotify.py
import os, json, base64, urllib.parse, urllib.request
from http.server import BaseHTTPRequestHandler

TOKEN_URL = "https://accounts.spotify.com/api/token"
PLAYER_URL = "https://api.spotify.com/v1/me/player"

def _mint_access_token():
    cid  = os.environ["SPOTIFY_CLIENT_ID"]
    csec = os.environ["SPOTIFY_CLIENT_SECRET"]
    rtok = os.environ["SPOTIFY_REFRESH_TOKEN"]

    basic = base64.b64encode(f"{cid}:{csec}".encode()).decode()
    data = urllib.parse.urlencode({
        "grant_type": "refresh_token",
        "refresh_token": rtok
    }).encode()

    req = urllib.request.Request(
        TOKEN_URL, data=data,
        headers={
            "Authorization": f"Basic {basic}",
            "Content-Type": "application/x-www-form-urlencoded"
        }, method="POST"
    )
    with urllib.request.urlopen(req) as r:
        payload = json.loads(r.read().decode("utf-8"))
        return payload["access_token"]

def _get_player(access_token: str):
    req = urllib.request.Request(
        PLAYER_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        method="GET"
    )
    with urllib.request.urlopen(req) as r:
        status = r.status
        body = r.read().decode("utf-8") if r.length != 0 else ""
        return status, body

class handler(BaseHTTPRequestHandler):
    # GET /api/spotify
    def do_GET(self):
        try:
            token = _mint_access_token()
            status, body = _get_player(token)

            if status == 200:
                data = json.loads(body) if body else {}
                out = {
                    "ok": True,
                    "is_playing": data.get("is_playing", False),
                    "progress_ms": data.get("progress_ms"),
                    "shuffle_state": data.get("shuffle_state"),
                    "repeat_state": data.get("repeat_state"),
                    "device": data.get("device"),
                    "item": data.get("item"),
                    "context": data.get("context"),
                    "raw": data
                }
                self._send_json(200, out)
                return

            if status == 204:
                # No active device/session
                self._send_json(200, {"ok": True, "active": False, "raw": None})
                return

            # Unexpected non-2xx
            self._send_json(status, {"ok": False, "error": "unexpected_status"})
        except urllib.error.HTTPError as e:
            try:
                err_body = e.read().decode("utf-8")
            except Exception:
                err_body = ""
            self._send_json(e.code, {"ok": False, "error": err_body or str(e)})
        except Exception as e:
            self._send_json(500, {"ok": False, "error": str(e)})

    def _send_json(self, code: int, obj):
        payload = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)