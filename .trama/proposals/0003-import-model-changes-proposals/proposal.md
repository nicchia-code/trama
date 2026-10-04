---
status: approved
kind: import
requires:
  - "0001"
  - "0002"
base:
  model-changes/feature.md: new
  model-changes/proposal.md: new
  requirements/data.md: 48290c45b405f4faa02c48cdeecbb1a53a4f4e76089f6f74a8fc562edbdc5463
  requirements/rules.md: 0782d37d74d580ed8082ad146bbaa25434e2fb46b9f5bf56cd117422ca9e228b
delete: []
---
# Import: Model changes (Proposals)

Describes the Proposal lifecycle as it is in the code (src/core/proposals.ts, src/core/scope.ts, src/core/required.ts, extension/src/host/approval.ts, extension/src/host/controller.ts): approving or rejecting by the developer, approval blocked by required Proposals, staleness, unregistered files and invalid results, and the scan that follows an approval.

## Doubts

- Documentation versus code: `docs/model-format.md:191` and `docs/cli.md:47` list what an approval checks (required Proposals approved, not stale, valid) but not the check that every file held by the Proposal was registered with it; the code refuses an approval for that reason too (`src/core/proposals.ts:275-276`). Modelled as the code does.
- Missing case: a Proposal that touches no file can be approved (`src/core/proposals.ts:267-286` has no such check); it changes nothing but is marked approved and, for an ordinary change, nothing is scanned either.
- Looks like a bug: applying an approval is not atomic. Files are deleted and written one by one after validation (`src/core/proposals.ts:281-282`); if one write fails midway, the Model is left half-updated while the Proposal stays Open, and a retry is then refused as stale.
- A Proposal that requires another one back in a cycle is reported as blocked (`src/core/proposals.ts:122-151`), but `newProposal` can only require existing Proposals, so a cycle can only come from editing `proposal.md` by hand. Modelled as a blocking reason because the code handles it.
