---
status: approved
base:
  work/drift.md: 07f3438528fbe289d61477020110e00f00bb009a5ff21e9c33469875e8dec18c
  requirements/ui.md: 0a481556dfffe63ed4498a9d57d9221c9a7c52d6f42997d49f48010e77ade377
  requirements/data.md: 396ae78b83826bfc4cd2d6a56c061ddf3a66ef334f3f538c2dffa73c415d13eb
  requirements/rules.md: 9752794002a3b1091bb4ee8ed5cad70f20eff558415b7243f018751bd159aa0e
  requirements/tech.md: 6908bc71b12e6e724a9fb1c081b27d7c97d1b7bd28d4b28f9247b5b6ee491e2d
delete: []
---
# Drifts written at a higher level and Markdown in every panel

Descriptions in the editor panel were plain text and Drifts read like code reviews full of identifiers. All prose shown in the panel is now Markdown, and Drifts are written for a developer who reads them at a glance, with code locations moved to an optional third section. Decisions to check (made from the interview, not asked): the Markdown subset (no tables, raw HTML shown as text, only http/https links); the Task body toggle starts closed and is remembered for the session like design cards; the fix Task created from a Drift also carries Where in the code; the Where section is collapsed and sits under the two columns; the length guide is about 100 words per side and is not enforced; CLI output keeps raw Markdown; resolved Drifts are unchanged.
