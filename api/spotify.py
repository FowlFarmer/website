# api/spotify.py
from http.server import BaseHTTPRequestHandler
import os, json, base64, requests

TOKEN_URL = "https://accounts.spotify.com/api/token"
PLAYER_URL = "https://api.spotify.com/v1/me/player"

def _mint_access_token():
    client_id = os.environ["SPOTIFY_CLIENT_ID"]
    client_secret = os.environ["SPOTIFY_CLIENT_SECRET"]
    refresh_token = os.environ["SPOTIFY_REFRESH_TOKEN"]

    basic = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    resp = requests.post(
        TOKEN_URL,
        data={"grant_type": "refresh_token", "refresh_token": refresh_token},
        headers={
            "Authorization": f"Basic {basic}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]

def _extract_image(item):
    if not item:
        return None
    if item.get("album") and item["album"].get("images"):
        imgs = item["album"]["images"]
    else:
        imgs = item.get("images")  # podcasts/episodes
    if isinstance(imgs, list) and imgs:
        return imgs[0].get("url") or imgs[-1].get("url")
    return None

def _ok_payload_from_player(data):
    item = data.get("item") or {}
    artists = ", ".join(a.get("name", "") for a in item.get("artists", []) if a) or None
    return {
        "ok": True,
        "is_playing": bool(data.get("is_playing")),
        "device_name": (data.get("device") or {}).get("name"),
        "title": item.get("name"),
        "artists": artists,
        "image": _extract_image(item),
        "progress_ms": data.get("progress_ms") or 0,
        "duration_ms": item.get("duration_ms") or 0,
    }

class handler(BaseHTTPRequestHandler):
    def _send_json(self, status: int, body: dict):
        raw = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(raw)))
        # If you will call from other origins, uncomment:
        # self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        try:
            token = _mint_access_token()
            r = requests.get(PLAYER_URL, headers={"Authorization": f"Bearer {token}"}, timeout=10)

            if r.status_code == 204:
                return self._send_json(200, {
                    "ok": True, "is_playing": False, "device_name": None,
                    "title": None, "artists": None, "image": None,
                    "progress_ms": 0, "duration_ms": 0
                })
            if r.status_code == 200:
                return self._send_json(200, _ok_payload_from_player(r.json() or {}))

            # Pass through unexpected statuses for easier debugging
            return self._send_json(r.status_code, {"ok": False, "error": "unexpected_status", "body": r.text})

        except requests.HTTPError as e:
            resp = getattr(e, "response", None)
            return self._send_json(resp.status_code if resp else 500, {
                "ok": False, "error": resp.text if resp else str(e)
            })
        except Exception as e:
            return self._send_json(500, {"ok": False, "error": str(e)})