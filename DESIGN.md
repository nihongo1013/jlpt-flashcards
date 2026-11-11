# Lingua Pairs design system

## Mode

This is an Operate surface. The visitor's job is to choose two languages and study cards. Scanability, precision, keyboard use, and calm repetition matter more than decoration. The word on the card is the focal point, not the header.

## Visual thesis

A bilingual dictionary spread. The interface borrows from editorial reference books: unbleached paper, dark ink, one rotating annotation accent, hairline rules, compact margins, and a serif display face for words. It avoids the generic SaaS card kit, sakura theming, gradients, glass layers, and decorative pictographs.

## Sources integrated

- https://www.ui-skills.com/ : subtractive design, frontend design, better UI, impeccable, and design engineering principles.
- https://agenticskills.io/category/design : design and UI/UX skill index, including frontend design, web design guidelines, and interface review.
- https://github.com/plugin87/ux-ui-agent-skills : token architecture, WCAG 2.2 checks, state requirements, mobile first layout, no emoji, and objective quality gates.

## Tokens

Tokens follow a primitive to semantic to component model. Component CSS references semantic custom properties only, so light and dark themes swap at the semantic layer.

- Paper: `#F4F1E8`
- Raised paper: `#FBF9F2`
- Sunken paper: `#E9E4D6`
- Ink: `#211D24`
- Muted ink: `#5C5660`
- Decorative rule: `#D3CCBC`
- Night paper: `#17151A`
- Night raised: `#211E25`
- Night sunken: `#100F13`
- Night ink: `#F4F1E8`
- Night muted ink: `#B9B2A9`
- Night rule: `#3A3540`

Six accent themes use the same semantic token names. A language change selects a different theme at random from `moss`, `oxide`, `indigo`, `plum`, `teal`, and `umber`. The selected theme is saved with the other preferences. Every theme defines a light accent, light accent hover, light selected tint, dark accent, dark accent hover, and dark selected tint. The original Instagram mark is restored with `currentColor` so it follows the active theme. The settings control uses a sliders icon rather than the old gear.

Type roles:

- UI: system sans, body at 16px, line height 1.5.
- Display: Iowan Old Style, Palatino, Georgia, or the local serif fallback. Card text auto fits to the available side area with a binary size search. A Card text size slider in settings sets the maximum font size; the default is 96 px and fullscreen allows 1.5 times that. Words are vertically centered with their sound buttons.
- Data: system monospace for ordinals and codes, with tabular numerals.

Spacing uses a 4px rhythm: 4, 8, 12, 16, 20, 24, 32, 40, 48, and 64. Gaps come from the scale, related items sit closer than unrelated items, and the page has one gutter. The header is compact so the card list starts high on short screens.

Radii are intentionally small: 2px for cards, 4px for controls, and 999px only for pills. Motion uses 150ms for state changes and 220ms for one orchestrated fade, with `cubic-bezier(0.2, 0, 0, 1)`. Pressed controls scale to 0.96. All movement is disabled under `prefers-reduced-motion: reduce`.

## Compact card contract

- The visible card shows the word, its reading when needed, the paired sense, an ordinal, the pair label, and one category or part of speech tag.
- Language names are not repeated beside each side. The pair label beside the ordinal is enough, for example `6日本語 → English`.
- The duplicate part of speech text beside the pair label is removed because the tag already carries it.
- No status, count, or coverage line is shown in the product UI.
- The first screen gives cards a fixed height computed from the viewport, bottom player, and gap. At least two cards are fully visible without scrolling.
- Fullscreen reuses the exact first page card markup, fills the stage height, and reserves space for its navigation. It never needs an internal scroll.
- A bottom player stays on the first page with play or pause, previous, next, position, and progress. It is hidden while fullscreen is open.
- Fullscreen keeps previous and next buttons plus a counter. Keyboard arrows and space still navigate.
- A Playback speed slider controls speech rate and the gap between autoplay cards. A Card text size slider controls the maximum auto fitted font size. Both are saved with preferences.

## Measured contrast

Measured with a local WCAG relative luminance script across all six accent themes:

- Light accent on paper, minimum 5.25:1.
- Paper on light accent, minimum 5.25:1.
- Light accent hover on paper, minimum 7.46:1.
- Paper on light accent hover, minimum 7.46:1.
- Ink on selected tint, minimum 10.77:1.
- Muted ink on selected tint, minimum 4.62:1.
- Dark accent on night paper, minimum 9.07:1.
- Night paper on dark accent, minimum 9.07:1.
- Dark accent hover on night paper, minimum 11.60:1.
- Night paper on dark accent hover, minimum 11.60:1.
- Night ink on dark selected tint, minimum 8.72:1.
- Night muted ink on dark selected tint, minimum 4.69:1.

All text and action pairs exceed WCAG AA 4.5:1. Essential control borders use the ink token, which exceeds 3:1. The decorative rule token is below 3:1 and is never the only boundary of a control.

## Interaction and accessibility

- Every control has default, hover, focus visible, active, and disabled states.
- Focus is a 3px ink outline with a 2px offset, visible on both themes.
- Primary controls use the active accent token. Secondary controls are neutral with a border. Selected state uses the active tint token with ink text.
- Touch targets are at least 44px.
- Color is never the only state cue: labels, icons, text, and selected backgrounds carry meaning too.
- Sticky chrome does not cover focused cards: cards reserve scroll margin.
- Range sliders have visible labels and live value outputs. Speed changes apply to new utterances and autoplay gaps; text size changes refit visible cards immediately.
- Native selects are retained as a deliberate scope exception. They are styled to match the system and keep browser keyboard, mobile picker, and accessibility behavior. Replacing them with custom listboxes would add a large amount of JavaScript to a static, offline app.

## Copy and content

- No front or back wording. The two sides are simply the two selected languages.
- No provenance, counts, API claims, or source badges in the product UI. Those live in README, attribution files, and data metadata.
- No emoji, decorative pictographs, em dashes, or en dashes in product UI code.
- Empty, loading, selected, and active states are quiet but explicit.

## Workflow

After coding, commit on the active branch, push it, open a PR to `main`, and merge that PR. Do not leave completed work only in the working tree. No runtime translation API is used for card data.
