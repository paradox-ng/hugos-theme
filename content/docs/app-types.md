---
title: "App Types Reference"
weight: 40
date: 2024-01-13
---

# App Types Reference

The `type` field on each app decides what it does. Types fall into two groups:
those that **open your content**, and **built-in tools** that need no content.

## Content apps

| `type`    | Opens                                    | Requires              |
|-----------|------------------------------------------|-----------------------|
| `page`    | a single markdown page as a document     | `source: "<page>"`    |
| `folder`  | a content section as a file manager      | `source: "<section>"` |
| `wiki`    | a content section as a sidebar wiki      | `source: "<section>"` |
| `gallery` | an image page-bundle as a photo gallery  | `source: "<bundle>"`  |

### `page`

Opens one markdown file in a document window.

```yaml
- { id: about, label: "About Me", icon: "📄",
    title: "About Me - Notes", type: page, source: "about" }
```

`source: "about"` resolves to `content/about.md`.

### `folder`

Renders a whole content section as a file-manager window. Each file is a tile;
clicking one opens it in its own document window. Files are listed newest-first
by `date`.

```yaml
- { id: blog, label: "Blog", icon: "📰",
    title: "Blog - File Explorer", type: folder, source: "blog" }
```

`source: "blog"` lists every page in `content/blog/`.

### `wiki`

Like `folder`, but renders the section as a documentation wiki: a searchable
sidebar of page titles on the left, the selected page on the right. This
Handbook is a `wiki`. Order the pages with a `weight` in each file's front
matter (lowest first).

```yaml
- { id: handbook, label: "Handbook", icon: "📖",
    title: "Handbook - Wiki", type: wiki, source: "docs" }
```

### `gallery`

Renders an image page-bundle as a thumbnail grid with a lightbox. Raster images
(JPG/PNG/WebP) get auto-generated WebP thumbnails via Hugo image processing;
SVGs are used as-is.

```yaml
- { id: photos, label: "Photos", icon: "🖼️",
    title: "Photos - Gallery", type: gallery, source: "photos" }
```

See **Photo Galleries** for the folder layout.

## Built-in tools

These need no `source`.

| `type`       | What it is |
|--------------|------------|
| `terminal`   | A small shell. Type `help` for commands. |
| `browser`    | A web browser. Frames embeddable sites, renders a live GitHub profile, falls back gracefully when a site blocks embedding. |
| `settings`   | Live accent colour, wallpaper, and dark / light theme (persisted per browser). |
| `calculator` | A working calculator. |
| `sticky`     | Sticky notes you can write on; saved in the browser. |
| `sysmon`     | A mock system monitor with live-ish graphs. |
| `trash`      | A trash can. |

```yaml
- { id: terminal, label: "Terminal", icon: ">_", title: "Terminal",      type: terminal }
- { id: browser,  label: "Browser",  icon: "🌐", title: "Browser",       type: browser }
- { id: settings, label: "Settings", icon: "⚙️", title: "Settings",      type: settings }
- { id: calc,     label: "Calc",     icon: "🧮", title: "Calculator",    type: calculator }
- { id: notes,    label: "Notes",    icon: "🗒️", title: "Sticky Notes",  type: sticky }
- { id: monitor,  label: "Monitor",  icon: "📊", title: "System Monitor", type: sysmon }
- { id: trash,    label: "Trash",    icon: "🗑️", title: "Trash",         type: trash }
```

## Shortcuts

| `type` | What it is |
|--------|------------|
| `web`  | A desktop icon that opens a URL in the browser app. Needs `url`. |

```yaml
- { id: github, label: "GitHub", icon: "🐙", type: web, url: "https://github.com/octocat" }
```

> A `web` shortcut needs a `browser` app present to open into.
