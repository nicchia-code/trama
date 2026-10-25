---
created: 2026-10-24T19:25:41.820Z
updated: 2026-10-24T19:26:52.157Z
summary: The omp launch overlay turns bash auto-background off, so a question round in omp Chat no longer ends midway when a command runs over 60 seconds.
tasks:
  - fa2mxbnn
cleared:
  fa2mxbnn:
    title: Overlay senza auto-background
    proposal: hu8j2if3
    tag: auto exit
    finished: 2026-10-24T19:22:05.310Z
    refs:
      - agent-terminal/Agent running
      - question-round
      - requirements/tech#agent-terminal/Agent running
      - requirements/tech#agent-launching
      - requirements/tech#question-round
---
# No auto-background in overlay

Every launch with the hook, in the terminal and in omp Chat, loads the `--config` overlay with `bash.autoBackground.enabled: false`. A long bash command stays in the foreground, so `trama question new` keeps the turn busy until the developer answers. Ask more and General are unchanged. The overlay checks are covered by the host terminal agent tests; the behaviour under omp 18.12.6 is still to be verified.
