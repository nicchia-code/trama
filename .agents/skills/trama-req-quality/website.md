# Requirements: Qualità, Website

Use when the work on the website touches performance, accessibility, privacy or reduced motion.

## website

- The site makes no request outside its own static files: no analytics, no cookies, no fonts or scripts from other hosts. Links to GitHub and the Marketplace are plain links.
- With `prefers-reduced-motion: reduce` the landing page shows every section in its final state without scroll animations, and annotated screenshots show their marks and notes already drawn.
- Screenshots below the first screen load lazily, and every image declares its size so the page does not jump while they load.
- Every page reaches WCAG 2.1 AA for contrast in both themes, also the notes over the screenshots; every image has an `alt` text; the header, the guide's navigation, the screenshots and the enlarged view are usable from the keyboard with a visible focus.
