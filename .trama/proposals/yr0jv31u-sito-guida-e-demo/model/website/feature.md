# Website

Trama's documentation site, published on GitHub Pages from this repository. It has three parts: a landing page that tells the loop of Trama with animations as the visitor scrolls, a guide that explains how to use Trama, and a demo page where the visitor tries the editor extension in the browser.

The demo is an interactive presentation. It shows a VS Code window with the extension at work on an example project, the shop, and a guided tour points with arrows and bubbles at what to do next, chapter by chapter. After the tour, or when the visitor skips it, everything in the window keeps working and the visitor explores freely.

Inside the demo Trama behaves as the extension does, with the same rules for Proposals, Tasks, Drifts, the Board, the Diagram, the Requirements, the Specs, the History and the settings, because the demo runs Trama's own logic on a copy of the project kept in the browser. Two things differ. There is no real agent: every job the extension would give to the agent plays a script instead, in omp Chat, that does to the project what the agent would do (see Scripted agent). And Manager mode and Team are not available, as in a folder without git.

Nothing the visitor does in the demo leaves the browser or survives leaving the page: every visit starts from the same project.
