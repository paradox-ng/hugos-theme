---
title: "Photo Galleries"
weight: 60
date: 2024-01-15
---

# Photo Galleries

A `gallery` app renders an **image page-bundle** as a thumbnail grid with a
lightbox.

## Folder layout

A page bundle is a folder with an `index.md` and the images beside it:

```text
content/photos/
├── index.md
├── 01-aurora.jpg
├── 02-dunes.jpg
└── 03-forest.svg
```

```markdown
<!-- content/photos/index.md -->
---
title: "Photos"
---
```

```yaml
# data/desktop.yaml
- { id: photos, label: "Photos", icon: "🖼️",
    title: "Photos - Gallery", type: gallery, source: "photos" }
```

## How images are handled

- **Raster images** (JPG, PNG, WebP) are resized to fit a 600×600 box and
  encoded as **WebP** thumbnails, loaded lazily. The lightbox shows the full
  original. (WebP encoding needs Hugo Extended - see **Installation & Setup**.)
- **SVGs** are used as-is for both thumbnail and full view.

## Captions

Captions are derived automatically from the file name: numeric prefixes and
separators are stripped and the rest is title-cased. So `01-blue_hour.jpg`
becomes **"Blue Hour"**. Name your files descriptively and you get captions for
free.

## Ordering

Images are shown in **file-name order**, which is why the demo prefixes them
`01-`, `02-`, `03-`. Use zero-padded numeric prefixes to control the sequence.

## Multiple galleries

Each gallery is its own bundle and its own app. Add another folder and another
app entry:

```text
content/travel/
├── index.md
└── 01-lisbon.jpg
```

```yaml
- { id: travel, label: "Travel", icon: "✈️",
    title: "Travel - Gallery", type: gallery, source: "travel" }
```
