# Requirements: Interfaccia, Task progress interface

Use when showing the percentage the agent declared on a Task, on the Board or in the command line.

## task/Taken by the agent

- On the Board, the card in `Active` of a Task taken by the agent with a declared percentage shows a thin bar across the bottom of the card, filled up to the percentage, and the text `40%` in its header after the badges. A card without a percentage (just taken, or not taken by the agent) shows neither, as today.
- The bar is the `Progress` component of shadcn/ui, on `@radix-ui/react-progress` (Radix UI is already in the Specs). Its fill uses the cyan of the animated border of the taken Task, with the same Tailwind shades for light and for dark.
- The bar's accessible name is `Agent progress` and its value text is the percentage, `40%`. The width transition of the fill is removed under reduced motion.
- `trama project show`, `trama task list` and `trama task show` mark a taken Task with a declared percentage "(agent working, 40%)" instead of "(agent working)". The texts are in English, the fixed language of the interface.
