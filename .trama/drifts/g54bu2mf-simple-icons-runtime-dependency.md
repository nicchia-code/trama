---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#General
proposal: null
task: 1tlibd6x
origin: null
critical: false
option: 1
note: null
resolvedBy: 456gwpy9
created: 2026-10-18T20:39:03.145Z
---
# Simple Icons runtime dependency

## What happens

The Specs panel draws technology logos from a brand-icon collection that is bundled into the editor's panel code. The General Requirements allow only three runtime libraries, and this one is not among them.

## What should happen

The panel draws its logos without an extra runtime library, as it already draws its generic icon, or the Requirements allow this library explicitly.

## Fix options

### Draw the logos as built-in icons and drop the library

Carry the logo paths in the panel code, like the generic icon, and remove the dependency. Recommended.

### Keep the library and record it as an allowed runtime library

Keep the library and update the Requirements so it is an allowed runtime library, a developer decision.

## Where in the code

extension/src/webview/specs/icons.ts
