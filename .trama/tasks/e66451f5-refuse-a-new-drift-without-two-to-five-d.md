---
column: done
technical: false
refs:
  - drift
  - requirements/rules#drift
  - requirements/tech#drift
drift: null
proposal: 8fef6f72
agent: false
created: 1970-01-01T00:00:00.092Z
---
# Refuse a new Drift without two to five distinct fix options and take them in the command line and the tool

Filing a Drift now needs from two to five fix options, the first being the one the agent recommends. Filing is refused, naming the problem, when there are fewer than two or more than five, when an option lacks its title or its text, when a title has no text after it or a text no title, or when two options share a title. On the command line each --option <title> is followed by its --option-text <text>, in order; the tool takes an options list of title and text. Drifts that come with a Proposal are filed the same way. Filing without options is refused even when the two sides are written.
