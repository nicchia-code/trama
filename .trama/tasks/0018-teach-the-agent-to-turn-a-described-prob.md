---
column: done
technical: false
refs:
  - task
  - drift/Open
  - developer.ASK_AGENT
  - requirements/rules#task
  - requirements/rules#drift
drift: null
proposal: "0009"
---
# Teach the agent to turn a described problem into Tasks (the trama-fix skill)

A new agent skill, trama-fix, which the Fix instruction names. Given a short description of a problem, the agent reads the Model and Requirements, finds in the code where they and the code disagree, and avoids duplicating the Tasks and Drifts that already exist. It asks the developer as many rounds of questions as it needs about what the code and the Model cannot tell. Outcomes: the code contradicts the Model or a Requirement → Tasks, one per coherent unit, referencing the Model elements and Requirements the symptom belongs to, with a body in domain words; the symptom belongs to nothing in the Model or Requirements → a Technical Task with no references, whose body gives the symptom, the expected behaviour and how to reproduce it; the Model is silent or wrong → it stops and files a Drift, with a Proposal attached only when the code handles an important case the Model forgot. Its Tasks are linked to no Proposal, so they belong to no design. It never changes code, the Model or the Requirements, and never approves, rejects or resolves anything.
