---
description: "Use when implementing calculations, limits, policies or other business rules behind the Model's conditions and consequences."
---
# Business rules

## General

## task
- A Task that is not technical must reference at least one Model element, and may add Requirements. A Technical Task must reference no Model element, only Requirements if any. Every reference must resolve to an existing Model element or Requirement section when the Task is created.
- Any move between the three columns is allowed, in either direction. The Board refuses dropping a card on the To decide column or on the column it already is in.

## drift
- A Drift must reference at least one Model element or Requirement, and every reference must resolve when it is created. It may only be resolved once: resolving an already resolved Drift is refused.
- Fixing the code creates a Task titled "Fix code to match the Model: <Drift title>" (or "…the Requirements: …" when the Drift points only to Requirements), pointing to the Drift's references, linked to the Drift, with the Drift's description as its body. It is a Technical Task exactly when the Drift points only to Requirements.
- Accepting the attached Proposal is refused when the Drift has none.
