# Glenride App Store

Glenride's public storefront: buy publications and products, license systems and services.

- Live: https://glenride-app-store.pages.dev
- Static site — `index.html` + `glenride-logo.png`. No build step; deploys as-is to Cloudflare Pages.

Mirror rule: this repo is mirrored 1:1 between the Glenride org and deevee3 personal. `git push` lands on both.

## AI-readable site (ScrollLaunch Prompt 1)

Regenerate after editing `index.html`:

```bash
node scripts/generate-ai-readable.mjs          # regenerate
node scripts/generate-ai-readable.mjs --check  # fail if output is stale
```

The generator reads `index.html` and writes `index.md`, `llms.txt`,
`llms-full.txt`, `ai.txt`, `robots.txt`, `sitemap.xml`, and
`api/md/_catalog.json`. `functions/_middleware.js` serves the `.md`
suffix, `Accept: text/markdown` negotiation (q-value aware; `*/*` or no
Accept always gets HTML), and `/api/md/<slug>` / `/api/md/_catalog`.
The catalog is 11 entries (3 available now, 5 coming soon, 3 custom
setup); coming-soon listings are never presented as available.
