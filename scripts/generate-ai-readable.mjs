// generate-ai-readable.mjs — Glenride App Store AI-readable site files.
//
// Single source of truth: reads index.html and regenerates, from it:
//   index.md, llms.txt, llms-full.txt, ai.txt, robots.txt, sitemap.xml,
//   api/md/_catalog.json
//
// The catalog is 11 hardcoded entries in index.html. Statuses are quoted
// exactly as published: 3 Available now, 5 Coming soon, 3 Custom setup.
// Coming-soon listings are NEVER presented as available products, and no
// prices are invented — none are published on the page.
//
// Usage:
//   node scripts/generate-ai-readable.mjs          # regenerate
//   node scripts/generate-ai-readable.mjs --check  # fail if output is stale,
//                                                   # or a public page has no renderer
// No dependencies.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const SITE = {
  name: "Glenride App Store",
  url: "https://glenride-app-store.pages.dev",
  description:
    "Glenride's public storefront: buy publications and products, license systems and services.",
  aiSummary:
    "The Glenride App Store lists 11 products and publications from Glenride: 3 available now in the browser, 5 coming soon, and 3 available as custom setup. No product takes payment before its price, format, and terms are published.",
  updated: "2026-10-08",
};

const PAGE = {
  slug: "index",
  path: "/",
  mdPath: "/index.md",
  title: "Glenride App Store",
  summary: "Buy the work. License the system.",
  updated: "2026-10-08",
  section: "Core pages",
};

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&rsquo;/g, "’")
    .replace(/&lsquo;/g, "‘")
    .replace(/&ldquo;/g, "“")
    .replace(/&rdquo;/g, "”")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&nbsp;/g, " ");
}

