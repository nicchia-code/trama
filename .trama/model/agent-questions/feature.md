# Agent questions

How the coding agent asks the developer to choose during design and import. Instead of each agent's own question interface, Trama presents a round of questions in the editor, one question at a time, with single or multiple choices, a recommendation and the possibility of a free answer. The developer can go back and change answers before the round is handed to the agent.

Every agent, whether it runs in an editor's chat or in a terminal, uses the same behaviour. When the editor is not available for the project before the round is requested, the agent asks through its own question interface, or in conversation when it has none. If the editor is lost after accepting the round, the round is interrupted and the agent stops the workflow that was waiting for those decisions; it does not fall back to another question interface. Trama displays questions and returns the developer's answers; it does not call a model or choose an answer for the developer.

Only one round is presented at a time in an editor window. Others wait in order. A skipped question is explicitly reported to the agent, which uses its recommendation and lists that decision for the developer to verify. Stopping the agent's wait abandons its round rather than treating it as answered.

Losing the editor interrupts every active or queued round assigned to that window and discards all answers of those incomplete rounds. No partial answers or automatic recommendations are returned, and the rounds are not moved to another window or resumed when the editor returns. Rounds in other windows are unaffected.
