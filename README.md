# Avogadro Simple

A simple, one-screen web version of [Avogadro](https://github.com/avogadro) —
the free, open-source molecule editor for computational chemistry, molecular
modeling, bioinformatics, and materials science.

**This is not the C++ desktop Avogadro app.** It is a simplified remake that
runs in a browser with no install: a 2D-canvas projected 3D viewer, plain-language
tools, and the same core workflows as the Avogadro manual (Navigate, Draw, Bond,
Measure, Erase). It cannot run Avogadro's C++ code, plugins, or quantum-chemistry
calculations.

## Open it

- **Easiest:** open `index.html` in a browser (double-click, or serve the folder
  with any static server). No build step, no install.
- **GitHub Pages:** copy the contents of this folder to the root of a public
  repository, then enable Pages from the main branch, root folder. The site
  then loads at `https://<username>.github.io/<repo>/`.

It works offline except for the Google Fonts (Atkinson Hyperlegible / IBM Plex
Mono), which fall back to system fonts when there is no connection. There are
no other external JavaScript dependencies.

## What it does — all functions kept

- **10 one-tap presets:** water, methane, ammonia, carbon dioxide, ethane,
  ethanol, benzene, glucose, caffeine, aspirin. It opens on spinning water.
- **6 tools:** Spin view (drag; scroll or pinch to zoom), Select, Add atom,
  Make bond, Measure (2 atoms = distance, 3 atoms = angle), Erase
  (atom, or the middle of a bond for just the bond).
- **12-element picker** in standard CPK colours, with single / double / triple
  bonds. Dragging from an atom grows a new atom bonded to it, snapped to a
  normal bond length.
- **3 views:** ball-and-stick, stick, space-filling.
- **Live formula and molar mass**, geometry cleanup (bond lengths pulled to
  normal values, atoms re-centred), undo (60 steps), and clear all.
- **XYZ, behind one "advanced options" toggle:** download, copy, update,
  load from pasted XYZ text, and open an `.xyz` file. XYZ files made here
  open in desktop Avogadro.

## Chemistry rules enforced

- Standard CPK colours and standard atomic weights.
- No atom can exceed its valence: carbon 4, nitrogen 3, oxygen 2, hydrogen /
  halogens 1, boron 3, silicon 4, phosphorus 5, sulfur 6. Both ends of a new
  bond are checked, including the new atom when dragging to grow one.
- Formulas use conventional order (C, then H, then alphabetical; ammonia is
  NH₃, water is H₂O). Molar masses are the sum of standard atomic weights.
- XYZ carries no bond information, so importing XYZ infers single bonds from
  distance (covalent radii × 1.30) capped by valence. A re-imported molecule
  keeps its formula but **loses double/triple bond orders** — that is a limit
  of the XYZ format, not a bug in this app.

## Files

| File | What it is |
| --- | --- |
| `index.html` | Page structure and all controls |
| `css/style.css` | All styling, light + dark mode |
| `js/chemistry.js` | Elements, masses, valences, formulas, bond-length rules |
| `js/molecules.js` | The 10 presets (coordinates and bonds, unchanged from the original single-file version) |
| `js/app.js` | Viewer, tools, cleanup, undo, XYZ |
| `README.md` | This file |

## Fixes over the original single-file version

The original 36 KB single-file export (`avogadro-simple.html`) was audited
end-to-end before this rebuild. Its presets were chemically sound (see
validation below), but these real bugs were found and fixed here:

1. **Stale tool state after erase/clear** — `bondFirst` and `measureSel` were
   not reset, so a bond tap after Clear All could dereference a deleted atom
   and throw. All state-changing actions now reset or remap tool indices.
2. **New-atom valence not checked when dragging to grow** — a triple bond
   dragged onto a new hydrogen created H with bond order 3. Both ends are
   checked now.
3. **Ammonia formula printed as H₃N** — strict alphabetical order with no
   carbon. Conventional order is used now, so ammonia reads NH₃.
4. **XYZ import trusted its input** — short lines or non-numeric coordinates
   produced NaN atoms or a raw TypeError, and a count of 0 produced a
   misleading "loaded" toast. Every line is validated with a plain-language
   line-numbered error.
5. **Pinch zoom was promised but missing** — the hint said "scroll or pinch
   to zoom" but only wheel zoom existed. Two-finger pinch zoom is implemented.
6. **Tiny drags created overlapping atoms** — a drag just over the moved
   threshold was not rescaled to the ideal bond length. Grown atoms are now
   always snapped to the ideal length along the drag direction.
7. **Projection measured the canvas once per atom per frame** — the canvas
   rect and scale are now measured once per draw.
8. **Checkboxes had no explicit accessible name** — all advanced checkboxes
   and the zoom slider now carry `aria-label`s.

Observations that are *not* errors, kept as-is: glucose has one C–C distance
of about 1.70 Å (stretched, but inside the 0.6–1.9 Å validation band; cleanup
pulls it to 1.54 Å); `screenToWorld` is an approximation because a 2D tap
cannot supply depth, which is why grown atoms are snapped to ideal length.

## Validation

Run from this folder (Node required, no packages):

```sh
node --check js/chemistry.js
node --check js/molecules.js
node --check js/app.js
```

Preset validation (Hill/conventional formula, molar mass within 0.06 g/mol,
zero valence violations, no duplicate or out-of-range bonds, all bond lengths
0.6–1.9 Å) passes for all 10 presets. See the audit report for the exact
per-preset results.

## Still unverified

- Live browser probing (tapping atoms, dragging, pinch, and the XYZ
  download/open-file handoffs) was not run in this rebuild — the audit was
  static code review plus Node validation. The builder's earlier live probes
  of the single-file version passed for preset loading, caffeine readout,
  space-filling view, cleanup, and undo, and the handlers here are the same
  logic with the fixes above, but a fresh browser pass is the remaining check
  before this replaces the live GitHub Pages version.
