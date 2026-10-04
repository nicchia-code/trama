---
status: approved
base:
  work/drift.md: 806d1a3257da480124ccd6046a80d0628166db22fa018ad50f7ab196bbc31d3c
  model-changes/proposal.md: d9136fb8387249e8605839e03dda32802d68b0e5d3b9e80cca06cead3b287d63
  actors/agent.md: 6f3b18dcb0099b741aa4f580ce53e73b5a79d0a93fdf82c34ab46b639934c2ab
  actors/developer.md: bb88fafdf417daa03a73791cac9944e78a9f019a57508be1f0df8e3222d056a2
  requirements/ui.md: 802709f756e3333f12b3b846b8e69d72606c055fad47a4bf7cd13cad17882537
  requirements/data.md: fafae547da5cbec52f1fb5a5b862e91216cb3532738d76cc37d119476cd86b62
  requirements/rules.md: f06232dea96b3fddf78fc31da824640296a9fa14bd0c067fb57b3368fa2e5b0f
  requirements/tech.md: f8f73809cfc9ca467ae3d01a1c486aed5dbe7b2074dc9089dcd7c0bb65536922
delete: []
---
# Drifts compare what happens with what should happen

Drifts are hard to decide: Fix code, Accept Proposal and Dismiss do not say what changes. A Drift now states two sides, what the code does and what the Model or Requirement says should happen, shown side by side. The developer always keeps one side: the code side approves the attached Proposal or, with none, closes the Drift with nothing changed; the other side has the code fixed. Decisions to check: the consequence line under each Keep this button; the alert and the stale-Proposal rework instruction text; every unapprovable attached Proposal (invalid, waiting for others, already approved) gets the same alert as the listed ones; the replaced Proposal is rejected automatically; resolved Drifts keep their old body and are shown as one block; only the 3 open Drifts are rewritten.
