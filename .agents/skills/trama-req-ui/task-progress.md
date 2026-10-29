# Requirements: Interfaccia, Task progress interface

Use when showing the percentage the agent declared on a Task in the command line, or touching the Board card of a taken Task.

## task/Taken by the agent

- On the Board, the card in `Active` of a Task taken by the agent shows no progress: no bar across the card and no percentage text in its header, whether or not the agent declared one. The cyan animated border of the taken Task stays as the only sign that the agent works on it, and the bar of `Run all` (`ui#drift-resolution/Running tasks`) is unchanged.
- `trama project show`, `trama task list` and `trama task show` mark a taken Task with a declared percentage "(agent working, 40%)" instead of "(agent working)". The texts are in English, the fixed language of the interface.
