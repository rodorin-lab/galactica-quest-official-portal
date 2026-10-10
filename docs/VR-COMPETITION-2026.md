# GALACTICA First Contact — readiness audit (2026-10-10)

## Evidence and scope
Audited public baseline commit 8d8f265 (2026-09-07). No navigator.xr, immersive session, hand input, Three.js or AI conversation endpoint existed in the public baseline. The portal contains world-state GET/SSE, join applications and world arrival queues. Local Gentoo/Quest development was not accessible and is not represented by this audit.

## Prototype
Open `/xr/` on the same HTTPS origin as the portal. Self-hosted Three.js 0.180.0 (MIT notice in xr/vendor) renders a seated constellation. WebXR requires hand-tracking. Hand target-ray select activates three stars, reads resident snapshots, and exits through an in-world Depart panel. Desktop clicks provide a development preview. World-state and SSE are read-only; polling recovers from SSE failure. Static hosting remains playable with explicit world-disconnected status. No sample resident or generated conversation is substituted for live AI.

This is an early prototype, not a verified competition-ready build. It does not yet offer live AI dialogue, locomotion, MR, canonical world events, persistent constellation progress, or translated resident content. No existing server endpoints are changed.

## Eligibility / requirements
Official rules: https://start-developer-competition-26.devpost.com/rules
Announcement: https://developers.meta.com/blog/meta-connect-2026-vr-start-developer-competition/
- Deadline: 2026-11-18 12:00 PST = 2026-11-19 05:00 JST.
- Candidate track: Gaming (short seated interactive constellation / first contact).
- Candidate division: Adapted / Significantly Updated. Baseline predates September 24. Rules explicitly list new hand interactions as a significant update example; sponsor retains final discretion. Ship the completed update within the competition window.
- Hands end-to-end: implemented entry request, hand ray selection and in-world exit; Quest acceptance test outstanding.
- Start membership and developer account: unverified; representative must be a Start member by submission.
- Public HTTPS judging link: branch source is not a playable judging URL. Deploy `/xr/` and verify anonymous access. Static hosting does not run server.py; live resident data needs the existing Python backend behind the same origin.
- English: prototype UI is English; resident names/activity may be Japanese. Add verified English translations before submission.
- Video: less than three minutes, actual Quest or permitted simulator footage, publicly uploaded to YouTube/Vimeo. Not recorded.
- Performance: verify at least 60 fps on Quest; not measured.
- Availability: free judge access through winner announcement; freeze submitted build at deadline.
- Ownership/licensing, entrant eligibility and funding history: owner verification required.
- Rules section 3 disallows automated entries and entry made on another entrant's behalf. Prepare materials here; the authorized entrant must complete final Devpost submission personally.

## Quest acceptance test (controllers unpaired)
1. Enable hand tracking; open the deployed HTTPS `/xr/` with hands. Pinch Enter.
2. Confirm stereo scene, readable instruction, visible hand ray, comfortable seated reach.
3. Point/pinch all three stars with either hand; repeated selection must not double-count.
4. Select Resident Beacon; on backend hosting verify real resident fields and SSE world_state updates. Disconnect backend and verify explicit disconnection without fabricated AI reply.
5. Cover hands and restore tracking; ensure no accidental selections.
6. Pinch Depart, re-enter, use Quest system pause/resume and exit. Verify both hands and reconnecting input sources.
7. Record frame rate and test a cold launch with no controllers, anonymous browser and slow network.

## Next implementation
Connect the actual resident dialogue service through a server-side adapter after its real protocol is available. Keep tokens off clients. Add hand-selectable phrase prompts, verified English response text, busy/error states and world acknowledgement. Do not label scripted replies as live residents.

## Draft English Devpost description (not submitted)
GALACTICA First Contact turns the existing living-world portal into a seated, hands-first colony encounter. Visitors awaken a constellation using hand rays and pinch selection, inspect resident information published by the world engine, and depart without controllers. The new spatial mode builds on the portal's existing read-only world-state and SSE bridge. This prototype currently displays resident state; live AI conversation is not yet connected. Our next milestone is a verified Quest 3 build with resident dialogue, English content and recorded performance evidence. Target public prototype launch: November 2026, subject to hardware validation.

## 2:30 demo outline
0:00–0:20 cold launch and hand-only entry; 0:20–1:10 three star activations; 1:10–1:50 resident beacon and real world update; 1:50–2:15 disconnect/recovery honesty; 2:15–2:30 hand-only exit. Use actual device footage and English captions. Do not claim AI dialogue before it is connected.
