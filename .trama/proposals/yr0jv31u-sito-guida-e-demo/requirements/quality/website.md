---
description: "Use when the work on the website touches performance, accessibility, privacy or reduced motion."
---
# Website

## website
- The site makes no request outside its own static files: no analytics, no cookies, no fonts or scripts from other hosts. Links to GitHub and the Marketplace are plain links.
- With `prefers-reduced-motion: reduce` the landing page shows every section in its final state without scroll animations, and the animated preview shows its poster image with a play button instead of playing by itself.
- The landing page does not load the demo's code: the animated preview is a lazily loaded video, and the demo bundle loads only on the demo page.
- Every page reaches WCAG 2.1 AA for contrast in both themes, every image has an `alt` text, and the header, the guide's navigation and every control are usable from the keyboard with a visible focus.

## demo
- Once loaded, the demo works without network: nothing the visitor or the scripted agent does leaves the browser, and nothing is stored in the browser except the theme choice of the site.
- The demo works on the last two versions of Chrome, Edge, Firefox and Safari on desktop.
