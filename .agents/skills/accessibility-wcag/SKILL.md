---
name: accessibility-wcag
description: "Conformidade WCAG 2.1 AA, HTML semântico, ARIA, navegação por teclado, contraste e compliance BFSG."
---

Audit this project for accessibility compliance (WCAG 2.1 AA). Provide specific violations and fixes.

1. SEMANTIC HTML — Are page landmarks used correctly: <header>, <nav>, <main>, <footer>, <aside>, <section>, <article>? Are headings in logical order (h1 → h2 → h3, no skipping levels)? Are buttons and links used correctly (button for actions, a for navigation)?

2. KEYBOARD NAVIGATION — Tab through the entire app mentally. Can all interactive elements be reached and activated with keyboard only? Is the focus order logical (top-left to bottom-right)? Is there a visible focus indicator (not just the default browser outline)? Is there a "Skip to main content" link?

3. COLOR CONTRAST — Check all text/background combinations: Normal text (under 18px or 14px bold): minimum 4.5:1 ratio. Large text (18px+ or 14px+ bold): minimum 3:1 ratio. UI components and icons: minimum 3:1 against adjacent colors. Flag every combination that fails.

4. IMAGES & MEDIA — Do all images have descriptive alt text? Are decorative images marked with alt=""? Do videos have captions? Are SVG icons accessible (title element or aria-label)?

5. FORMS — Does every input have an associated <label>? Are error messages programmatically associated with their input (aria-describedby)? Are required fields marked with aria-required="true"? Are errors announced to screen readers (role="alert")?

6. ARIA USAGE — Check for incorrect ARIA: aria-label on elements that already have visible text, missing aria-expanded on toggles, missing aria-selected on tabs, interactive divs without role="button" and tabIndex="0".

For each violation: WCAG criterion number (e.g., 1.4.3 Contrast), the specific element/component, the failure, and the corrected code.
