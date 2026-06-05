---
title: "Configuring the Desktop"
weight: 30
date: 2024-01-12
---

# Configuring the Desktop

Everything on the desktop is declared in **`data/desktop.yaml`**. There are three
top-level keys: `profile`, `bookmarks` and `apps`.

## `profile`

Identity shown in the launcher header, the About/terminal `whoami`, and meta
tags.

```yaml
profile:
  name: "Paradox"
  role: "Fullstack Developer"
  initials: "P"                      # shown in the launcher avatar
  email: "paradox@example.com"
  about: "One-line bio for the launcher and terminal."
```

## `bookmarks`

Tiles shown on the browser app's home page.

```yaml
bookmarks:
  - { label: "GitHub", icon: "🐙", url: "https://github.com/octocat" }
  - { label: "Hugo",   icon: "📘", url: "https://gohugo.io" }
```

## `apps`

A list. **Each entry becomes a desktop icon, a launcher entry, and a window.**
Order in the list is the order of the icons.

```yaml
apps:
  - { id: about, label: "About Me", icon: "📄",
      title: "About Me - Notes", type: page, source: "about", open: true }
```

### Fields

| field    | required | meaning |
|----------|----------|---------|
| `id`     | yes      | Unique key. Used for the window, the URL hash, and `open <id>` in the terminal. |
| `label`  | yes      | Text under the desktop icon and in the launcher. |
| `icon`   | yes      | An emoji or short string (e.g. `>_`). |
| `title`  | usually  | The window title-bar text. |
| `type`   | yes      | What kind of app - see **App Types Reference**. |
| `source` | some     | Which content the app opens (a page, section or bundle). Depends on `type`. |
| `url`    | some     | For `web` shortcuts. |
| `open`   | no       | `true` opens the window automatically on load. |

### Auto-opening windows

Add `open: true` to any app and its window opens on load. Flag several and they
cascade; flag none for an empty desktop the visitor opens themselves.

```yaml
- { id: about, type: page, source: "about", open: true }
- { id: blog,  type: folder, source: "blog", open: true }
```

### A complete example

```yaml
profile:
  name: "Paradox"
  role: "Fullstack Developer"
  initials: "P"
  email: "paradox@example.com"
  about: "Designer-developer who builds useful things for the web."

bookmarks:
  - { label: "GitHub", icon: "🐙", url: "https://github.com/octocat" }

apps:
  - { id: about,    label: "About Me",  icon: "📄", title: "About Me - Notes",      type: page,    source: "about", open: true }
  - { id: handbook, label: "Handbook",  icon: "📖", title: "Handbook - Wiki",       type: wiki,    source: "docs" }
  - { id: blog,     label: "Blog",      icon: "📰", title: "Blog - File Explorer",  type: folder,  source: "blog" }
  - { id: photos,   label: "Photos",    icon: "🖼️", title: "Photos - Gallery",      type: gallery, source: "photos" }
  - { id: terminal, label: "Terminal",  icon: ">_", title: "Terminal",             type: terminal }
  - { id: settings, label: "Settings",  icon: "⚙️", title: "System Settings",       type: settings }
  - { id: browser,  label: "Browser",   icon: "🌐", title: "Browser",              type: browser }
  - { id: github,   label: "GitHub",    icon: "🐙",                                  type: web, url: "https://github.com/octocat" }
```

## Deep links

Each window is deep-linkable. Opening `https://example.com/#about` opens the
About window on load. The URL hash updates as you focus windows, so links are
shareable.
