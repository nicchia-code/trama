---
status: resolved
resolution: unified
refs:
  - omp-chat-conversation/Waiting for the window
  - requirements/rules#omp-chat-conversation
proposal: null
task: null
origin: null
unifiedInto: 88lo546l
option: null
note: null
created: 2026-10-24T19:41:34.182Z
job: 1a64e0c6-6cc2-4d34-a782-2220c2d94f82
---
# Hook-less job conversation resumes idle

## What happens

A job conversation whose package has no Trama hook module is working when the window closes. After the reload its session reopens, but Trama takes the conversation as at rest: no continuation message goes to the agent, and the Run of the job stays in progress on the Board. Nothing ends that Run until the developer closes the conversation.

## What should happen

A job conversation that was working when the window closed comes back working, with or without the hook: it continues its work, which ends with omp's answer, as the Requirements say a conversation resumes as it was.

## Fix options

### Resume any working job as working

Decide the resume from whether the saved conversation belongs to a job, not from the hook flag: a working job conversation reopens in Agent running and gets the fixed continuation message, as hooked ones do. Its work then ends with omp's answer to that message, as the Model says for every job conversation. Cost: an agent without the hook gets a continuation message after a reload, and the Run waits for its answer.

### Drop the Run of a hook-less job at rest

When a hook-less job conversation goes to rest, its saved entry loses the job, so a resume at rest brings back no Run, as for hooked conversations. A job that was working and cannot continue is ended as a vanished agent's. Cost: the Run of a hook-less job ends when its conversation rests rather than when the developer closes it, and the Board shows it as finished before the developer closes the conversation.

### Keep the Run until closed

Accept the current resume and let the developer end the Run by closing the conversation, with a Board notice that says the Run waits for that. The Model and the Requirements stay as they are, and nothing else changes. Cost: after every reload the Run of a hook-less job stays in progress until the conversation is closed, and the notice is a new Board text that the Requirements do not describe.

## Where in the code

src/core/omp-chat-conversation.ts: resumeDecision, which requires the saved hook flag for a working conversation (around line 278); extension/src/host/omp-chat/conversations.ts: resume, which keeps the saved job only for a conversation saved as running (around line 288), and resumeOne, which takes the resume decision (around line 309).

## Prepared question

```json
{
  "question": {
    "id": "kzs0i9e0",
    "question": "How should a job conversation without Trama's hook come back after the window closed while its agent was working?",
    "context": "A job conversation normally runs with Trama's hook; a job whose package has no hook module runs without it. When the window closes or reloads while the agent of a job conversation is working, the conversation waits for the window and is resumed when a window reopens the project. The Requirements say a resumed conversation comes back as it was: working ones come back in Agent running and receive a fixed message asking the agent to continue, and their work ends with omp's answer. When a resumed job conversation comes back at rest instead, no message is sent, and its Run stays in progress on the Board until the developer closes the conversation.",
    "options": [
      {
        "label": "Resume any working job as working",
        "description": "Every job conversation that was working comes back in Agent running with the fixed continuation message, with or without the hook.",
        "details": "The resume is decided by whether the conversation belongs to a job, not by the hook. Its work then ends with omp's answer to that message, as for every job conversation. Cost: an agent without the hook gets a continuation message after a reload, and the Run waits for its answer."
      },
      {
        "label": "Drop the Run of a hook-less job at rest",
        "description": "When a hook-less job conversation goes to rest, its saved entry loses the job, so a resume at rest brings back no Run.",
        "details": "A job that was working and cannot continue ends as a vanished agent's. Cost: the Run of a hook-less job ends when its conversation rests rather than when the developer closes it, and the Board shows it finished before the conversation is closed."
      },
      {
        "label": "Keep the Run until closed, with a notice",
        "description": "A hook-less job comes back at rest and its Run stays in progress until the conversation is closed, with a Board notice that says so.",
        "details": "The Model and the Requirements stay as they are. Cost: after every reload the Run of a hook-less job stays in progress until the conversation is closed, and the notice is a new Board text the Requirements do not describe."
      },
      {
        "label": "Only hooked jobs resume working",
        "description": "The Model and the Requirements say that only a job conversation with Trama's hook comes back working; one without the hook comes back at rest, with no message.",
        "details": "The Run of such a job stays in progress until the developer closes the conversation or its process ends. No new Board text and no change in the code. Cost: the Run of a hook-less job can stay open on the Board long after its agent stopped."
      }
    ],
    "recommended": 0,
    "multi": false
  },
  "decisions": [
    {
      "decision": "fix-code",
      "option": 1
    },
    {
      "decision": "fix-code",
      "option": 2
    },
    {
      "decision": "fix-code",
      "option": 3
    },
    {
      "decision": "proposal"
    }
  ],
  "fingerprint": "4cc8cbd014b30c3ebcc1d3b1f0b96105cab3f0df883d066c3a196f419b647262",
  "prepared": "2026-10-24T20:10:07.362Z"
}
```
