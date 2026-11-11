# Lingua Pairs design system

## Mode

This is an Operate surface. The visitor's job is to choose two languages and study cards. Scanability, precision, keyboard use, and calm repetition matter more than decoration. The word on the card is the focal point, not the header.

## Visual thesis

A bilingual dictionary spread. The interface borrows from editorial reference books: unbleached paper, dark ink, one annotation accent, hairline rules, generous margins, and a serif display face for words. It avoids the generic SaaS card kit, sakura theming, gradients, glass layers, and decorative pictographs.

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
- Annotation green: `#2F5D50`
- Highlighter citron: `#D8E84A`
- Oxide red: `#A63D2F`
- Decorative rule: `#D3CCBC`
- Night paper: `#17151A`
- Night raised: `#211E25`
- Night sunken: `#100F13`
- Night annotation: `#8FD3B6`
- Night highlighter: `#35481C`

Type roles:

- UI: system sans, body at 16px, line height 1.5.
- Display: Iowan Old Style, Palatino, Georgia, or the local serif fallback. Cards use 36px to 60px for the first term and 30px to 48px for the second term.
- Data: system monospace for ordinals, counters, and codes, with tabular numerals.

Spacing uses a 4px rhythm: 4, 8, 12, 16, 20, 24, 32, 40, 48, and 64. Gaps come from the scale, related items sit closer than unrelated items, and the page has one gutter.

Radii are intentionally small: 2px for cards, 4px for controls, and 999px only for pills. Motion uses 150ms for state changes and 220ms for one orchestrated fade, with `cubic-bezier(0.2, 0, 0, 1)`. Pressed controls scale to 0.96. All movement is disabled under `prefers-reduced-motion: reduce`.

## Measured contrast

Measured with a local WCAG relative luminance script, light theme:

- Ink on paper: 14.69:1.
- Muted ink on paper: 6.29:1.
- Ink on raised paper: 15.75:1.
- Annotation green on paper: 6.63:1.
- Paper on annotation green: 6.63:1.
- Ink on highlighter citron: 12.29:1.
- Muted ink on highlighter citron: 5.27:1.

Measured with the same script, dark theme:

- Paper on night paper: 16.05:1.
- Muted paper on night paper: 8.63:1.
- Paper on night raised: 14.56:1.
- Night annotation on night paper: 10.50:1.
- Night paper on night annotation: 10.50:1.
- Paper on night highlighter: 8.88:1.
- Muted paper on night highlighter: 4.77:1.

Text and action pairs exceed WCAG AA 4.5:1. Essential control borders use the ink token, which exceeds 3:1. The decorative rule token is below 3:1 and is never the only boundary of a control.

## Interaction and accessibility

- Every control has default, hover, focus visible, active, and disabled states.
- Focus is a 3px ink outline with a 2px offset, visible on both themes.
- Primary controls use the annotation token. Secondary controls are neutral with a border. Selected state uses the highlighter token with ink text.
- Touch targets are at least 44px.
- Color is never the only state cue: labels, icons, text, and selected backgrounds carry meaning too.
- Sticky chrome does not cover focused cards: cards reserve scroll margin.
- Native selects are retained as a deliberate scope exception. They are styled to match the system and keep browser keyboard, mobile picker, and accessibility behavior. Replacing them with custom listboxes would add a large amount of JavaScript to a static, offline app.

## Copy and content

- No front or back wording. The two sides are simply the two selected languages.
- No provenance, counts, API claims, or source badges in the product UI. Those live in README, attribution files, and data metadata.
- No emoji, decorative pictographs, em dashes, or en dashes in product UI code.
- Empty, loading, selected, and active states are quiet but explicit.

## Workflow

After coding, commit on the active branch, push it, open a PR to `main`, and merge that PR. Do not leave completed work only in the working tree. No runtime translation API is used for card data.
