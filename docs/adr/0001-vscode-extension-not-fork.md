> For the parts that make VS Code the reference editor, see [ADR 0011](0011-cursor-chat-and-omp-only.md), which replaces them.

# VS Code extension, not a fork

Trama ships as a VS Code extension in which the Diagram becomes the main working surface, not as a fork of the editor. The agent lives outside the IDE (skills plus CLI), so there is no need to embed an agent in the workbench, which is the reason Cursor and Windsurf forked. An extension also installs into Cursor, Windsurf and VSCodium through Open VSX, so users keep their IDE, and it avoids constant rebasing on upstream. Selling works through a licence outside the Marketplace (Bring-Your-Own-License, as GitLens Pro does); a fork would not make selling easier.

## Consequences

A fork or a standalone app stays possible: the product's core does not depend on the editor shell, so moving would only replace that shell.
