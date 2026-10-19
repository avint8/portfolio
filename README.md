# avint8.com

Avinash Thiyagarajan's portfolio: one scrolling page that tells the story from Deloitte to BondScanner.

## Layout

| Path | What it is |
|---|---|
| `public/` | The site. Plain HTML, CSS and JS, no build step. This folder is what gets deployed. |
| `public/css/tokens.css` | The two colour tokens (`--paper`, `--ink`) for both themes, the paper grain, fonts and easing. |
| `public/css/site.css` | Layout and components. |
| `public/js/site.js` | Reveals, count-ups, the theme drop, scrubbed transitions, the mobile reader, and the ink brush and touch ink. |
| `public/robots.txt`, `sitemap.xml`, `llms.txt` | For search engines and AI tools. `llms.txt` is a plain-text summary of the page; keep it in step with the page. |
| `public/styles/` | Every art style of the site, kept so each can be shared: `ukiyoe/` (the live design), `sumi/`, `shonen/`, `typewriter/`, `pixel/` (e-ink pixel art) and `original/` (the story page before the ink redesign), with a gallery at `/styles/`. Each copy is self-contained and marked `noindex`. When the live design changes, copy it into its folder too. |
| `public/_redirects` | Sends `/style/...` to `/styles/...`. |
| `old/` | The 2020 portfolio, kept for reference. Not deployed. |

The visual language is Japanese ink (sumi-e) on a manga page that is still drying.

## Preview locally

```bash
python -m http.server 4173 --directory public
```

Then open http://localhost:4173.

## Deploy

The site is served by Cloudflare as static assets, with no Worker script, so it costs nothing to run.

```bash
npx wrangler@latest deploy
```

`wrangler.jsonc` points at `public/` and attaches `avint8.com` and `www.avint8.com`.

## How the motion works

The page is ink on paper: two colour tokens (`--paper`, `--ink`) and nothing else. The page reads fully without JavaScript and stays still under `prefers-reduced-motion` (reveals become plain fades; no pinning, no trail).

- **Panels.** Every card, table and mock draws its own hand-inked frame on a pseudo-element through one shared SVG filter (`#inkwobble`, feTurbulence + feDisplacementMap), so text is never distorted. Hover gives a brief speed-line burst. Grey is only ever pattern density: screentone dots, kakeami hatching, stipple (`.tone-*`, `.fx-speed`, `.fx-focus`, `.fx-uni`, `.fx-beta` in `site.css`).
- **Ink still drying.** Blocks bleed in from blurred to crisp (~600 ms) as they scroll into view; chapter titles carry a faint wet sheen that fades.
- **Desktop** (fine pointer, 820px and wider): Lenis smooth scroll (optional, loaded from jsDelivr) and three pinned, scroll-scrubbed transitions, each about 1.3 to 1.5 screens of scroll and reversible. A `.trans` block is a tall runway holding a sticky `.stage`; `site.js` turns scroll position into a progress value and writes it as CSS custom properties or SVG clip paths. Hero to chapter 1 is a giant brush stroke (bristle strips written into a clip path). Chapter 1 to 2 is a 3D manga page flip with a stippled shadow. Chapter 3 to 4 is a poster torn off a woodblock-print board along a jagged fibrous clip path, leaving scraps under the tacks. Other chapter boundaries are plain ink-bleed reveals. Anchor links land where a transition has finished.
- **Phones and narrow windows** (`pointer: coarse` or under 820px): a vertical manga reader. Each `.pn` block is a screen-sized inked panel with a paper gutter, scroll-snap carries one swipe per panel, and a mono "3 / 20" counter sits in the corner. The three signature transitions play once as ~500 ms triggered animations when their panel reaches the middle of the screen. Tall panels scroll normally.
- **Pointer.** With a mouse, a brush tip follows the cursor and a full-screen canvas draws a fading trail (fast is thin and dry, slow is thick and wet, holding still pools a blot). Both use `mix-blend-mode: difference` with white, which renders as ink on paper in either theme and inverts the text underneath, so text stays readable. On touch, a tap lands an ink dot that spreads and dries, a long press keeps it growing, and a swipe (over 10px) stops it and never drags ink.
- **Glossary notes** are popovers placed with CSS anchor positioning. The **investment-journey diagram** is driven by radio inputs and `:has()`.
- **Theme.** The ink drop in the top bar swaps `--paper` and `--ink` (default follows the system, choice saved in `localStorage`). Light is washi paper with a faint grain; dark is pure black with white ink and no texture.
- **Terminals, checklists and numbers** play once when they scroll into view, via an `IntersectionObserver`.

## Editing content

Every fact on the page has a source listed in the footer. When a number changes, update it in every place it appears, and update the footer if the source changed. Mocks that are not real artefacts carry an "illustrative" tag.
