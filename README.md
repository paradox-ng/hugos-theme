# hugOS

**A "web desktop" theme for [Hugo](https://gohugo.io).**

hugOS turns a Hugo site into a small, draggable desktop environment. Each
section of your content becomes an **app**; pages, images and links open in
**movable, resizable windows**. It ships with a terminal, a web browser, a file
explorer, a photo gallery, a settings panel and a handful of small tools - all
driven by config and content, with no JavaScript framework and no build step
beyond Hugo itself.

> _Screenshot goes here - run `hugo server` and open <http://localhost:1313>._

## Why this exists

This started as an experiment: I wanted to learn Hugo properly and see how far a
**custom theme** could be pushed without reaching for a framework. The "desktop
in the browser" idea was an excuse to explore Hugo's templating, data files,
image processing, and page bundles, and to write a self-contained window manager
in vanilla JavaScript.

It is shared in case it's useful or fun to someone else - but it was **built for
my own use and taste**. It is opinionated, a little playful, and not trying to be
a general-purpose theme for every site. If it fits your needs, wonderful; if not,
that's expected.

## Built on

- **Hugo** (Extended recommended - only the photo gallery's WebP thumbnails
  require it) - templating, content model, image processing.
- **Vanilla JavaScript** - one file, no framework, no dependencies. Drag,
  resize, snap-tiling, a taskbar, deep-linkable windows, a terminal, and more.
- **Modern CSS** - custom properties for theming; the whole look is variable-driven.

Every window also renders as a plain, crawlable Hugo page, so the site stays
accessible and indexable even with JavaScript turned off.

## Features

- 🪟 Draggable, **resizable** windows - minimize, maximize, **edge-snap tiling**
- 🧩 **Config-driven** - the entire desktop is described in `data/desktop.yaml`
- 📁 **File Explorer** - any content section becomes a folder of files
- 📖 **Handbook / Wiki** - a section rendered as a searchable documentation wiki
- 🖼️ **Gallery** - image bundles with a lightbox and auto WebP thumbnails
- 🖥️ **Terminal** - a small Unix-like shell (`help`, `ls`, `open`, `neofetch`, …)
- 🌐 **Browser** - frames embeddable sites, renders a live GitHub profile
- ⚙️ **Settings** - live accent colour, wallpaper, and dark / light theme (persisted)
- 📱 Mobile-friendly, themed scrollbars, reduced-motion aware
- 🕰️ A few **easter eggs** for the curious (try the clock → "time travel")

## Quick start

1. **Add the theme** (Hugo module, git submodule, or copy into `themes/hugos-theme/`).

2. **Configure** `hugo.toml`:

   ```toml
   theme = "hugos-theme"

   [params]
     accent = "#3daee9"      # desktop accent colour

   [markup.goldmark.renderer]
     unsafe = true           # allow raw HTML in markdown content
   ```

3. **Describe the desktop** in `data/desktop.yaml`:

   ```yaml
   profile:
     name: "Paradox"
     role: "Fullstack Developer"
     initials: "P"

   apps:
     - { id: about,    label: "About",    icon: "📄", title: "About - Notes",   type: page,     source: "about", open: true }
     - { id: handbook, label: "Handbook", icon: "📖", title: "Handbook - Wiki",  type: wiki,     source: "docs",  menu: true }
     - { id: blog,     label: "Blog",     icon: "📰", title: "Blog - Files",     type: folder,   source: "blog" }
     - { id: photos,   label: "Photos",   icon: "🖼️", title: "Photos - Gallery", type: gallery,  source: "photos", menu: true }
     - { id: terminal, label: "Terminal", icon: ">_", title: "Terminal",         type: terminal, menu: true }
     - { id: settings, label: "Settings", icon: "⚙️", title: "Settings",         type: settings, menu: true }
   ```

   > Two optional per-app flags: **`open: true`** auto-opens the window on load;
   > **`menu: true`** lists the app in the Start menu (without it the app is
   > desktop-only).

4. **Add content** under `content/` and run `hugo server`.

The full documentation also lives in the theme itself: open the **Handbook** app
on the running site, or read the markdown in `content/docs/`.

## App types

| `type`     | Opens                                      |
|------------|--------------------------------------------|
| `page`     | a single markdown page as a document       |
| `folder`   | a content section as a file manager        |
| `wiki`     | a content section as a searchable wiki     |
| `gallery`  | an image page-bundle as a photo gallery    |
| `terminal` · `browser` · `settings` · `calculator` · `sticky` · `sysmon` · `trash` | built-in tools |
| `web`      | a desktop shortcut that opens a URL        |

See the **Handbook** for the complete reference, including content layout,
galleries, customization, SEO, and the easter eggs.

## Adding your content

You only ever edit two things: **`data/desktop.yaml`** (what apps exist) and
**`content/`** (what they open). No templates, no code.

Every app entry points its `source` at a piece of content. Here's how to add
each kind.

### A single page  →  `type: page`

```markdown
<!-- content/about.md -->
---
title: "About"
---
# Hi, I'm …
…your markdown…
```

```yaml
- { id: about, type: page, source: "about", label: "About", icon: "📄",
    title: "About - Notes", open: true }
```

`source: "about"` resolves to `content/about.md`.

### A blog / folder of posts  →  `type: folder`

Drop markdown files into a section folder; each becomes a file in the window,
sorted newest-first by `date`.

```text
content/blog/
├── my-first-post.md
└── another-post.md
```

```yaml
- { id: blog, type: folder, source: "blog", label: "Blog", icon: "📰",
    title: "Blog - File Explorer" }
```

Post front matter:

```yaml
---
title: "My first post"
date: 2024-05-01
tags: ["hello", "world"]
---
```

### A wiki / handbook  →  `type: wiki`

Same as a folder, but rendered as a searchable sidebar wiki. Order the pages
with a `weight` (lowest first) in each file's front matter.

```text
content/docs/
├── getting-started.md   #  weight: 10
└── advanced.md          #  weight: 20
```

```yaml
- { id: handbook, type: wiki, source: "docs", label: "Handbook", icon: "📖",
    title: "Handbook - Wiki", menu: true }
```

### A photo gallery  →  `type: gallery`

Make a **page bundle**: a folder with an `index.md` and the images beside it.

```text
content/photos/
├── index.md
├── 01-sunrise.jpg
└── 02-coast.jpg
```

```yaml
- { id: photos, type: gallery, source: "photos", label: "Photos", icon: "🖼️",
    title: "Photos - Gallery", menu: true }
```

Captions are derived from file names (`01-blue_hour.jpg` → "Blue Hour"); numeric
prefixes set the order. Raster images get WebP thumbnails (needs Hugo Extended);
SVGs are used as-is.

### Built-in tools & shortcuts

`terminal`, `browser`, `settings`, `calculator`, `sticky`, `sysmon` and `trash`
need no `source` — just give them an `id`, `label`, `icon`, `title`. A `web` app
is a shortcut that opens a URL in the browser:

```yaml
- { id: github, type: web, label: "GitHub", icon: "🐙",
    url: "https://github.com/you" }
```

### Where everything lives

```text
my-site/
├── hugo.toml
├── data/
│   └── desktop.yaml          # the whole desktop
└── content/
    ├── about.md              # → page
    ├── blog/                 # → folder
    ├── docs/                 # → wiki
    └── photos/               # → gallery (page bundle)
```

## Demo content

This repository includes a full set of placeholder content (lorem-ipsum) so you
can see every app working: an about page, a CV, a blog, a photo gallery, and the
Handbook. Replace it with your own - nothing in `content/` or
`data/desktop.yaml` is load-bearing for the theme.

## A note on the build

This theme was designed and built as an experiment, with substantial help from
**Claude Opus 4.8** (Anthropic) used as a pair-programming assistant. It was as
much about testing what that workflow could produce as it was about the theme
itself. Treat it accordingly: it's a personal project, shared openly, not a
maintained product with guarantees.

## Author

Made by **Paradox**.

- GitHub - [github.com/paradox-ng](https://github.com/paradox-ng)
- LinkedIn - [LinkedIn](https://www.linkedin.com/in/carles-romagosa/)

## License

[The Unlicense](LICENSE) — this is free and unencumbered software released into
the public domain. Do anything you want with it, with or without credit.
