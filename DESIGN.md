# ORBIT-X design system

**World:** the discipline of the 1975 NASA Graphics Standards Manual: a strict grid, heavy grotesque type, NASA red used with conviction, square-cut forms, technical precision. Never NASA's logos, insignia or wordmarks.

**Scene:** judges and students on laptops and projectors in bright rooms. The night (dark) theme is the default; a fully light day theme is one click away for bright rooms and projectors. 3D views (launch, mission control, spacecraft bay) are always dark "space windows"; everything else, including the shell rail and hero cards, follows the theme.

## Color

| Role | Light | Dark (default) | Use |
|---|---|---|---|
| Ground | `#F5F6F7` | `#0B0C0E` | Page background |
| Panel | `#FFFFFF` | `#141518` | Panels, tables, top bar |
| Elevated | `#EEF0F2` | `#1B1D21` | Inputs, hover fills |
| Ink | `#121316` | `#F2F3F5` | Text, rules, carbon rail |
| Secondary text | `#474C54` | `#A9AEB6` | Body copy |
| Muted text | `#686D76` | `#7B818A` | Meta, labels |
| NASA red (field) | `#FC3D21` | `#FC3D21` | Red band, close field, markers |
| NASA red (action) | `#D2301B` | `#FC3D21` | Primary buttons, active state (AA with white text) |
| Agency blue | `#0B3D91` | `#8FB4FF` | Links, data values |
| Success / warning / danger | `#12784A` / `#A35F00` / `#C42B1C` | `#2FBF71` / `#F2A93B` / `#FF5A4D` | State only |
| Rules | `#DFE2E6` / `#C4C8CE` | white 8% / 15% | Hairlines |

Tokens live in `src/index.css` (`--bg-*`, `--accent-*`, `--text-*`, `--border-*`), exposed to Tailwind via `@theme`. Historical names are kept: `accent-blue` is NASA red, `accent-cyan` is agency blue.

## Type

- **Archivo** (variable width and weight) for everything. Display: weight 800–900, width 88–92%, tracking −0.03 to −0.045em, leading 0.86–1.02.
- **Geist Mono** only for measurements: telemetry, Δv, budgets, clocks, tables of values. Tabular numerals.
- No kicker or eyebrow labels above headings. Context goes in a meta line under the heading.

## Form

- Corners: 2–8px through Tailwind's radius scale (`--radius-*`). Pills only for status dots.
- Panels: white, 1px rule, 1–2px soft shadow. No glow, glass or gradients in chrome.
- Shell: navigation rail on the panel token (carbon in dark, white in light) with a 3px red active bar; a top bar under a 3px NASA-red band.
- Space windows (`.force-dark`): always-dark surfaces that keep light text in both themes, for 3D views only. In light mode the landing ascent chart sits on a white panel without the globe.

## Signature

**The flight-plan rule:** a horizontal ruled timeline with tick marks and phase labels, used for the mission lifecycle (landing, dashboard), the launch milestones, and the debrief.

## Motion

- Entrances: short rise and fade with exponential ease-out from an already-visible default. Reduced motion is respected everywhere.
- Landing hero: the game's own ascent model drawn live, a red cursor sweeping the real altitude curve.
- Splash (ported from the TAN project): a turning NASA Blue Marble globe in WebGL, a NASA Tycho star map, a Jason-1 satellite pass, a pulsing LC-39A marker, and a zoom-in exit onto Cape Canaveral.

## Assets and provenance

- `public/splash/earth-map.webp`, `earth.webp`: NASA Blue Marble (via NASA GIBS), from the TAN project.
- `public/splash/starmap.webp`: NASA Tycho star map (NASA 3D Resources), from the TAN project.
- `public/splash/jason1.glb`: NASA Jason-1 model (NASA 3D Resources), from the TAN project. `draco/` holds the Draco decoder.
- Earth and Moon textures in scenes: three.js example maps derived from NASA imagery, loaded from jsDelivr, with procedural fallbacks.
