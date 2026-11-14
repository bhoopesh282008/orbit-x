# Space Mission Design Game — competitor scan & what ORBIT-X should borrow

Scan date: 2026-11-13. Source: GitHub search "space mission design game" (56 repositories).
Almost all are other teams' entries for the **same NASA Space Apps 2026 challenge**, and most have
no license. We take **ideas and patterns only — no code** (copying would be plagiarism and,
without a license, copyright infringement).

## The judging brief (official challenge text, summarised)

The game must let 1–4 players: define the objective → design spacecraft + payload → pick launcher
and orbit → manage **mass, power, budget, data, comms, time** → simulate → evaluate. It should reward
mission performance, science value, efficient resource use, decision quality and **team
collaboration**. Called out explicitly: clear UI, explicit consequences for every decision, "no
single perfect solution", difficulty levels, re-run after failure, short tutorials, explaining the
**why**, random events, and co-op roles (planning / spacecraft / science / comms / resources).

## Notable entries and their best ideas

| Repo | Stack | Idea worth adopting |
|---|---|---|
| DroidEverything/MARGIN | Three.js, no build | Anchors numbers to public NASA/JPL data (DE440 ephemerides); `?no3d` 2D fallback for weak laptops |
| ishanp2013/orbital-beyond-the-mission | Vanilla JS | One `evaluate(mission, design)` engine shared by designer, sim and report; a **Validation tab** showing the model reproduces real figures (259-day Hohmann to Mars); **judge demo URLs** (`?demo=mars&screen=design`) |
| saket-vanga/last-signal-from-ceruvia | JS | 5-mission story campaign, 3 stars per mission; **beginner mode** with a coach character, **fix-it hints** under every amber/red meter, **auto-build**, drag-drop parts on typed mount points |
| velluz-dev/Odyssey13 | React + TS | "**Launch anyway**": fly a broken design and watch it fail realistically, then show the exact numeric reason ("Not enough Δv: 3,850 / 4,300 m/s") with a tip |
| Tayebbb/RED-FRONTIER | Python | Start from a **science question**, not hardware; a "digital twin" test run against named scenarios (real dust storm, degraded relay) before committing |
| NASA-SPACEAPP-2026/Space-Mission-Design-Game | Vite, static | Requirement **negotiation** between roles; save state in localStorage; CI + staging deploys |
| nisham486/Mission-Forge, Mohithmn2005/space-mission-control | HTML | Emergencies/discoveries mid-mission that force decisions |
| Bee92-exe/what-if | 2D | Strong narrative hook: design choices decide *who gets warned in time* (real-world stakes) |

## Where ORBIT-X already wins

- Real-scale 3D Earth and a **physically consistent ascent** (real Falcon-9-class timeline:
  Max-Q ≈ T+72 s, MECO ≈ T+150 s, SECO ≈ T+510 s at 7.8 km/s), with gravity turn, plume expansion,
  stage/fairing separation and a broadcast-style camera director. No competitor has this.
- "Why it matters" lesson cards at each flight milestone, plus a live ascent-profile chart.
- Existing campaign, designer, validation, mission control and AI flight-engineer assistant.

## Recommended next features (ranked by judging impact ÷ effort)

1. ✅ **Done** — **Judge demo links**: `/demo/<moon|earth|mars>/<briefing|plan|design|vehicle|validate|launch|control|results>` or `/?demo=mars&screen=design`; plus a judge tour bar and landing-page shortcuts. Originally: `?demo=<mission>&screen=<step>` that skip login and pre-fill a valid
   design. Judges spend ~3 minutes per entry; make every screen one click away. *(small)*
2. ✅ **Done** — **Fix-it hints** with one-click *Apply fix* in the designer (`src/services/designAdvisor.ts`). Originally: when mass/power/Δv/budget goes amber or red, show one
   sentence: why, and the cheapest fix. Directly hits "explicit consequences" + "the why". *(small)*
3. ✅ **Done** — **"Launch anyway"**: physics-based outcomes (`src/services/launchOutcome.ts`): scrub, no-liftoff, Max-Q breakup, short-of-orbit + re-entry, and on-orbit power/comms/Δv/science failures, each with an exact-numbers report. Demo: `/demo/earth/launch?fail=short|breakup|power|scrub`. Originally: let an invalid design fly and fail visibly in the new launch
   scene (doesn't clear the tower when thrust-to-weight < 1, runs out of Δv short of orbit, breaks up
   at Max-Q if over-loaded), then report the exact numbers. *(medium — the physics hooks exist)*
4. ✅ **Done** — **Co-op roles**: `/crew` setup; Director / Spacecraft / Power & Comms / Science own subsystems and budget slices, request + approve funding, per-role GO poll, failures name the responsible station. Demo: `?crew=4`. Originally: Flight Director, Spacecraft, Science, Comms/Ground.
   Each owns a slice of the budget and must sign off at the readiness poll (the launch page already
   has a GO/NO-GO poll UI to extend). Explicitly requested by the brief. *(medium)*
5. ✅ **Done** — **Model accuracy page** (`/model-check`): 18 live checks against NASA/NSSDCA, US Std Atmosphere 1976, Apollo, Mars 2020 and Falcon 9 data, plus stated simplifications. It caught a real bug (Max-Q at T+60 s) which was fixed by moving to the 1976 Standard Atmosphere and correcting the ascent keyframes. Originally: show our ascent model against real published numbers (Max-Q time, MECO
   speed, orbital velocity) and Hohmann transfer times. Builds judge trust. *(small)*
6. ✅ **Done** — **Science-first briefing**: science question, success criteria, precedent missions and per-instrument relevance (`src/data/missionScience.ts`), also shown in the designer. Originally: open each mission with the science question and success criteria;
   score science value per instrument choice. *(small)*
7. ✅ **Done** — **Mid-mission anomalies** (`src/services/anomalies.ts`): 3 per mission (battery cell, solar storm, DSN outage, course correction, reaction wheel); outcomes computed from the design; owned by crew roles; scored in the debrief. Originally: dust storm, safe-mode, relay outage; tie outcomes to
   design margins. *(medium)*
8. ✅ **Done** — **Low-power mode**: auto-detected on weak hardware, Settings → Graphics, or `?lite` (`src/hooks/useGraphicsProfile.ts`). Originally: a `?lite` flag that lowers sphere segments/particles for school laptops. *(small)*