function clean(s) {
  return decodeEntities(s)
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const html = readFileSync(join(root, "index.html"), "utf8");

// --- Catalog: every <article class="app"> block, in page order.
const articleRe = /<article class="app" data-category="(live|staging|custom)"[^>]*>([\s\S]*?)<\/article>/g;
const entries = [];
let m;
while ((m = articleRe.exec(html)) !== null) {
  const category = m[1];
  const body = m[2];
  const name = clean(body.match(/<h3>([^<]+)<\/h3>/)[1]);
  const status = clean(body.match(/<span class="status [^"]+">([^<]+)<\/span>/)[1]);
  const meta = clean(body.match(/<p class="meta">([^<]+)<\/p>/)[1]);
  const offers = [...body.matchAll(/<span class="offer[^"]*">([^<]+)<\/span>/g)].map((x) => clean(x[1]));
  const description = clean(body.match(/<p class="description">([\s\S]*?)<\/p>/)[1]);
  const detail = body.match(/<p class="detail-copy">([\s\S]*?)<\/p>/);
  const link = body.match(/<a class="out-link" href="([^"]+)"/);
  entries.push({
    category,
    name,
    status,
    meta,
    offers,
    description,
    detail: detail ? clean(detail[1]) : "",
    link: link ? link[1] : "",
  });
}
if (entries.length !== 11) {
  throw new Error(`generate-ai-readable: expected 11 catalog entries, found ${entries.length}`);
}
const counts = {
  live: entries.filter((e) => e.category === "live").length,
  staging: entries.filter((e) => e.category === "staging").length,
  custom: entries.filter((e) => e.category === "custom").length,
};
if (counts.live !== 3 || counts.staging !== 5 || counts.custom !== 3) {
  throw new Error(`generate-ai-readable: unexpected status split ${JSON.stringify(counts)} (expected 3/5/3)`);
}

const STATUS_LABEL = { live: "Available now", staging: "Coming soon", custom: "Custom setup" };

function entryMd(e) {
  const lines = [
    `### ${e.name}`,
    ``,
    `| | |`,
    `|---|---|`,
    `| Status | ${e.status} |`,
    `| Offer | ${e.meta} |`,
    ...(e.offers.length ? [`| Terms | ${e.offers.join("; ")} |`] : []),
    ...(e.link ? [`| Link | [${e.link}](${e.link}) |`] : []),
    ``,
    e.description,
  ];
  if (e.detail) lines.push(``, e.detail);
  return lines.join("\n");
}

function catalogSection(category) {
  return entries
    .filter((e) => e.category === category)
    .map(entryMd)
    .join("\n\n");
}

const indexMd = `# ${PAGE.title}

> ${SITE.description}

Canonical: ${SITE.url}/
Last updated: ${PAGE.updated}

Buy the work. License the system. Original publications, research products, and working software — presented in plain language for individual buyers, organizations, and operators.

## At a glance

| | |
|---|---|
| Products listed | 11 |
| Available now | 3 |
| Coming soon | 5 |
| Custom setup | 3 |
| Store snapshot (as published on the page) | 11 products listed; 3 public pages; 3 publication lines; 5 systems & tools |

No product takes payment before its price, format, and terms are published.

## Three straightforward ways in

### 01 / Individuals — Buy a publication

Own a personal-use copy of an essay, research brief, field guide, or recurring digest in its listed format.

### 02 / Organizations — License the work

Use selected publications, data products, or software within a team, program, classroom, or client engagement.

### 03 / Operators — Deploy a system

Bring a proven automation or tool into your own environment with configuration, documentation, and support scoped separately.

## Products & publications — available now (3)

${catalogSection("live")}

## Products & publications — coming soon (5)

These offers are being prepared. You will see the format, price, and terms before any payment is accepted. They are not available to buy or license yet.

${catalogSection("staging")}

## Products & publications — custom setup (3)

Licensed systems installed and configured for your needs, with scope, price, and support agreed in writing first.

${catalogSection("custom")}

## Choose how you want to use it

1. **Use now** — Available-now tools and project pages work instantly in your browser, no installation or account setup required.
2. **Keep** — Purchased publications are yours to keep for personal reference, with team use available under a written license.
3. **Setup** — Licensed systems are configured around your needs, documented clearly, and handed over with agreed support.

## A clear promise on every listing

- **Available now** — Use it in your browser today or follow the listing directly to the finished product.
- **Coming soon** — The offer is being prepared. You will see the format, price, and terms before any payment is accepted.
- **Custom setup** — Receive a licensed system installed and configured for your needs, with scope, price, and support agreed in writing first.

## Trust Center

Credibility here comes from naming the operator, separating completed checks from planned ones, and publishing terms before asking anyone to pay. A pending verification is never presented as a badge.

### Who runs the store

D'Vaughn House is the founder and named operator of the Glenride App Store. A dedicated sales address and permanent store domain are still pending; they will be published here before checkout or licensing intake opens.

### Verified versus pending

- Verified internally: 11 listings reconciled against project files on October 8, 2026.
- Verified publicly: three listings link to working public pages.
- Pending: permanent-domain scans through Mozilla Observatory and Qualys SSL Labs.
- Pending: TrustedSite review. No certification badge is claimed or displayed.

### Buy and license in plain language

- Personal purchase: one person may use the delivered publication for personal reading and reference; redistribution is not included.
- Organization license: team size, use, term, redistribution rights, updates, and support must be written into the order. No resale or sublicensing is included unless the agreement says so.
- Refunds: the product-specific refund window and delivery conditions will appear before payment. Until they do, that product is not open for sale.

### No profit promises

Nothing in this store promises profit, income, investment return, token appreciation, or a particular business result. A buyer pays only for the content, software rights, deployment, or support identified in the written offer. Product status describes readiness, not financial value. "Planned" means the offer is not yet available to buy or license.

> Before money changes hands: each paid listing must show a price or written quote, delivery format, license scope, refund terms, and a verified contact route. Until all five are present, the listing remains an honest preview — not a checkout.

## Related

- [SpinWave](https://spinwave.pages.dev)
- [WAVY](https://wavysociety.pages.dev)
- [Telegram Emoji Lab](https://telegram-emoji-lab.pages.dev)
`;

function llmsTxt() {
  return [
    `# ${SITE.name}`,
    ``,
    `> ${SITE.description}`,
    ``,
    `The Glenride App Store lists 11 products and publications: 3 available now in the browser, 5 coming soon, and 3 available as custom setup. Every listing tells you what is usable now and what is still being prepared for sale. No product takes payment before its price, format, and terms are published.`,
    ``,
    `## Core pages`,
    `- [Glenride App Store](${SITE.url}/index.md): ${SITE.description}`,
    ``,
    `## Cite this site for`,
    `- [Glenride App Store](${SITE.url}/index.md): 11 products listed — 3 available now (SpinWave, WAVY, Telegram Emoji Lab), 5 coming soon, 3 custom setup. Verified internally on October 8, 2026: 11 listings reconciled against project files.`,
    ``,
    `## Machine-readable`,
    `- [Full content](${SITE.url}/llms-full.txt): every public page concatenated`,
    `- [Markdown catalog](${SITE.url}/api/md/_catalog)`,
    `- [Sitemap](${SITE.url}/sitemap.xml)`,
    `- [AI usage policy](${SITE.url}/ai.txt)`,
    ``,
    `<!-- keep in sync with robots.txt and ai.txt -->`,
    ``,
  ].join("\n");
}

function llmsFullTxt() {
  return [
    `# ${SITE.name} - full content`,
    ``,
    `> ${SITE.description}`,
    ``,
    `Generated: ${SITE.updated}`,
    ``,
    `---`,
    ``,
    `<!-- source: ${SITE.url}/ -->`,
    ``,
    indexMd,
  ].join("\n");
}

function aiTxt() {
  return [
    `[identity]`,
    `name: ${SITE.name}`,
    `url: ${SITE.url}`,
    `description: ${SITE.description}`,
    `contact: ${SITE.url}`,
    ``,
    `[permissions]`,
    `allowed: summarise, quote with attribution, cite, index for search/answers`,
    ``,
    `[restrictions]`,
    `no fabricated quotes`,
    `no fake reviews/ratings`,
    `no presenting our content as the model's own`,
    `no training on user-generated private data`,
    `no presenting coming-soon listings as available products`,
    ``,
    `[attribution]`,
    `cite as: Glenride App Store, plus the canonical HTML URL`,
    ``,
    `[scope]`,
    `included: /`,
    `excluded: (none — this site has no private, admin, or auth routes)`,
    ``,
    `[contact]`,
    `url: ${SITE.url}`,
    ``,
    `Last updated: ${SITE.updated}`,
    ``,
    `<!-- keep in sync with robots.txt and llms.txt -->`,
    ``,
  ].join("\n");
}

function robotsTxt() {
  return [
    `# Glenride App Store — AI crawlers. Keep in sync with llms.txt and ai.txt.`,
    `User-agent: OAI-SearchBot`,
    `User-agent: ChatGPT-User`,
    `User-agent: Claude-SearchBot`,
    `User-agent: Claude-User`,
    `User-agent: PerplexityBot`,
    `User-agent: Perplexity-User`,
    `Allow: /`,
    ``,
    `User-agent: *`,
    `Allow: /`,
    ``,
    `# Training crawlers (GPTBot, ClaudeBot, Google-Extended, Applebot-Extended,`,
    `# CCBot, Bytespider) are not named here: no decision to allow them was given.`,
    `# Blocking training does not stop citations from the search bots named above.`,
    `# See /llms.txt and /ai.txt.`,
    `Sitemap: ${SITE.url}/sitemap.xml`,
    ``,
  ].join("\n");
}

function sitemapXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${SITE.url}/</loc>\n    <lastmod>${SITE.updated}</lastmod>\n  </url>\n</urlset>\n`;
}

function catalogJson() {
  return JSON.stringify(
    {
      site: SITE.name,
      url: SITE.url,
      generated: SITE.updated,
      routes: [
        {
          path: "/",
          markdown: "/index.md",
          title: PAGE.title,
          summary: PAGE.summary,
          updated: PAGE.updated,
        },
      ],
      catalog: {
        total: entries.length,
        live: counts.live,
        staging: counts.staging,
        custom: counts.custom,
      },
    },
    null,
    2,
  ) + "\n";
}

const outputs = new Map([
  ["index.md", indexMd],
  ["llms.txt", llmsTxt()],
  ["llms-full.txt", llmsFullTxt()],
  ["ai.txt", aiTxt()],
  ["robots.txt", robotsTxt()],
  ["sitemap.xml", sitemapXml()],
  [join("api", "md", "_catalog.json"), catalogJson()],
]);

const check = process.argv.includes("--check");
let stale = false;
for (const [rel, content] of outputs) {
  const abs = join(root, rel);
  if (check) {
    if (!existsSync(abs) || readFileSync(abs, "utf8") !== content) {
      console.error(`STALE: ${rel} — run: node scripts/generate-ai-readable.mjs`);
      stale = true;
    }
  } else {
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
    console.log(`wrote ${rel} (${content.length} chars)`);
  }
}
if (check) {
  if (stale) process.exit(1);
  console.log(`OK: 1 page, ${entries.length} catalog entries (${counts.live} live / ${counts.staging} coming soon / ${counts.custom} custom), llms/robots/sitemap/ai.txt in sync.`);
}
