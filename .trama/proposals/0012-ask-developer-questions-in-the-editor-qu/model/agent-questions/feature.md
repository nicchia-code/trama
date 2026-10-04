# Agent questions

How the coding agent asks the developer to choose during design, fix and import. Instead of each agent's own question interface, Trama presents a round of questions in the editor, one question at a time, with single or multiple choices, a recommendation and the possibility of a free answer. The developer can go back and change answers before the round is handed to the agent.

Copilot, Cursor and agents running in a terminal use the same behaviour. When the editor is not available for the project, the agent asks through its own question interface, or in conversation when it has none. Trama displays questions and returns the developer's answers; it does not call a model or choose an answer for the developer.

Only one round is presented at a time in an editor window. Others wait in order. A skipped question is explicitly reported to the agent, which uses its recommendation and lists that decision for the developer to verify. Stopping the agent's wait abandons its round rather than treating it as answered.
