# ORBIT-X — Space Mission Design Game

**NASA Space Apps Challenge 2026 · Space Mission Design Game**

Design a spacecraft under real mass, power, budget, Δv and communications limits, launch it on a physically accurate rocket from Cape Canaveral, fly it through mid-mission emergencies, and see exactly how every engineering decision changed the outcome. Play solo, or as a team of up to four on one screen.

> Independent student project for the NASA Space Apps Challenge. Not affiliated with or endorsed by NASA.

---

## For judges: see everything in 3 minutes (no sign-up)

Start the app (see *Run it* below), then open any of these links. Each one creates a password-free local judge session with a flight-ready design.

| What to look at | Link |
|---|---|
| Spacecraft design with live fix-it hints | `/demo/moon/design` |
| Realistic launch to orbit (webcast view) | `/demo/earth/launch` |
| Interplanetary mission planning | `/demo/mars/plan` |
| A design that fails at Max-Q, with an exact-numbers report | `/demo/earth/launch?fail=breakup` |
| Upper stage runs dry short of orbit, re-entry | `/demo/earth/launch?fail=short` |
| Reaches orbit, then loses power | `/demo/earth/launch?fail=power` |
| 4-player co-op team (roles, budget negotiation, GO poll) | `/demo/earth/design?crew=4` |
| Mid-mission anomalies with decisions | `/demo/moon/control` |
| Is the physics real? 18 checks against NASA data | `/demo/earth/physics` |

In demo sessions a **Judge demo** bar under the header switches missions (Moon / Earth orbit / Mars), toggles solo ↔ team of 4, and jumps to any of the 8 lifecycle steps. Add `?lite` to any URL for low-power graphics.

---

## How the challenge goals are met

| Challenge goal | In ORBIT-X |
|---|---|
| Define the objective first | Each briefing opens with the **science question** (e.g. *Did liquid water once flow on Mars?*), success criteria, real precedent missions and which instruments actually answer it |
| Design spacecraft & payload | Workstation with bus, engine, tank, solar, battery, comms and 5 instruments; live mass / cost / power meters and a 3D inspection bay |
| Explicit consequences & "the why" | **Fix-it hints** on every amber/red meter: why it matters plus the cheapest safe change, one-click *Apply fix* |
| Launch vehicle & orbit | 3 launcher classes; payload-capacity check; real-scale 3D launch with Max-Q, MECO, staging, fairing jettison and SECO on a real timeline |
| Simulate & evaluate | **Launch anyway**: flawed designs fail the way physics says (scrub, no liftoff, Max-Q breakup, short of orbit, dead battery, no signal) with the numbers that decided it |
| Random events / unexpected constraints | **Mid-mission anomalies**: battery cell short, solar storm, Deep Space Network outage, course correction, reaction-wheel wear; outcomes depend on your design |
| Team collaboration (up to 4) | **Co-op roles**: Flight Director, Spacecraft, Power & Comms, Science; each owns subsystems and a budget slice, requests and approves funds, and signs the GO/NO-GO poll |
| Scoring | Debrief combines objectives, engineering, resources, science actually returned and the quality of operations decisions |
| Educational value | "Why it matters" cards at each launch milestone, an ascent-profile chart, and the **Model accuracy** page showing where the model is exact and where it simplifies |
| Accessibility & reach | Keyboard-reachable controls with ARIA roles, light/dark themes, reduced-motion support, automatic low-power mode on weak hardware |

---

## Scientific grounding

Values are computed by the game's own code and compared with published figures on the in-app **Model accuracy** page (`/model-check`). All 18 checks pass. Examples:

- ISS orbital period 92.8 min (NASA: 92.7) · Earth escape velocity 11.19 km/s (NSSDCA: 11.186)
- Earth→Mars Hohmann transfer 259 days (JPL) · Sunlight at Mars 586 W/m² (NSSDCA: 586.2)
- Max-Q at T+70 s, 11 km (Falcon 9 webcasts: T+68–80 s)
- Air density and speed of sound from the **US Standard Atmosphere 1976**, within 0.2%

Earth imagery: NASA Blue Marble-derived textures from the three.js examples (served by jsDelivr), with a procedural fallback offline.

Splash screen: NASA Blue Marble globe rendered live in WebGL, NASA's Tycho star map and Jason-1 satellite model (NASA 3D Resources), ported from the team's TAN project. It shows once per session on the home page; deep links and `?nosplash` skip it.

Visual design follows the discipline of the 1975 NASA Graphics Standards Manual (grid, grotesque type, NASA red) without using NASA's logos or insignia. See `DESIGN.md`.

Stated simplifications: the ascent follows a spline through Falcon 9-class telemetry rather than integrating forces step by step; orbits are circular and coplanar; radio links use a simplified link budget.

---

## Run it

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Open http://localhost:5173. Accounts and progress are stored locally in the browser. No backend or sign-up is required.

Optional: the in-app **AI flight engineer** chat uses Google Gemini through the Vite dev server. Copy `.env.example` to `.env` and set `GEMINI_API_KEY`. Supabase cloud sync is also optional (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).

```bash
npm run build     # type-check + production build to dist/
npm run preview   # serve the production build
```

---

## Code map

| Path | What it does |
|---|---|
| `src/services/ascentTrajectory.ts` | Real launch timeline, ascent profile (monotone splines), US Standard Atmosphere 1976 |
| `src/services/launchOutcome.ts` | Physics-based launch-day outcome for any design (scrub / no-liftoff / breakup / short of orbit / on-orbit failures) |
| `src/services/designAdvisor.ts` | Fix-it hints and the safest cheapest fix for mass, cost and power |
| `src/services/anomalies.ts` | Mid-mission anomalies whose outcomes are computed from the design |
| `src/services/modelValidation.ts` | Live validation cases against published data |
| `src/three/launch/` | Real-scale Earth, sky, launch complex, exhaust plume, smoke and failure effects |
| `src/stores/crewStore.ts` | Co-op roles, budget shares, funding requests |
| `src/pages/LaunchOperationsPage.tsx` | Webcast-style launch UI, GO/NO-GO poll, failure reports |
| `src/demo/judgeDemo.ts` | Judge demo links and pre-broken designs |
| `docs/COMPETITIVE_ANALYSIS.md` | Review of other public entries and the features they informed |

Built with React 19, TypeScript, Vite, Three.js / React Three Fiber, Zustand and Tailwind CSS.
