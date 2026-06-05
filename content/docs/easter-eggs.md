---
title: "Easter Eggs"
weight: 90
date: 2024-01-18
---

# Easter Eggs

hugOS hides a few things for the curious. None of them affect your content or
the plain, indexable pages - they are pure decoration. Here is the full list, so
nothing stays a secret if you don't want it to.

## Time travel

Click the **clock** in the panel, then the 🕰 button in the calendar (or use the
desktop's context menu). Pick a year and the whole desktop re-skins itself:

- **1995** - a Windows 95 style: grey bevels, the classic title bars, the pixel
  font, even the boot splash.
- **2001** - a Windows XP style: the blue Luna taskbar, the green Start button,
  Bliss-like wallpaper.
- **2009** - a Windows 7 / Aero style: glass taskbar and title bars, the waving
  flag wallpaper.

Each jump plays an era-appropriate boot splash, and the choice is remembered
until you travel back to the present.

## Era surprises

- **2001** brings back a familiar paperclip **assistant** in the corner. Click
  it for tips; close it with the ×.
- **2009** greets you with a **"Configuring Windows updates…"** screen the first
  time you arrive. Do not turn off your computer.

## Crash screens

Press **Ctrl + Alt + B** for a crash screen appropriate to the current era:

- modern desktop → a **Linux kernel panic** dump,
- 1995 → a Windows 9x blue screen,
- 2001 / 2009 → a Windows XP / 7 STOP error.

Press any key or click to recover. (Some game icons may "crash" on purpose too.)

## The terminal

The **Terminal** app is a small Unix-like shell. Type `help` to see every
command - there are a couple of playful ones in there alongside the useful
`open`, `ls`, and `neofetch`.

## Turning them off

The easter eggs live entirely in the theme's JavaScript and CSS. If a site of
yours wants none of them, they can be removed from
`themes/hugos-theme/static/js/desktop.js` without affecting the content apps.
