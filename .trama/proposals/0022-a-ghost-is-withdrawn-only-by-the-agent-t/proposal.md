---
status: approved
requires:
  - "0021"
base:
  work/announcement.md: 66c089f249d70d74f760592da61ea42c2728991e2e217559483d0d0629081d6d
  agent-launching/agent-terminal.md: a5a6e90db4156411b0500fd85d35763a30eee1ba575b679ad160781e7b1b1010
  requirements/data.md: f747523983020d949a4233eb53baa43a409a2fbf64f5ca0f7992e47c31e8b1e0
  requirements/rules.md: a8b3e68c1052dbdefca0959f7dc6144bbdca90702f28e2523b646f4875d5039c
  requirements/tech.md: 9d43a801d66f3ed1b0bf73a47264cc78a8ba1cc8ccaa181fb33234fd5918e9d6
delete: []
---
# A ghost is withdrawn only by the agent terminal it belongs to

Problem: the ghost of an announced Proposal disappears at once with the notice "The agent finished without delivering Proposal …", and only comes back when the agent opens its Draft, so there is no ghost during the whole interview. Cause, deduced from the code and not reproduced: the end of any command, or the close of any terminal, among the "Trama agent" terminals of the project withdraws every announcement of the project, so a command other than the one just typed (an earlier terminal, another command in the terminal, a shell start-up command) removes the ghost. Change: an announcement belongs to the agent terminal its agent runs in; only the end of the command Trama typed there, or the close of that terminal, withdraws it; when the command cannot be recognised nothing is withdrawn for that reason. Decisions for the developer to check: the fifteen minutes of quiet stay per project; the Draft still takes the oldest waiting announcement of a design request, whatever its terminal; the notice and the Board are unchanged; announcements with no terminal (chat launcher, an agent started outside Trama) are withdrawn only by the quiet period and by the extension starting up.
