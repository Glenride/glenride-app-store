/**
 * AI-readable markdown handler (ScrollLaunch Prompt 1).
 *
 * This site is a single static page, so the registry is one entry:
 * - GET /index.md -> static markdown file.
 * - GET / with `Accept: text/markdown` (q-value higher than text/html)
 *   -> the markdown version. any Accept or no Accept -> HTML.
 * - GET /api/md/<slug> -> markdown; GET /api/md/_catalog -> JSON catalog.
 * - Unknown .md / unknown /api/md/<slug> -> markdown 404, never HTML.
 *
 * Everything else passes through untouched.
 */

const PAGES = {
  index: { asset: "/index.md", html: "/", lastmod: "2026-10-08" },
};

const DESCRIBEDBY =
  '</llms.txt>; rel="describedby", </llms-full.txt>; rel="describedby", </ai.txt>; rel="describedby"';

function parseAccept(header) {
  const out = {};
  for (const part of (header || "").split(",")) {
    const [type, ...params] = part.trim().split(";");
    let q = 1;
    for (const p of params) {
      const m = p.trim().match(/^q=([0-9.]+)$/);
      if (m) q = parseFloat(m[1]);
    }
    out[type.trim().toLowerCase()] = q;
  }
  return out;
}

function mdHeaders(body, lastmod) {
  const headers = new Headers({
    "Content-Type": "text/markdown; charset=utf-8",
    "X-Markdown-Tokens": String(Math.ceil(body.length / 4)),
    "X-Robots-Tag": "noindex, follow",
    "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    "Access-Control-Allow-Origin": "*",
  });
  if (lastmod) headers.set("Last-Modified", new Date(`${lastmod}T00:00:00Z`).toUTCString());
  return headers;
}

async function serveMd(env, request, slug) {
  const page = PAGES[slug];
  if (!page) return md404(request);
  const asset = await env.ASSETS.fetch(new URL(page.asset, request.url));
  if (!asset.ok) return md404(request);
  const body = await asset.text();
  const headers = mdHeaders(body, page.lastmod);
  headers.set("Content-Location", `https://glenride-app-store.pages.dev${page.html}`);
  headers.set("Link", `<https://glenride-app-store.pages.dev${page.html}>; rel="canonical"`);
  headers.set("Vary", "Accept");
  if (request.method === "HEAD") return new Response(null, { status: 200, headers });
  return new Response(body, { status: 200, headers });
}

function md404(request) {
  const body =
    "# Not found\n\n> This page does not have a markdown version.\n\n" +
    "Canonical: https://glenride-app-store.pages.dev/\n";
  const headers = mdHeaders(body, null);
  headers.set("Content-Location", "https://glenride-app-store.pages.dev/");
  if (request.method === "HEAD") return new Response(null, { status: 404, headers });
  return new Response(body, { status: 404, headers });
}

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Accept",
      },
    });
  }

  if (path.endsWith(".md")) {
    const slug = path.slice(1, -3) || "index";
    return serveMd(env, request, slug);
  }

  if (path === "/api/md/_catalog" || path === "/api/md/_catalog.json") {
    const asset = await env.ASSETS.fetch(new URL("/api/md/_catalog.json", request.url));
    const body = await asset.text();
    const headers = new Headers({
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    });
    if (request.method === "HEAD") return new Response(null, { status: 200, headers });
    return new Response(body, { status: 200, headers });
  }
  if (path.startsWith("/api/md/")) {
    return serveMd(env, request, path.slice("/api/md/".length));
  }

  if (path === "/") {
    const accept = parseAccept(request.headers.get("Accept"));
    const mdQ = accept["text/markdown"] ?? 0;
    const htmlQ = accept["text/html"] ?? (accept["*/*"] ?? 0);
    if ("text/markdown" in accept && mdQ > 0 && mdQ > htmlQ) {
      return serveMd(env, request, "index");
    }
    const res = await next();
    const headers = new Headers(res.headers);
    headers.append("Link", DESCRIBEDBY);
    return new Response(res.body, { status: res.status, headers });
  }

  return next();
}
