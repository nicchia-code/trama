---
status: accepted
---
# Cursor's chat agent counts as the agent, recognised by CURSOR_AGENT

Refines ADR 0009, which left every agent outside Trama's terminal indistinguishable from the developer. Cursor sets `CURSOR_AGENT=1` in the shell its chat agent runs commands in (seen in `cursor-agent-exec`, Cursor 3.22.12 and 3.23.12) and not in the developer's terminals. The command line now treats `CURSOR_AGENT=1` as it treats `TRAMA_AGENT`:

- a move to In progress takes the Task for the agent, and the developer's moves of a taken Task are refused;
- the developer-only commands (approve, reject, discard, resolve a Drift, take a Task back) are refused;
- an announcement made without `TRAMA_TERMINAL` carries `chat: cursor`, so the extension can withdraw it when the conversation stops. `TRAMA_TERMINAL` wins when both are set.

ADR 0005 still applies: the guard stops an agent that makes a mistake, not one that clears the variable on purpose. It rests on a variable Cursor sets for its own reasons and does not document; if Cursor stops setting it, its chat agent goes back to looking like the developer, as before.

## Considered Options

- **Have Trama set a variable in Cursor's agent shell.** The extension cannot reach that shell's environment.
- **Leave Cursor's chat agent as the developer.** Its Tasks could not be released when its turn ends, and nothing would stop it approving by mistake.
