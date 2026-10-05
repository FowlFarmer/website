# Site analytics

Our own copy of Vercel Web Analytics, kept forever: Hobby only keeps 31 days. It runs
alongside Vercel's `<Analytics />`, which stays in place.

The dashboard is at **[tzhu.dev/analytics](https://tzhu.dev/analytics)**. It isn't linked
anywhere and is marked `noindex`, but it isn't password-protected: anyone with the URL can
see it.

## Where the numbers come from

The dashboard adds up two sources, one day at a time:

| Source | Covers | Lives in |
| --- | --- | --- |
| Vercel import | Before 2026-09-30 (as far back as Vercel had: 2026-09-04 on Hobby) | `api/_vercel-import.json` |
| Tracker | 2026-09-30 on | MongoDB, the `analytics` collection (`MONGODB_ANALYTICS_COLLECTION`) |

The two never overlap. The import script stops before `TRACKER_START` (2026-09-30), the
tracker's first full day. The tracker went live late on 2026-09-29, so that day comes from
Vercel. The tracker wins from then on: it counts more views, because ad blockers stop
Vercel's script but not ours (262 vs 201 on 2026-09-30), and it records city and UTM source,
which Vercel doesn't offer. As a safety net, if a day ever is in the import file, the
dashboard uses the import for that day and ignores Mongo, so no day is counted twice.

### Tracker

- `src/persistentAnalytics.js` sends one page view per route change. It's off in
  development, skips `/` (it redirects to `/self`) and `/analytics`, and only sends the
  referrer on the first view.
- `api/track.py` `POST` drops bots and stores one Mongo document per view: time, path,
  referrer and its host, UTM tags, country/region/city (from Vercel's `x-vercel-ip-*`
  headers), device, browser, OS, screen width, the raw user agent, and anonymous visitor and
  session ids (`pa_visitor` in localStorage, `pa_session` in sessionStorage). IP addresses
  aren't stored.
- It has its own collection because `api/spotify.py` deletes everything in
  `MONGODB_COLLECTION` except its newest snapshot.
- `GET /api/track?days=N` (`0` = all time) returns totals, a daily series and the top 10 of
  each list, sorted by visitors. A range is whole UTC days, today included. Only aggregates
  leave the database, never visitor ids or user agents.

### Vercel import

`api/_vercel-import.json` holds one entry per UTC day, with nothing summed across days:

```json
{
  "days": {
    "2026-09-29": {
      "views": 23,
      "visitors": 4,
      "pages": { "/self": { "views": 11, "visitors": 4 } },
      "referrers": { "com.google.android.googlequicksearchbox": { "views": 3, "visitors": 1 } },
      "countries": { "US": { "views": 23, "visitors": 4 } },
      "devices": { "desktop": { "views": 13, "visitors": 3 } },
      "browsers": { "Chrome": { "views": 13, "visitors": 3 } },
      "os": { "macOS": { "views": 13, "visitors": 3 } }
    }
  }
}
```

Storing every day separately is what lets imports be layered. A later pull of the full
12-month history replaces exactly the days it covers and leaves the rest alone, and any
range on the dashboard is a plain sum of its days. Nothing in the file is a lifetime total
that would have to be pulled back apart.

The file starts with `_` so Vercel doesn't treat it as a function, and it ships with the
Python function because `api/` isn't in `vercel.json`'s `excludeFiles`.

Vercel doesn't expose city or UTM source, so imported days have none. Browser and OS names
are renamed to match the tracker's (`Mobile Safari` → `Safari`, `Mac` → `macOS`). In-app
browsers like `Instagram App` keep Vercel's name.

## Adding or updating imported history

Needs the Vercel CLI, logged in, with the checkout linked to the `website` project
(`vercel link`; a worktree needs its own link or a copy of `.vercel/`).

```bash
python3 scripts/analytics/import-vercel-analytics.py              # last 31 days (the Hobby limit)
python3 scripts/analytics/import-vercel-analytics.py --days 365   # 12 months, needs Pro
```

The script:

1. Pulls each full UTC day in the window, stopping before today or `TRACKER_START`,
   whichever comes first. It uses `vercel metrics vercel.analytics_pageview.count --prod -g 1d`,
   with two queries per list: views, and unique visitors.
2. Merges the result into `api/_vercel-import.json`. Pulled days replace the same days in the
   file, and every other day is kept.
3. Prints how many days it pulled and the file's new totals.

Then commit `api/_vercel-import.json` and push to `devel`. Vercel redeploys and the dashboard
picks the new file up.

Running it again is always safe: re-pulling a day just writes the same numbers back.

### Getting older history (Pro)

On Hobby the import reaches back only to 2026-09-04. After upgrading to Pro:

```bash
python3 scripts/analytics/import-vercel-analytics.py --days 365
```

That fills in everything Vercel kept from the last 12 months, up to 2026-09-29. Days already
in the file are replaced with the same Vercel numbers, so nothing is double counted. You can
downgrade again afterwards: the history stays in the file. On Hobby there's nothing more to
import: the tracker covers every day from 2026-09-30.

## How visitors are counted

- **Imported days:** Vercel's visitor id resets every day, so its visitor numbers are really
  visitor-days. That's also how Vercel's own dashboard adds them up: the sum of daily
  visitors equals its 30-day total. The same goes for each list row.
- **Tracked days:** the visitor id lasts as long as the browser's localStorage. Within the
  tracked days of a range, a returning visitor is counted once.

So in a range that spans both sources, the visitor total is the tracked unique visitors
plus the imported visitor-days.
