# HSN OR Dashboard Interview Presentation

A responsive, seven-slide interview presentation and interactive operating room dashboard prototype for HSN Decision Support Analyst II competition #10169. Every dashboard value and record is synthetic and does not represent HSN performance.

## Run locally

The site is static and has no build step. From the repository root, run:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Use the on-screen controls or keyboard arrow keys to move through the deck. `Home` returns to slide 1 and `End` opens slide 7. The dashboard prototype is at <http://localhost:8000/dashboard/>.

## Deploy

Pushing to `main` runs [the GitHub Pages workflow](.github/workflows/deploy-pages.yml). This repository is configured to use GitHub Actions as its Pages source. For a new fork, select **GitHub Actions** once under **Settings → Pages**. The expected site URL is:

<https://mtrivedilu.github.io/HSN/>

The workflow packages only the public site files. Presentation assets use project-safe paths, and the presentation call to action opens the deployed dashboard in a new tab.

## Regenerate the PowerPoint

The export script captures the seven web slides and adds a real external hyperlink over the dashboard call to action on the final slide:

```bash
npm install
npx playwright install chromium
npm run generate:pptx
```

The generated file replaces `downloads/Mihir_Trivedi_HSN_OR_Dashboard.pptx`. The dashboard URL is defined in `scripts/generate-pptx.js`, so future exports retain the hyperlink.

## Public files

- `index.html` — final Claude Design V6 slide content and inline visual composition
- `styles.css` — presentation shell and responsive reflow rules
- `app.js` — minimal slide navigation and keyboard controls
- `dashboard/` — responsive dashboard prototype, interaction code, and synthetic JSON fixture
- `downloads/Mihir_Trivedi_HSN_OR_Dashboard.pptx` — downloadable PowerPoint
- `scripts/generate-pptx.js` — repeatable presentation export with the dashboard hyperlink

Private source material such as résumés, job descriptions, handoff notes, and export archives is intentionally excluded from this repository.
