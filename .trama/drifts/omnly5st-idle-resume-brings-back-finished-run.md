---
status: resolved
resolution: unified
refs:
  - omp-chat-conversation/Waiting for the window
  - requirements/rules#omp-chat
proposal: null
task: null
origin: null
unifiedInto: kyaecq54
option: null
note: null
created: 2026-10-23T11:15:55.269Z
job: db0e3e5e-a2ec-49ff-ab30-261d5f732015
---
# Idle resume brings back finished Run

## What happens

When the session of a conversation that was at rest is resumed, the conversation comes back at rest, but its Run, which already ended when the agent went to rest, is put back as a Run in progress on the Board. Nothing follows it, so it stays in progress until the developer closes the conversation.

## What should happen

A conversation that was at rest comes back at rest with its history and no Run in progress, since its Run ended at rest, as the rules say a conversation resumes as it was.

## Fix options

### Hand back the Run only when working

The saved Run is restored only when the conversation was in Agent running. A conversation saved at rest returns at rest with no job. Cost: the resume step needs the saved state before it restores a job.

### Drop the Run when going to rest

When the conversation goes to rest, its saved entry is written without the job, so no later save keeps it. Cost: conversations saved before this change still carry their job until they are closed or resumed once.

## Where in the code

extension/src/host/omp-chat/conversations.ts: the resume step that restores the saved job of every conversation (around line 256) and the save step that keeps the job in the entry (around line 352).
