import os
import json
import base64
import requests

TOKEN_URL = "https://accounts.spotify.com/api/token"
NOW_PLAYING_URL = "https://api.spotify.com/v1/me/player/currently-playing"

def _json_response(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            # Add CORS if calling from other origins:
            # "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-store",
        },
        "body": json.dumps(body),
    }

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

def handler(request):
    try:
        access_token = _mint_access_token()

        r = requests.get(
            NOW_PLAYING_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )

        if r.status_code == 200:
            data = r.json()
            return _json_response(200, {
                "ok": True,
                "is_playing": bool(data.get("is_playing")),
                "data": data,
            })
        if r.status_code == 204:
            return _json_response(200, {"ok": True, "is_playing": False, "data": None})

        # Pass through unexpected status
        return _json_response(r.status_code, {"ok": False, "error": "unexpected_status"})

    except requests.HTTPError as e:
        # r may be attached with more details
        resp = getattr(e, "response", None)
        body = resp.text if resp is not None else str(e)
        return _json_response(resp.status_code if resp else 500, {"ok": False, "error": body})
    except Exception as e:
        return _json_response(500, {"ok": False, "error": str(e)})