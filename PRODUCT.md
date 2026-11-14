# ORBIT-X — product truth

## What it is
An interactive space mission design game built for the NASA Space Apps Challenge 2026 ("Space Mission Design Game"). Players define a science objective, design a spacecraft under real mass, power, budget, Δv and communications limits, choose a launcher, fly a physically grounded launch from Cape Canaveral, operate the mission through anomalies, and receive a scored debrief explaining how each decision mattered. Solo or hot-seat co-op for up to four players.

## Audience and scene
- Space Apps judges reviewing many entries in a few minutes each, on laptops or projected in bright rooms.
- Students and educators (secondary school to early university) playing in classrooms and at home on ordinary laptops.

## What it must prove
- Engineering trade-offs are real and explained: every decision has numeric consequences and a "why".
- The physics is credible: values are checked against NASA and published data in-app.
- It is a complete, playable mission lifecycle, not a demo of one screen.

## Brand commitments
- Look and feel "like NASA made it": the user has pinned an agency, mission-control aesthetic. Interpreted through the discipline of the 1975 NASA Graphics Standards Manual (grotesque type, NASA red, strict grid, technical precision), never by using NASA's logos, insignia, or wordmarks.
- Independent student project; must not claim NASA affiliation or endorsement.
- Product name: ORBIT-X.

## Constraints
- React 19, TypeScript, Vite, Tailwind CSS v4, React Three Fiber; must run offline-capable with procedural fallbacks.
- Accessibility: keyboard reachable, WCAG AA contrast, reduced motion respected.
- Performance: must run on school laptops (low-power mode exists).
