---
column: done
technical: false
refs:
  - drift
  - requirements/ui#drift
drift: null
proposal: "0024"
agent: false
---
# Show a Drift's fix options, chosen option and note in the textual Drift view and the agent tools

trama drift show and the agent tools list the Drift's fix options under a Fix options heading as a numbered list, each with its title and text and the first marked (recommended), after the two sides and before Where in the code. A Drift resolved by fixing the code also shows a Chosen option block with the number and title of the option, when there was one, and a Note block when the developer gave one. A Drift without options has no Fix options block. The texts are printed as the Markdown they were written in.
