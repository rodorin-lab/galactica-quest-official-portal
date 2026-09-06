# GALACTICA QUEST // Official Living Portal v3

The public **real-world airlock** for GALACTICA QUEST / GENESIS COLONY 534.

v3 upgrades the portal from a dynamic preview into a **realtime world bridge + resident immigration gate**.

## v3 highlights

- **Realtime world state with Server-Sent Events (SSE)**. The page updates immediately when GALACTICA publishes a new state.
- Polling remains as an automatic fallback when a proxy drops SSE.
- `POST /api/world/state` lets the real world engine push live state directly into the portal.
- Optional `bridge/state_relay.py` watches an existing GALACTICA JSON file and relays every change.
- The existing lightweight procedural GALACTICA background and optional LIVE MIRROR stay intact.
- **Real Resident Candidate applications** now come from the official website, not only a browser-local fake pass.
- Applications are stored in SQLite (`data/colony-gate.db`).
- Local operator review with `resident_admin.py`.
- Approved residents become a world-engine arrival queue at `/api/world/arrivals`.
- `bridge/world_gate_adapter.py` can automatically materialize approved residents as canonical arrival-event JSON files.
- Existing languages remain supported: English, 日本語, Deutsch, Français, Español, Italiano, Português, Nederlands, Polski.

## Start the portal

```bash
cd galactica-quest-official-portal-v3
python3 server.py
```

Open:

```text
http://127.0.0.1:8787
```

Health check:

```bash
curl http://127.0.0.1:8787/api/health
```

## Make the actual GALACTICA world update the site in realtime

### Option A: GALACTICA already writes a JSON state file

Keep the world unchanged and point the portal at that file:

```bash
GALACTICA_STATE_PATH=/path/to/galactica-public-state.json python3 server.py
```

Every browser receives file changes through SSE.

### Option B: push state from the world engine

```bash
curl -X POST http://127.0.0.1:8787/api/world/state \
  -H 'Content-Type: application/json' \
  -d @public-state.json
```

Or:

```bash
python3 tools/publish_state.py public-state.json
```

### Option C: relay an existing state file into a separate portal process

```bash
python3 bridge/state_relay.py /path/to/galactica-public-state.json
```

This means the game, Ghostwire, REX, GRAM or another world process only needs to keep one public JSON snapshot updated.

## Public state schema

A typical state:

```json
{
  "status": "online",
  "phase": "GENESIS DAWN",
  "worldAge": "DAY 001",
  "locationCount": 544,
  "activeResidents": 4,
  "ticker": "STRATHAM VILLAGE // WORLD CONTINUES",
  "residents": [],
  "chronicle": [],
  "atlasNodes": []
}
```

The page immediately updates resident cards, WORLD PULSE, telemetry, Chronicle and the public ATLAS.

## Can people become residents from the official website?

**Yes. v3 contains the actual participation pipeline.**

The public gate has three modes:

- `OBSERVER` → receives a pass and can enter immediately.
- `EXPLORER` → receives a pass and can enter immediately.
- `RESIDENT-CANDIDATE` → fills in language, desired district and an arrival message. The request is saved server-side and enters the colony review queue.

The browser can later check the same resident application status.

### Review resident candidates

```bash
python3 resident_admin.py list --status pending
python3 resident_admin.py approve ARR-XXXXXXXXXXXX
python3 resident_admin.py reject ARR-XXXXXXXXXXXX
```

Default mode is human review.

For a private test where every Resident Candidate is instantly accepted:

```bash
GALACTICA_JOIN_MODE=auto python3 server.py
```

## Turn an approved website user into an in-world arrival

Run the gate adapter:

```bash
python3 bridge/world_gate_adapter.py \
  --inbox /path/to/galactica/world-arrival-inbox
```

An approved candidate becomes a file like:

```text
resident_arrival_ARR-XXXXXXXXXXXX.json
```

with a canonical event payload containing callsign, preferred district, language, introduction and pass.

GALACTICA can consume that file and decide the actual arrival scene, for example:

```text
PUBLIC GATE
  ↓
PORT ASTRIA
  ↓
immigration / first contact event
  ↓
resident identity created
  ↓
CHRONICLE entry
  ↓
ATLAS / RESIDENTS update
```

After consumption, the adapter acknowledges the arrival so it is not imported twice.

See `bridge/GALACTICA_INTEGRATION.md` for the API contract.

## Secure public deployment

Localhost world writes are accepted automatically for development. For a Cloudflare/public deployment, set a world secret:

```bash
export GALACTICA_WORLD_TOKEN='use-a-long-random-secret-here'
python3 server.py
```

World state / arrival queue requests from outside localhost must then send:

```text
Authorization: Bearer <GALACTICA_WORLD_TOKEN>
```

Do not expose the token in browser JavaScript. Only the local world engine / bridge should know it.

## Test the realtime link

Terminal 1:

```bash
python3 server.py
```

Terminal 2:

```bash
python3 tools/simulate_world.py
```

Keep the portal open. WORLD PULSE, DAY, node count, residents and Chronicle will change live without reloading the page.

## Live-world URL

Edit `config.js`:

```js
liveWorldUrl: "https://YOUR-LIVE-WORLD.example/",
statusPingUrl: "https://YOUR-LIVE-WORLD.example/",
```

The real world remains lazy-loaded by LIVE MIRROR / WATCH LIVE, so the portal stays light.

## Core philosophy

- **THIS IS NOT A GAME YOU START. IT IS A WORLD YOU VISIT.**
- **NPCs do not reset when you close the game.**
- **A WORLD THAT CONTINUES WITHOUT YOU.**
- **THE OFFICIAL SITE IS NOT A LANDING PAGE. IT IS THE COLONY'S AIRLOCK.**
