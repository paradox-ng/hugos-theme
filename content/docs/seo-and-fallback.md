---
title: "SEO & No-JS Pages"
weight: 80
date: 2024-01-17
---

# SEO & No-JS Pages

The desktop is a single page powered by JavaScript - but the content is not
trapped inside it. Every piece of content also exists as a plain, crawlable
Hugo page.

## Why this matters

- **Search engines** index the real pages, not a blank `<div>`.
- **No-JS visitors** (and tools, readers, archivers) still get the content.
- **Deep links** to `/blog/some-post/` work and render a readable page.

## How it works

Alongside the desktop, the theme renders the normal Hugo page tree:

- `single.html` for individual pages and posts
- `list.html` for sections
- standard meta tags, Open Graph, Twitter cards, canonical URLs, and an RSS link

These plain pages are intentionally minimal - they exist so the content is
accessible and indexable. The desktop experience is layered on top for people
with JavaScript.

## Meta and social

Page-level front matter feeds the meta pack:

```markdown
---
title: "Shipping small"
description: "Why I keep changes small and frequent."
date: 2024-04-02
---
```

`description` becomes the meta description and the Open Graph / Twitter summary.
Without it, the theme falls back to the site or page defaults.

## Sitemap and RSS

Hugo generates `sitemap.xml` and section RSS feeds automatically. Submit the
sitemap to search consoles as you would for any Hugo site.

## A note on `unsafe`

`markup.goldmark.renderer.unsafe = true` only affects how **your own**
author-written markdown is rendered (it allows raw HTML). Because this is a
static site with no user input, it carries none of the risk that the name might
suggest.
