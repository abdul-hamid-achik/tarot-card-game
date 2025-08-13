# Shared Deck Assets

Canonical location for curated card art decks used across web and clients.

Structure:

```
packages/assets/
  decks-demo/
    deck.json               # manifest for the deck
    back/
      1x.png
      2x.png
    cards/
      major_00/
        2x.png
      wands_01/
        2x.png
    sources/                # optional Aseprite files
      major_00.aseprite
```

IDs and naming:

- Majors: `major_00`..`major_21` (Rider–Waite numbering; Strength 08, Justice 11)
- Minors: `{suit}_{01..10}` or `{suit}_{page|knight|queen|king}` where suit is one of `wands|cups|swords|pentacles`
- Prefer providing `2x.png` assets. `1x` and `5x` are optional.

The `deck.json` manifest lists available images per card and the default scale to display.


