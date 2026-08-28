# UI Design Guide — Anti-Slop Edition

Give this file to your coding agent as a system/context doc before it builds any UI. It combines the 7 foundational UI principles (Figma) with hard rules against the "AI-generated" look: generic icon packs, default fonts, centered-hero-with-gradient-blob layouts, and cookie-cutter spacing.

The agent should treat Part 1 as **why**, Part 2 as **what to avoid**, Part 3 as **what to do instead**, and the checklist at the end as a pre-ship gate.

---

## Part 1 — The 7 Core Principles (apply these to every screen)

| # | Principle | What it means | Agent rule |
|---|-----------|----------------|------------|
| 1 | **Hierarchy** | Users should see what matters first without reading everything. | Use font-size/weight, contrast, and spacing — not color alone — to rank elements. Decide what the user sees *before* scrolling, and make sure it's the single most important thing on that screen. |
| 2 | **Progressive disclosure** | Don't show everything at once. | Break multi-field forms and complex flows into steps. Always show the user where they are ("Step 2 of 4"), never just a spinner or a wall of fields. |
| 3 | **Consistency** | Same element, same behavior, everywhere. | One button component, one spacing scale, one radius value, one shadow style. If something breaks the pattern, it must be intentional and rare (e.g., a destructive action). |
| 4 | **Contrast** | Draw the eye to what's critical. | Reserve your highest-contrast color for the one primary action per screen. Secondary/tertiary actions get quieter treatment (outline, ghost, muted text). |
| 5 | **Accessibility** | 1 in 4 users has some vision impairment. | Meet WCAG AA contrast minimums, always have visible keyboard focus states, always have alt text, never rely on color alone to convey state (add icon/text too). |
| 6 | **Proximity** | Things that belong together, look together. | Group related controls with shared spacing/borders; separate unrelated or dangerous actions (e.g., "Delete" lives away from "Save") with extra whitespace or a divider. |
| 7 | **Alignment** | A strong grid reads as professional. | Everything sits on a consistent baseline grid (e.g., 4px or 8px unit). No "eyeballed" padding. No two elements share an edge without a reason. |

---

## Part 2 — What makes UI look like "AI slop" (avoid all of this)

### 2.1 Icons
- ❌ Lucide, Feather, Heroicons, Font Awesome, Material Icons used raw, at default stroke-width, unstyled, scattered as decoration.
- ❌ An icon next to every single label "because it looks more complete" (icon soup).
- ❌ Mismatched icon styles on the same screen (mixing filled + outline + duotone).
- **Why it reads as slop:** these are the exact default imports every AI-scaffolded app pulls in, at identical size/weight, with zero adaptation to the product's voice.

### 2.2 Typography
- ❌ Inter, Roboto, Poppins, Open Sans, "system-ui" as the *only* typeface — this is the single strongest AI-generated tell.
- ❌ One font family for everything (no distinction between display/body/data).
- ❌ Default browser/Tailwind font sizes with no real type scale.

