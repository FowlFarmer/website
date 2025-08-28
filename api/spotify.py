# api/now-playing.py
import os
import json
import base64
import urllib.parse
import urllib.request

TOKEN_URL = "https://accounts.spotify.com/api/token"
NOW_PLAYING_URL = "https://api.spotify.com/v1/me/player/currently-playing"

def _json_response(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            # same-origin from your Vercel site → no CORS header needed
            # add below if you’ll call from other origins:
            # "Access-Control-Allow-Origin": "*"
        },
        "body": json.dumps(body),
    }

def _mint_access_token():
    client_id = os.environ["SPOTIFY_CLIENT_ID"]
    client_secret = os.environ["SPOTIFY_CLIENT_SECRET"]
    refresh_token = os.environ["SPOTIFY_REFRESH_TOKEN"]

    basic = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()

    data = urllib.parse.urlencode({
        "grant_type": "refresh_token",
        "refresh_token": refresh_token
    }).encode()

    req = urllib.request.Request(
        TOKEN_URL,
        data=data,
        headers={
            "Authorization": f"Basic {basic}",
            "Content-Type": "application/x-www-form-urlencoded"
        },
        method="POST",
    )
    with urllib.request.urlopen(req) as r:
        payload = json.loads(r.read().decode("utf-8"))
        # returns: { access_token, expires_in, token_type, scope, ... }
        return payload["access_token"]

def handler(request):
    try:
        # 1) get a fresh access token
        access_token = _mint_access_token()

        # 2) use it to fetch "currently playing"
        req = urllib.request.Request(
            NOW_PLAYING_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            method="GET",
        )

        try:
            with urllib.request.urlopen(req) as r:
                # 200 OK → body contains JSON for the current track
                if r.status == 200:
                    data = json.loads(r.read().decode("utf-8"))
                    return _json_response(200, {
                        "ok": True,
                        "is_playing": bool(data.get("is_playing")),
                        "data": data
                    })
                # 204 No Content → nothing currently playing
                if r.status == 204:
                    return _json_response(200, {
                        "ok": True,
                        "is_playing": False,
                        "data": None
                    })
                # unexpected but pass through
                return _json_response(r.status, {"ok": False, "error": "unexpected_status"})
        except urllib.error.HTTPError as e:
            # e.code: 401, 403, etc. Bubble message
            body = e.read().decode("utf-8") if e.fp else ""
            return _json_response(e.code, {"ok": False, "error": body or str(e)})
    except Exception as e:
        return _json_response(500, {"ok": False, "error": str(e)})