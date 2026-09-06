# GALACTICA → Official Portal live bridge

The portal is ready to receive **real world state**, not just preview JSON.

## Push the whole public state

```bash
curl -X POST http://127.0.0.1:8787/api/world/state \
  -H 'Content-Type: application/json' \
  -d @/path/to/public-state.json
```

When the portal is exposed publicly, set a secret:

```bash
export GALACTICA_WORLD_TOKEN='change-this-to-a-long-random-secret'
python3 server.py
```

Then the world engine may push with:

```bash
curl -X POST https://portal.example/api/world/state \
  -H "Authorization: Bearer $GALACTICA_WORLD_TOKEN" \
  -H 'Content-Type: application/json' \
  -d @public-state.json
```

Every browser connected to `/api/stream` receives the new state immediately through **Server-Sent Events (SSE)**. Polling remains as a fallback.

## Resident arrival queue

Approved resident candidates are exposed to the world engine at:

```bash
curl http://127.0.0.1:8787/api/world/arrivals
```

Example item:

```json
{
  "id": "ARR-...",
  "callsign": "STARWALKER",
  "role": "RESIDENT-CANDIDATE",
  "language": "ja",
  "district": "STRATHAM VILLAGE",
  "introduction": "I want to live here and explore the colony.",
  "pass": "GQ-RES-...",
  "status": "approved"
}
```

After GALACTICA creates the resident / arrival event, acknowledge it:

```bash
curl -X POST http://127.0.0.1:8787/api/world/arrivals/ack \
  -H 'Content-Type: application/json' \
  -d '{"ids":["ARR-..."]}'
```

On a public host, add the same bearer token used for world-state pushes.

## Suggested canonical arrival event

The world engine can convert an approved request into something like:

```json
{
  "type": "resident_arrival",
  "canonical": true,
  "callsign": "STARWALKER",
  "arrival": "PORT ASTRIA",
  "origin": "PUBLIC GATE",
  "requestedDistrict": "STRATHAM VILLAGE"
}
```

This keeps the website as the **real-world immigration terminal**, while GALACTICA remains the authority that decides how the new resident materializes in canon.
