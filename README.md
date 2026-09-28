# HSN OR Dashboard Interview Presentation

A responsive, eight-slide interview presentation for HSN Decision Support Analyst II competition #10169. The dashboard figures are illustrative synthetic data and do not represent HSN performance.

## Run locally

The site is static and has no build step. From the repository root, run:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Use the on-screen controls or keyboard arrow keys to move through the deck. `Home` returns to slide 1 and `End` opens slide 9.

## Deploy

Pushing to `main` runs [the GitHub Pages workflow](.github/workflows/deploy-pages.yml). This repository is configured to use GitHub Actions as its Pages source. For a new fork, select **GitHub Actions** once under **Settings → Pages**. The expected site URL is:

<https://mtrivedilu.github.io/HSN/>

The workflow packages only the public site files. Relative URLs are used throughout so navigation, styles, scripts, and the PowerPoint download work under the `/HSN/` project path.

## Public files

- `index.html` — Claude Design V2 slide content and inline visual composition
- `styles.css` — presentation shell and responsive reflow rules
- `app.js` — minimal slide navigation and keyboard controls
- `downloads/Mihir_Trivedi_HSN_OR_Dashboard.pptx` — downloadable PowerPoint

Private source material such as résumés, job descriptions, handoff notes, and export archives is intentionally excluded from this repository.
