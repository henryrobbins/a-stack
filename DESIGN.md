# DESIGN.md

The interface is **monochrome, hairline-ruled, and typographically driven**:
no border radius, no shadows (except the subtle lift on a hovered grid cell),
no accent color, no dark mode. Hierarchy comes from type, rules, and
whitespace.

## Color

| Token | Value | Use |
|---|---|---|
| `bg` | `#ffffff` | Page background |
| `ink` | `#111111` | Text, primary buttons |
| `muted` | `#6b6b68` | Secondary text, labels, metadata |
| `line` | `#111111` | Section rules (label bars, top bar) |
| `hair` | `#dcdcda` | Row and cell rules, input borders |
| `link` | `#cfcfcc` | Link underlines in prose |

Never draw two rules on the same edge: label bars pull up by 1 px to collapse
onto the rule above them. Errors are shown in ink inside a `line` box, not in
red.

## Type

- **Public Sans** — 300 for body text, 500 for titles.
- **IBM Plex Mono** — navigation, labels, dates, metadata, code, buttons.
- Label bars: uppercase mono, 12 px, `letter-spacing: 0.16em`, muted.

## Layout

A top bar (app name in uppercase mono, mono nav with the active link
underlined, the Clerk `UserButton`) over a centered 1128 px column. Content
uses `--spacing-pad` (24 px) for rows and label bars and `--spacing-pad-wide`
(44 px) for prose; both collapse to 20 px below 900 px.

## Interaction

- Links thicken on hover with `-webkit-text-stroke: 0.045em`, which leaves
  glyph widths alone so text never reflows.
- Row links carry a `→` that slides right on hover.
- Linked grid cells lift (scale, outline, faint shadow) on hover.
- Transitions are disabled under `prefers-reduced-motion`.

## Primitives

`web/components/primitives/`: `LabelBar`, `Row`, `CellGrid`/`Cell`,
`DataTable`, `Prose`. shadcn components (`button`, `input`, `textarea`,
`checkbox`, `select`, `dialog`, `label`) are restyled through the tokens:
radius and shadow tokens are zero, and buttons are uppercase mono.

## Implementation

All tokens and component classes live in `web/app/globals.css` (`@theme` and
`@layer components`). Clerk components are matched through
`web/lib/appearance.ts`. To re-theme, change the tokens — never override
colors in component files.
