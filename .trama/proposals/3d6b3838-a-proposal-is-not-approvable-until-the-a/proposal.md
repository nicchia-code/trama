---
status: approved
base:
  model-changes/proposal.md: ffe116b081ef862c111071b5dd180e97b6dc52856539abb9d2fe8c6b3a5c8f34
  model-changes/feature.md: 84ae045b0250d1cd3281728c7ff41ad54f5b7289c53af38a6ed91f8fef8ccb7d
  actors/agent.md: 53bec615a05272396e7b1ec18125392668bc5e30cfe4043142a869cc21d8023d
  actors/developer.md: 1954d178a6d3a1a1ea1ca315596a0b408edcfe7b37bd7cc6dbe3d8d2600f7adc
  editor-panel/panel.md: 11bf54ef8a76e9c8160703b9b7e29fdb2a713cbacd15c3cacab7ea919bdbb33e
  work/drift.md: 1e15200d5275ec8a5493a005e0dcd5f716d4365ce4bc9114f148780ec42c75f0
  requirements/data.md: 89f91d9e632de03b2eeb6f3998939bebc3ab75d3df5e6b196cacffc7c9145c27
  requirements/rules.md: a7dabf37f5dc8a8bedc2b63a96df77e0bad00318f3fb053424026e95896e5d2e
  requirements/ui.md: 5afd03df86b9fe7d94519dc3a91425359ae7161c8e1e881d27861529f275cc33
  requirements/tech.md: baaaceb79d06f5f476390c2f6603c4e4015782677d5ac59b6772b6f3a448cd77
delete: []
created: 1970-01-01T00:00:00.010Z
---
# A Proposal is not approvable until the agent has finished writing it

Today a Proposal is Open (and approvable) from the moment the agent creates it, so the developer can approve or reject it while the agent is still writing its files. Decisions confirmed with the developer: a new Proposal starts as a Draft, invisible to decisions; the agent hands it over with an explicit submit, which is refused when the Proposal is invalid or holds an unregistered file; any later edit by the agent returns it to Draft until the next submit; the developer can discard a Draft (never an Open Proposal, which is rejected with feedback as before); dependents and an attached Drift treat a discarded Proposal like a rejected one; on the Board a Draft is an 'in writing' card with only a Discard button, outside the count of what awaits a decision. Proposals already on disk stay Open. Checks for the developer: stale and 'waiting for others' do not prevent a submit; discarding keeps the Proposal as history.
