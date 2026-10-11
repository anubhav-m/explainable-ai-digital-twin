---
version: 1
slug: "frontend-src"
primary_target: "frontend/src"
related_targets: []
---

# Surface brief: patient dashboard (frontend/src)

Scope: the whole React app (login, signup, six dashboard areas). Mode: Operate. Platform: web, laptop first, phone must not break. Light and dark themes both ship.

Audience and job: a tech-comfortable patient (20-40) reads their HbA1c estimate, sees why, and tries changes. Capstone evaluators need the technical terms on screen, so every nav token pairs a patient label with its technical term.

Approved by the user: the "Plate Section" decision sketch (`.impeccable/mocks/decision/challenger-annual.html`), with light and dark both implemented.

## Direction contract

THESIS: Each result is a numbered-free plate on a near-white sheet, registered with crosshairs, so a health estimate reads as a printed, signed proof rather than a dashboard widget. Refuses the rounded-card, ring-gauge, blue-to-purple health dashboard.

OWN-WORLD: Ground #F5F4F6 drifting warm at one corner and green at the other; ink #16181A, never pure black; hairlines #C9C7C4 at 1px; one pale green seal #D5EBDD (the source's periwinkle translated because purple is ruled out). Dark theme inverts to ink-tinted near-black with the same roles. One grotesque (Schibsted Grotesk) for display and body, Geist Mono 11px caps at 0.14em for labels and nav tokens. Zero radius. Status colour (green, amber, red) is the only saturated colour and always carries a label. SHAP direction is shape: filled bar pushes up, outlined bar pulls down, either side of one centreline.

STORY: The patient sees the number, its range, and its honest error first; then which of their 7 inputs moved it; then where to act (log a visit, try a change).

FIRST VIEWPORT: 72px sticky bar: product name left, six mono nav tokens, theme toggle, filled "Log a visit" button right. Below, a 5/7 split: left plate holds the estimate at about 92px, status tag, one-sentence lede, a hairline HbA1c scale with a dot marker, and a round seal top right; right plate holds the seven input rows with centreline tracks. A hairline-ruled four-up row closes the viewport: last lab result, tuned to your labs, since last visit, distance to the diabetes line.

FORM: design annual plate section (dealt challenger, catalog id design-annual-s-plate-section); seed key 9fb3af87. Signature move: registration crosshairs that snap onto every plate corner as it lands, plus the slowly turning seal. Motion grammar: one curve, cubic-bezier(.19,1,.22,1); plates step in staggered, bars grow from the centreline, the estimate counts up, buttons invert in 0.1s, skeletons hold the plate shape while loading.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
