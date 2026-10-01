# TRAMA_AGENT guards against mistakes, not against a hostile agent

Approving or rejecting a Proposal and resolving a Drift are the developer's decisions. Trama sets `TRAMA_AGENT=1` in every agent it launches, and the CLI refuses those three commands when the variable is set. An agent that follows its skills never meets the guard; one that runs a forbidden command by mistake is stopped with a message that sends it back to the developer.

The guard is not a security boundary: an agent can unset the variable or edit the files directly. A real boundary would need the decisions to live outside the agent's reach (for example only in the extension), which was rejected because it would take the CLI away from developers who do not use VS Code.
