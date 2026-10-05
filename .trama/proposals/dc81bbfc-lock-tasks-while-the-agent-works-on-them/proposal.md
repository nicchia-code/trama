---
status: approved
base:
  work/task.md: f9447ca6bea9e76d3802cfcad84f772a01b4808d77d8a7da1b76e37de22d5765
  actors/developer.md: 66c7e5823644164a9a600bb3956adbcb4ecdded40ec9b52063539e78bc6532b8
  editor-panel/panel.md: 5e1507d776fa52aad8ae954775e31b04a5e3028561d88165dd7d9abbca99d5c3
  requirements/data.md: a64b0016caa43873910c528532607fa3d1f29e60d78a99b1f7de8c7b296e4fdf
  requirements/rules.md: 34c4f782b5e4b1bd32842234987fec6b544e7213c6a310970c1d147e0065ab50
  requirements/ui.md: 2c883690912488523d57fea02754020e508ea5e76269c61ba4d84c47fb6f60cb
  requirements/tech.md: f6bfc4ce93ff3f77b16c33bc50fb4e3551d005d0f0d40f7a2137518d5a5f540e
delete: []
created: 1970-01-01T00:00:00.008Z
---
# Lock Tasks while the agent works on them

While an agent works on a Task, the developer should not be able to interact with that Task or card. Decisions confirmed with the developer: a Task is taken by the agent when the agent moves it to In progress (agent tools, or the command line in the terminal Trama started); developer moves never take it. A taken Task cannot be moved by the developer from the Board, the host or the command line until it is taken back. Release: a Take back button on the card, and automatically when the agent terminal's command ends. Run all To do and Run this design are unavailable while a relevant Task is taken. Visual: an 'agent working' badge with an animated indicator, controls disabled with a tooltip, same for a design card's sub-Tasks. Choices to check: the single Task Run button only exists on To do cards, which cannot be taken, so nothing changes there; a move by an agent outside Trama's terminal without TRAMA_AGENT looks like the developer and does not take the Task; the end of the command releases every taken Task; Tasks already In progress become Free; new developer-only command 'task take-back'.
