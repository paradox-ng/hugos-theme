---
title: "Customization & Settings"
weight: 70
date: 2024-01-16
---

# Customization & Settings

There are two layers of customization: **defaults you set in config**, and
**choices visitors make** in the Settings app (saved in their browser).

## Defaults in config

```toml
# hugo.toml
[params]
  accent = "#3daee9"     # desktop accent colour
```

The accent colour drives highlights, focus rings, the launcher hover, and links.
Pick something that reads well on both the dark and light themes.

## The Settings app

Add a `settings` app and visitors get a live control panel:

```yaml
- { id: settings, label: "Settings", icon: "⚙️",
    title: "System Settings", type: settings }
```

From it they can change, live:

- **Accent colour** - any colour.
- **Theme** - dark or light.
- **Wallpaper** - pick from the built-in set.

## Persistence

Every visitor choice is stored in their browser's `localStorage`, so the desktop
looks the same when they come back. Nothing is sent to a server - this is a
static site. Keys used: theme, accent, wallpaper, and (if they've played with
it) the retro era. Clearing site data resets everything to your config defaults.

## Profile and branding

The launcher header, the terminal `whoami`, and page metadata read from
`profile` in `data/desktop.yaml`:

```yaml
profile:
  name: "Paradox"
  role: "Fullstack Developer"
  initials: "P"
  email: "paradox@example.com"
  about: "One-line bio."
```

## Going further

The desktop's look lives in `themes/hugos-theme/static/css/desktop.css`, built almost
entirely on CSS custom properties (`--accent`, `--panel-h`, window colours, and
so on). If you want to fork the visual design, that file is the place - overriding
a handful of variables changes the whole feel without touching the JavaScript.
