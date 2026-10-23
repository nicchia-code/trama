---
status: resolved
resolution: unified
refs:
  - omp-chat-conversation/Agent idle
proposal: null
task: null
origin: null
unifiedInto: kyaecq54
option: null
note: null
created: 2026-10-23T11:15:55.214Z
job: db0e3e5e-a2ec-49ff-ab30-261d5f732015
---
# Stop at rest has no transition

## What happens

The developer can press Stop on a conversation whose agent is at rest for Trama, after confirming. Trama cancels the current turn of the agent and changes nothing else, and the conversation stays at rest.

## What should happen

A conversation at rest should either not offer Stop, or Stop should have an outcome the Model describes, so that the developer knows what it does.

## Fix options

### Offer Stop only while working

Stop appears only in Agent running, where the Model defines it. At rest the developer can still close the conversation, which ends the agent. Cost: the developer cannot interrupt a reply to their own message without closing the conversation.

### Keep Stop at rest as is

Stop at rest keeps cancelling the current turn with no change of state, as it does now. The Model stays silent on this case. Cost: a behaviour the developer can see stays undescribed in the Model.

## Where in the code

extension/src/host/omp-chat/conversations.ts: the stop request, which confirms and then cancels the session when the conversation is idle.
