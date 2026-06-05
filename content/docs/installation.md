---
title: "Installation & Setup"
weight: 20
date: 2024-01-11
---

# Installation & Setup

hugOS is a standard Hugo theme. **Hugo Extended** (v0.146.0 or newer) is
recommended. It is strictly required only if your photo galleries contain
**raster** images (JPG/PNG) - those get converted to WebP thumbnails, and WebP
encoding needs Extended. SVG-only galleries and everything else run on standard
Hugo just fine. (Check your build with `hugo version`; Extended shows
`+extended` in the string.)

## 1. Add the theme

Pick whichever method matches how you manage your site.

### Hugo Modules (recommended)

```bash
hugo mod init github.com/you/your-site
```

```toml
# hugo.toml
[module]
  [[module.imports]]
    path = "github.com/paradox-ng/hugos-theme"
```

### Git submodule

```bash
git submodule add https://github.com/paradox-ng/hugos-theme themes/hugos-theme
```

```toml
# hugo.toml
theme = "hugos-theme"
```

### Manual copy

Drop the theme into `themes/hugos-theme/` and set `theme = "hugos-theme"`.

## 2. Minimal configuration

```toml
# hugo.toml
baseURL = "https://example.com/"
title   = "My Desktop"
theme   = "hugos-theme"

[params]
  accent = "#3daee9"     # desktop accent colour

[markup.goldmark.renderer]
  unsafe = true          # allow raw HTML in markdown content
```

> `unsafe = true` is recommended. The theme's documents render author-written
> markdown, and several niceties (badges, inline HTML) rely on it. It does **not**
> affect visitor input - this is a static site.

## 3. Add the desktop file

Create `data/desktop.yaml`. The **Configuring the Desktop** page documents every
field and includes a complete example you can copy and edit.

## 4. Run it

```bash
hugo server
```

Open <http://localhost:1313>. Edits to content, data and templates live-reload.

## Building for production

```bash
hugo --minify
```

The finished static site is written to `public/`. Host it anywhere that serves
files - GitHub Pages, Netlify, Cloudflare Pages, an S3 bucket, your own server.

## Project layout

```text
my-site/
├── hugo.toml
├── data/
│   └── desktop.yaml        # the whole desktop is described here
├── content/
│   ├── about.md            # a single page  -> "page" app
│   ├── blog/               # a section      -> "folder" app
│   │   ├── first-post.md
│   │   └── second-post.md
│   ├── docs/               # a section      -> "wiki" app (this Handbook)
│   └── photos/             # an image bundle -> "gallery" app
│       ├── index.md
│       └── 01-photo.jpg
└── themes/hugos-theme/
```
