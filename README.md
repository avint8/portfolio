# avint8.com

Avinash Thiyagarajan's portfolio: one scrolling page that tells the story from Deloitte to BondScanner.

## Layout

| Path | What it is |
|---|---|
| `public/` | The site. Plain HTML, CSS and JS, no build step. This folder is what gets deployed. |
| `public/css/tokens.css` | Colours, fonts and easing. Both themes are declared here with `light-dark()`. |
| `public/css/site.css` | Layout and components. |
| `public/js/site.js` | Timed reveals, count-up numbers, the theme switch, the background canvas, and wheel and keyboard paging. |
| `public/robots.txt`, `sitemap.xml`, `llms.txt` | For search engines and AI tools. `llms.txt` is a plain-text summary of the page; keep it in step with the page. |
| `old/` | The 2020 portfolio, kept for reference. Not deployed. |

The visual language (type, colour, shape, honest labels on mocks) comes from the Story Page design system.

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

The page reads fully without JavaScript and stays still under `prefers-reduced-motion`.

- **The page scrolls one section at a time.** Every section is a CSS scroll-snap stop that fills the screen, and type and spacing scale with the window's height (`svh` units) so the content fits. Touch uses snap alone; the mouse wheel and keyboard are paged in `site.js`, because one wheel notch is too small for snap to carry.
- **On phones**, rows of cards become swipeable rows and side-by-side blocks each take their own screen.
- **Scroll reveals and the progress bar** use CSS scroll-driven animations (`animation-timeline: view()` and `scroll()`). Browsers without them show the content at rest.
- **The glossary notes** are popovers placed with CSS anchor positioning.
- **The investment-journey diagram** is driven by radio inputs and `:has()`.
- **The theme switch** uses the View Transitions API.
- **Terminals, checklists and numbers** play once when they scroll into view, via an `IntersectionObserver`.

## Editing content

Every fact on the page has a source listed in the footer. When a number changes, update it in every place it appears, and update the footer if the source changed. Mocks that are not real artefacts carry an "illustrative" tag.
