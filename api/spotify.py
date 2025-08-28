# api/spotify.py
import os
import json
import base64
import requests

TOKEN_URL = "https://accounts.spotify.com/api/token"
PLAYER_URL = "https://api.spotify.com/v1/me/player"

def _json_response(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            # Add if you’ll call from other origins:
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

def _extract_image(item):
    # Tracks: item.album.images; Podcasts/episodes: item.images
    images = None
    if item is None:
        return None
    if "album" in item and item["album"] and "images" in item["album"]:
        images = item["album"]["images"]
    elif "images" in item:
        images = item["images"]
    if images and isinstance(images, list) and images:
        return images[0].get("url") or images[-1].get("url")
    return None

def handler(request):
    try:
        access_token = _mint_access_token()

        r = requests.get(
            PLAYER_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )

        # 204 = no active device / no content
        if r.status_code == 204:
            return _json_response(200, {
                "ok": True,
                "is_playing": False,
                "device_name": None,
                "title": None,
                "artists": None,
                "image": None,
                "progress_ms": 0,
                "duration_ms": 0,
            })

        if r.status_code == 200:
            data = r.json() or {}
            item = data.get("item")
            artists = None
            if item and "artists" in item and item["artists"]:
                artists = ", ".join(a.get("name", "") for a in item["artists"] if a)

            body = {
                "ok": True,
                "is_playing": bool(data.get("is_playing")),
                "device_name": (data.get("device") or {}).get("name"),
                "title": item.get("name") if item else None,
                "artists": artists,
                "image": _extract_image(item),
                "progress_ms": data.get("progress_ms") or 0,
                "duration_ms": (item or {}).get("duration_ms") or 0,
            }
            return _json_response(200, body)

        return _json_response(r.status_code, {"ok": False, "error": "unexpected_status", "body": r.text})

    except requests.HTTPError as e:
        resp = getattr(e, "response", None)
        return _json_response(resp.status_code if resp else 500, {"ok": False, "error": resp.text if resp else str(e)})
    except Exception as e:
        return _json_response(500, {"ok": False, "error": str(e)})