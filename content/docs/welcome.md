---
title: "Getting Started"
weight: 10
date: 2024-01-10
---

# Getting Started

**hugOS** turns a Hugo site into a small "web desktop". Every section of your
content becomes an **app**; individual pages, images and links open in
**draggable, resizable windows**. There is no build step beyond Hugo and no
JavaScript framework - the whole desktop is plain HTML, CSS and one vanilla
JS file.

This Handbook is itself an example: it is the `docs/` content section rendered
as a wiki app. Everything you are reading lives in `content/docs/*.md`.

## The mental model

There are only three things to understand:

1. **`data/desktop.yaml`** describes the desktop - which apps exist, their
   icons, and what each one opens.
2. **`content/`** holds your actual material - markdown pages, sections of
   pages, and image bundles.
3. The theme wires the two together. An app in the YAML points at a piece of
   content (or at a built-in tool like the terminal), and the theme renders the
   icon, the launcher entry and the window.

If you can edit a YAML file and write markdown, you can run the whole thing
without touching any code.

## A two-minute tour

- **Double-click** a desktop icon (or single-click on touch) to open its window.
- **Drag** a window by its title bar. Drag it to the **top** to maximize, or to
  a **side** to tile it to half the screen.
- **Resize** from any edge or corner.
- Use the **panel** at the bottom: the launcher on the left, running windows in
  the middle, the clock on the right (click it for a calendar).
- **Right-click** the desktop for a context menu.
- Open the **Terminal** and type `help`.

## Where to go next

- **Installation & Setup** - add the theme to a Hugo site.
- **Configuring the Desktop** - the `data/desktop.yaml` reference.
- **Adding Content** - where files go and how they appear.
- **App Types Reference** - every kind of app you can declare.

> Tip: use the search box at the top of this Handbook to jump to any page.

## Source

hugOS is open source and released into the public domain (The Unlicense). Browse
the code, file an issue, or fork it on
[GitHub](https://github.com/paradox-ng/hugos-theme).
