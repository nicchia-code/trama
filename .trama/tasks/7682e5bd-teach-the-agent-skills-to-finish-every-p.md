---
column: done
technical: false
refs:
  - proposal/Draft/agent.SUBMIT_PROPOSAL
  - requirements/rules#proposal
drift: null
proposal: 3d6b3838
agent: false
created: 1970-01-01T00:00:00.029Z
---
# Teach the agent skills to finish every Proposal with a submit

The trama-design, trama-import, trama-scan and trama-fix skills (and the tool table they all share, which trama-implement carries too) say that a Proposal starts as a Draft and that, after validating and reading it, the agent hands it over with trama proposal submit (trama_proposal_submit) before telling the developer to review it; the agent calls the registering step before every later change; a refused submit is fixed and tried again. The scan and fix skills submit the Proposal before running drift new --proposal. The skills the project installs are refreshed with the new versions.
