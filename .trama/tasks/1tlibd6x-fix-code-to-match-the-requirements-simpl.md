---
column: done
technical: true
refs:
  - requirements/tech#General
drift: g54bu2mf
proposal: null
agent: false
created: 2026-10-18T21:13:14.196Z
finished: 2026-10-18T21:17:57.849Z
---
# Fix code to match the Requirements: Simple Icons runtime dependency

## What happens

The Specs panel draws technology logos from a brand-icon collection that is bundled into the editor's panel code. The General Requirements allow only three runtime libraries, and this one is not among them.

## What should happen

The panel draws its logos without an extra runtime library, as it already draws its generic icon, or the Requirements allow this library explicitly.

## Chosen option

**Draw the logos as built-in icons and drop the library**

Carry the logo paths in the panel code, like the generic icon, and remove the dependency. Recommended.

## Where in the code

extension/src/webview/specs/icons.ts
