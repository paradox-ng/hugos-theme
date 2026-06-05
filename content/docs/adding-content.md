---
title: "Adding Content"
weight: 50
date: 2024-01-14
---

# Adding Content

Content lives in `content/`, exactly as in any Hugo site. The desktop file
decides which content shows up as which app; this page covers how to write the
content itself.

## A single page

Create a markdown file and point a `page` app at it.

```markdown
<!-- content/about.md -->
---
title: "About Me"
---

# Hi, I'm Paradox

Your content here…
```

```yaml
# data/desktop.yaml
- { id: about, label: "About Me", icon: "📄",
    title: "About Me - Notes", type: page, source: "about" }
```

> The document window renders whatever the markdown produces, so the leading
> `# Heading` is your page title.

## A section (folder or wiki)

A **section** is a folder of pages under `content/`. Add files to it and they
appear automatically - no code or config changes per file.

```text
content/blog/
├── first-post.md
├── shipping-small.md
└── design-systems.md
```

```yaml
- { id: blog, label: "Blog", icon: "📰",
    title: "Blog - File Explorer", type: folder, source: "blog" }
```

Each post is a normal Hugo page:

```markdown
---
title: "Shipping small"
date: 2024-04-02
tags: ["process", "engineering"]
---

Body text…
```

### Front matter that matters

| field   | used for |
|---------|----------|
| `title` | The file/tile name and the window title. |
| `date`  | Sort order in `folder` apps (newest first) and the shown date. |
| `tags`  | Shown next to the file in `folder` apps. |
| `weight`| Sort order in `wiki` apps (lowest first). |
| `draft` | `true` hides the page from normal builds. |

## Ordering

- **`folder` apps** sort by `date`, newest first.
- **`wiki` apps** sort by `weight`, lowest first - give each page a `weight` to
  control the sidebar order (this Handbook uses 10, 20, 30, …).

## Writing markdown

Standard Hugo / Goldmark markdown is supported - headings, lists, tables, code
fences with highlighting, blockquotes, images, links. With
`markup.goldmark.renderer.unsafe = true` (see **Installation & Setup**) you can
also drop in raw HTML. The **Markdown Showcase** page shows how everything
renders inside a window.

## Drafts and dates

- A page with `draft: true` is skipped unless you run `hugo server -D`.
- A page with a **future** `date` is skipped unless you run `hugo server -F`.