### 2.3 Color & layout clichés (2026's three most-repeated AI looks)
- ❌ **Look A:** warm cream background (~#F4F1EA) + big serif headline + terracotta/clay accent (~#D97757).
- ❌ **Look B:** near-black background + one neon/acid-green or vermilion accent, glowing button.
- ❌ **Look C:** broadsheet layout — hairline rules, zero border-radius, dense justified columns, trying to look "editorial."
- ❌ Hero pattern: centered headline → subtext → two pill buttons → blurred gradient blob behind everything.
- ❌ Generic 3-card "feature grid," each card: icon-in-circle, bold title, one line of gray text — repeated for every section.
- ❌ Purple-to-blue or pink-to-orange gradient text/buttons used as a personality substitute.

### 2.4 Motion & microcopy
- ❌ Everything fades/slides up on scroll, uniformly, with no orchestration — reads as templated, not designed.
- ❌ Copy like "Unlock the power of X," "Supercharge your Y," "Seamlessly Z" — filler marketing voice with no specificity.
- ❌ Buttons labeled "Submit," "Learn More," "Get Started" with no context of what actually happens.

---

## Part 3 — What to do instead

### 3.1 Typography: pick a real pairing, not a default
Choose **2–3 roles**, each from a deliberate, less-common family — never the same family used for everything.

| Role | Good directions (examples, not exhaustive) |
|------|---------------------------------------------|
| Display / headline | Editorial or characterful serifs & slabs: **Fraunces, Libre Caslon, Canela, Söhne Breit, GT Sectra, Reckless, Tiempos, Recoleta, Newsreader** (high-contrast weight). Pick one with personality that matches the product's domain. |
| Body | A quiet, highly legible workhorse that isn't Inter: **Söhne, Suisse Int'l, Untitled Sans, Public Sans, Charter, Freight Text, IBM Plex Sans/Serif, Neue Montreal**. |
| Utility / data / mono | For numbers, code, labels: **IBM Plex Mono, JetBrains Mono, Berkeley Mono, Söhne Mono, Fragment Mono**. |

Rule for the agent: name the exact 2–3 families in the design plan *before* writing any CSS, and justify each choice against the product's subject matter — not "it looked nice."

### 3.2 Icons: blend them in, don't decorate with them
- Prefer **no icon** over a generic one if the label alone is clear.
- If icons are needed, pick **one** family and customize it: adjust stroke-width to match the type's weight, recolor to the palette (never default black/gray), and use consistent sizing tied to the type scale.
- For a distinctive feel, consider: custom-drawn single-color glyphs, small inline illustrations pulled from the product's own domain (not generic UI-kit clip art), or typographic solutions (numerals, letters, symbols) instead of icons entirely.
- Icons should feel like they were drawn *for this product*, not imported wholesale. If it would look identical in a to-do app, a CRM, and a crypto dashboard, it's too generic.

### 3.3 Color: derive from the subject, not a template
- Build a **4–6 color token system** with named hex values, derived from the actual subject/brand — not the cream+terracotta or black+neon defaults above.
- One accent color used with real restraint (primary CTA + a couple of accents), not applied to every heading and icon indiscriminately.
- Push to something the subject justifies: an industrial product might earn desaturated blues/grays with one hazard-orange accent; a nature app might justify deep greens/browns rather than a generic teal.

### 3.4 Layout: earn the structure, don't template it
- Open with a **thesis**, not a formula — the most characteristic thing about this specific product, in whatever form fits (a real screenshot/demo, a number that matters, a distinctive statement) — not "headline + subtext + two buttons + blob."
- Numbered steps (01/02/03) only when content is an actual sequence. Otherwise, don't fake a process.
- Vary card/section layouts across the page instead of repeating one card shape three times — asymmetry, different widths, a full-bleed moment, a table instead of a card, etc.
- Everything on a strict spacing grid (4px or 8px base unit) — but grid ≠ boring; use grid *and* one deliberate structural risk (an offset element, a bleed image, a non-standard nav).

### 3.5 Motion: orchestrate, don't decorate
- One deliberate animated moment (page load sequence, a meaningful scroll reveal, a hover micro-interaction on the one thing that deserves it) beats uniform fade-ins on every element.
- Respect `prefers-reduced-motion`.
- If in doubt, cut the animation — restraint reads as more intentional than motion-for-its-own-sake.

### 3.6 Copy: specific, active, in the user's language
- Say exactly what a control does: "Save changes," not "Submit." Name things the way the user thinks of them, not how the system is built internally.
- No filler marketing verbs ("supercharge," "unlock," "seamless"). Be concrete.
- Error and empty states explain what happened and what to do next — in the product's voice, not an apology.

---

## Part 4 — Pre-ship checklist for the agent

Before calling a screen "done," verify:

- [ ] Named the 2–3 typefaces used and why (not the default stack)
- [ ] No raw/unstyled Lucide-Feather-Heroicons-style icon set; icons (if any) are recolored, resized to the type scale, and consistent
- [ ] Color palette is a named 4–6 hex token set, not cream+terracotta or black+neon
- [ ] No centered-hero + two-pill-buttons + gradient-blob pattern, unless the brief specifically calls for it
- [ ] No repeated 3-card icon-in-circle feature grid unless genuinely the best structure for this content
- [ ] One primary action per screen has the highest contrast; everything else is visibly secondary
- [ ] Spacing sits on a consistent 4px/8px grid — no eyeballed padding
- [ ] Keyboard focus states are visible; contrast passes WCAG AA; nothing relies on color alone
- [ ] Related controls are grouped by proximity; destructive actions are visually separated
- [ ] Motion, if present, is one orchestrated moment — not uniform scroll-fade on everything
- [ ] Copy names things the way a user would, uses active voice, and contains no filler marketing language
- [ ] Look at the whole screen and ask: "Would this look identical if I swapped in any other product's content?" If yes, revise until the answer is no.
