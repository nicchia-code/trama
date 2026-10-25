---
created: 2026-10-24T20:56:02.268Z
updated: 2026-10-24T20:56:02.268Z
summary: "Code realigned with the Model: General keeps its turn and conversation when omp Chat is re-enabled, starts without an omp update, and works in the project folder; Resolve, conversations, the wizard omp step and Model IDs follow the Model."
tasks:
  - 6zjrngnq
  - 6fc59szq
cleared:
  6zjrngnq:
    title: "Fix code to match the Model: Twelve code-Model differences"
    finished: 2026-10-24T20:53:17.044Z
    refs:
      - requirements/rules#omp-chat-general
      - requirements/tech#omp-chat-general
      - requirements/ui#omp-chat-general
      - omp-chat-general/Kept after switch-off
      - requirements/data#omp-chat-general
      - drift-resolution/Free
      - drift-resolution/Answering a prepared question
      - drift-resolution/Resolving
      - requirements/rules#drift-resolution
      - omp-chat-conversation/Agent running
      - omp-chat-conversation/Closed
      - omp-chat-conversation/Waiting for the window
      - requirements/rules#omp-chat-conversation
      - task/Done
      - setup-wizard/omp
      - requirements/rules#setup-wizard
      - requirements/ui#agent-launching
      - requirements/data#General
  6fc59szq:
    title: "Fix code to match the Model: General clears on re-enable"
    finished: 2026-10-24T20:47:04.634Z
    refs:
      - omp-chat-general/Kept after switch-off
---
# General and conversation fixes to match the Model

When omp Chat is turned back on while General is kept, General goes straight to Ready with its running agent and conversation, and nothing is stopped or cleared. General start only reads the omp version, closing it uses the same confirmation as other conversations, and it works in the Trama project folder. An answer to a prepared question that needs the agent starts it without waiting for other resolutions. An empty Ask more ends in Closed when its window closes, and a job conversation that was working comes back working after a reload. The Scan System count of cleared Tasks counts one per remembered line. The wizard's omp step blocks Next while omp is older than the minimum and re-checks the path it shows. A Model element may use the ID `constructor`.
