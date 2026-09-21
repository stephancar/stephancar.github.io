# steefware.com

The hub page and blog of [steefware.com](https://www.steefware.com/) — a collection of simple, free, single-purpose web tools. No cookies, no ads, no accounts, no build step.

## What's here

- `index.html` — the tool overview (serious tools / fun & experiments)
- `blog/` — plain-HTML articles explaining the ideas and math behind each tool, plus `feed.xml` (RSS)
- `assets/steefware.css` — the shared neubrutalist design system used by the hub, the blog and the individual apps (they link it same-origin)
- `robots.txt`, `sitemap.xml`, `llms.txt` — crawler files for search engines and LLMs
- `sw.js`, `manifest.webmanifest` — PWA bits (network-first service worker)

Each tool lives in its own repo under [github.com/stephancar](https://github.com/stephancar?tab=repositories) and is served at `steefware.com/<repo>/` via GitHub Pages.

## Local development

No build step. Serve the folder and open it:

```bash
python -m http.server
```

## Support

If any of the tools saved you some time: [☕ buy me a coffee](https://ko-fi.com/steefware)
