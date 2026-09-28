# Avalon: a personal archive

## Experience

`/avalon` is a standalone celestial archive. Three original procedural Three.js artifacts represent Quests (a sword and astrolabe), Memories (an orbiting crystal), and Journals (an open book and nib). The entrance uses semantic HTML buttons over the decorative canvas; it remains navigable if WebGL is unavailable. The rest of the site keeps its original background and navigation.

Collections use `?collection=quests`, `?collection=memories`, or `?collection=journals`. These URLs support direct entry, refresh, and browser history. The archive restores focus to the destination button when returning from a collection. Photo dialogs use the native modal focus trap, Escape to close, left/right arrows, and restore focus to the selected thumbnail.

Quests support multiple questlines, task completion, filtering, and per-device persistence under `avalon-quest-progress-v1`. Keys are `questId:taskId`; only the boolean `true` counts as completed. Failure to persist is reported. This is a personal local preview of progress, not a shared, authenticated task database. The Anime Expo seed is explicitly a draft example; it is not a claim that an event was booked or attended.

Memories initially uses six existing public portfolio photos. Titles are editorial labels, not inferred dates or locations. Journals retains the existing article and its original date/text from `avalonPosts.js`.

## Content boundaries

- `src/data/avalonArchive.js`: version, questlines, memories. Stable IDs permit agent updates without losing task associations.
- `src/data/avalonPosts.js`: existing writing, unaltered.
- `src/components/Avalon.jsx`: collection UI and local progress.
- `src/components/avalon/ArchiveScene.jsx`: procedural geometry, animation, lighting, disposal.
- `src/components/avalon/Avalon.css`: route-scoped visual system.

Questline fields: `id`, `title`, `category`, `status` (`draft` initially), `summary`, `description`, `tasks`. Each task has an `id`, `title`, `note`, and `phase`.

Memory fields: `id`, `src` (published asset), `title`, `collection`, and `alt`.

Journal fields: `slug`, `title`, `date` (`YYYY-MM-DD`), `excerpt`, and `paragraphs`.

## Future daily agent (not connected or scheduled yet)

The intended flow is a private source adapter → draft ingestion → selected/published content manifest → this read-only public UI. There is currently no Apple Photos, iCloud, Google Photos, OAuth, background scheduler, or server write endpoint in this implementation.

Before connecting real accounts:

1. Choose the photo source and establish an authorized ingestion mechanism appropriate to its current API. A local macOS Photos export pipeline and a cloud provider integration have different access/runtime requirements; do not assume either can enumerate all photos automatically.
2. Keep credentials and source libraries outside the public client bundle. New photos should enter a private staging area until a deliberate album/rule selects them for publication. Strip location metadata from public derivatives unless intentionally retained.
3. Deduplicate using provider IDs/content hashes, preserve manual edits, produce optimized thumbnails/full images, and record provenance plus import timestamps. Do not fabricate dates, locations, or journal entries.
4. Store questlines and task state in an authenticated persistent service. Separate the owner's canonical progress from anonymous visitor/device state; do not use public localStorage as the automation's source of truth.
5. Run a scheduled backend job with idempotent upserts, bounded retries, import logs, and an explicit publication policy. Archive removed quests rather than silently destroying their history.
6. Validate the manifest schema and referenced assets before publishing; retain the last valid revision and a rollback path if sync fails. Surface real sync status only when connected.

The current versioned data module is the replaceable frontend content boundary. It can later be replaced with a validated JSON/API response without changing the collection designs. The renderer accepts additional questlines and photo collections; expand the filter source for additional photo collections as needed.

## Rendering and performance

The archive and Three.js scene are lazy loaded. The original Sakura renderer is unmounted on the Avalon route so the two scenes do not compete. Pixel ratio is capped at 1.5, stars are a single points draw call, and models use no downloaded textures or external assets. Animation pauses when the document is hidden; the Still scene control and reduced-motion preference stop continuous rendering. ResizeObserver updates the orthographic camera. The effect disposes geometry, materials, listeners, and renderer on unmount. A WebGL creation/context failure falls back to matching SVG sigils.

Run `npm run build` for production compilation and the existing scene snapshot checks. Visually check landing and each collection at mobile/tablet/desktop sizes. Check task save/reload/undo, quest filters, photo filtering/navigation/Escape, the journal text, route back/forward, and the return link to the main site.
