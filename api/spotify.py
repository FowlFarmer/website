# api/spotify.py
import os, json, base64, urllib.parse, urllib.request

TOKEN_URL = "https://accounts.spotify.com/api/token"
PLAYER_URL = "https://api.spotify.com/v1/me/player"   # player status; change if you want a different endpoint

def _json(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }

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

def handler(request):
    try:
        token = _mint_access_token()

        req = urllib.request.Request(
            PLAYER_URL,
            headers={"Authorization": f"Bearer {token}"},
            method="GET"
        )

        try:
            with urllib.request.urlopen(req) as r:
                if r.status == 200:
                    data = json.loads(r.read().decode("utf-8"))
                    return _json(200, {"ok": True, "raw": data})
                if r.status == 204:
                    return _json(200, {"ok": True, "raw": None})
                return _json(r.status, {"ok": False, "error": "unexpected_status"})
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8") if e.fp else ""
            return _json(e.code, {"ok": False, "error": body or str(e)})
    except Exception as e:
        return _json(500, {"ok": False, "error": str(e)})