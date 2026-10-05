"""Merge Vercel Web Analytics history into api/_vercel-import.json.

/api/track's summary adds these days to what the tracker has stored in MongoDB. Everything
is kept per day (views, visitors and each top list), so pulls layer: a newer pull replaces
only the days it covers, every other day is kept, and any dashboard range is a plain sum of
its days. Days from TRACKER_START on are never imported: the tracker has them, with more
views (ad blockers stop Vercel's script) plus city and UTM data. See docs/analytics.md.

    python3 scripts/analytics/import-vercel-analytics.py              # last 31 days (Hobby)
    python3 scripts/analytics/import-vercel-analytics.py --days 365   # 12 months (Pro)

Needs the Vercel CLI, logged in and linked to the project (`vercel link`).
"""

import argparse
import json
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path

# The tracker's first full UTC day. It went live late on 2026-09-29.
TRACKER_START = "2026-09-30"
METRIC = "vercel.analytics_pageview.count"
VIEWS = "vercel_analytics_pageview_count_sum"
VISITORS = "vercel_analytics_pageview_count_unique_visitor_id"
# Dashboard list -> Vercel dimension. Vercel doesn't expose city or UTM source.
LISTS = {
    "pages": "request_path",
    "referrers": "referrer_hostname",
    "countries": "country",
    "devices": "device_type",
    "browsers": "browser_name",
    "os": "os_name",
}
# Vercel's names -> the ones api/track.py records, so the same browser or OS lands in one row.
# Names with no equivalent (in-app browsers like "Instagram App") are kept as they are.
RENAME = {
    "browsers": {
        "Mobile Safari": "Safari",
        "Chrome Mobile": "Chrome",
        "Chrome Mobile iOS": "Chrome",
        "Microsoft Edge": "Edge",
        "Firefox Mobile": "Firefox",
        "Firefox Mobile iOS": "Firefox",
        "Samsung Browser": "Samsung Internet",
    },
    "os": {"Mac": "macOS", "GNU/Linux": "Linux", "Ubuntu": "Linux", "Chrome OS": "ChromeOS"},
}
# Per day and list; comfortably above what a day of this site has.
LIST_LIMIT = 50
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "api" / "_vercel-import.json"


def query(since, until, *args):
    result = subprocess.run(
        ["vercel", "metrics", METRIC, "--prod", "-s", since, "-u", until, "-g", "1d", "-F", "json", *args],
        capture_output=True, text=True, cwd=ROOT,
    )
    text = result.stdout + result.stderr
    if "{" not in text:
        raise SystemExit(text.strip())
    data, _ = json.JSONDecoder().raw_decode(text[text.index("{"):])
    if "error" in data:
        raise SystemExit(data["error"]["message"])
    return data["data"]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=31)
    count = parser.parse_args().days

    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    until = min(today, datetime.fromisoformat(TRACKER_START).replace(tzinfo=timezone.utc))
    since = today - timedelta(days=count)
    if since >= until:
        raise SystemExit(f"Nothing to pull: the window starts on or after {TRACKER_START}.")
    since, until = since.isoformat(), until.isoformat()

    pulled = {}
    day_of = lambda row: pulled.setdefault(row["timestamp"][:10], {"views": 0, "visitors": 0})
    for row in query(since, until):
        day_of(row)["views"] = row.get(VIEWS) or 0
    for row in query(since, until, "-a", "unique/visitor_id"):
        day_of(row)["visitors"] = row.get(VISITORS) or 0
    for name, dimension in LISTS.items():
        for field, value, args in (("views", VIEWS, ()), ("visitors", VISITORS, ("-a", "unique/visitor_id"))):
            for row in query(since, until, "--group-by", dimension, "-l", str(LIST_LIMIT), *args):
                if row.get(dimension) in (None, "") or not row.get(value):
                    continue
                key = RENAME.get(name, {}).get(str(row[dimension]), str(row[dimension]))
                entry = day_of(row).setdefault(name, {}).setdefault(key, {"views": 0, "visitors": 0})
                entry[field] += row[value]
    pulled = {day: data for day, data in pulled.items() if data["views"]}

    existing = json.loads(OUT.read_text()).get("days", {}) if OUT.exists() else {}
    days = dict(sorted({**existing, **pulled}.items()))
    OUT.write_text(json.dumps({
        "source": "Vercel Web Analytics (production), merged per day by scripts/analytics/import-vercel-analytics.py",
        "days": days,
    }, indent=1) + "\n")
    print(f"Pulled {len(pulled)} days ({since[:10]} to before {until[:10]}); "
          f"file now has {len(days)} days, {sum(d['views'] for d in days.values())} views")


if __name__ == "__main__":
    main()
