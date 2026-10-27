# Demo

The demo page of the website, as one visit sees it. When the visitor's window is wide enough it holds a VS Code window with the editor extension at work: the activity bar, the explorer with two folders, Trama's side menu, the panel, omp Chat, the terminal and the status bar with the ghosts. The first folder is the shop with its Trama project, which has its Model, Requirements, Specs, Proposals, Tasks, Drifts and History; the second is the code of the same shop without Trama, for the chapter on setup and import. Above the window, a toolbar holds Reset, the full screen button and the switch between the light and dark theme of the site.

In the window the visitor acts as the developer: the panel, the side menu, omp Chat and every button of the extension do what they do in the editor, on the demo's own copy of the two folders. The copy lives only in the page: leaving the page or reloading it loses it.

## States

### Closed (initial)
- `visitor.OPEN_DEMO` → Loading: the window of the visitor is at least as wide as the demo's minimum width.
- `visitor.OPEN_DEMO` → Recording: the window is narrower than the demo's minimum width.

### Loading
The page prepares a fresh copy of the two folders and the VS Code window, with a short loading indicator.
- `READY` → Running
- `visitor.LEAVE_DEMO` → Closed

### Running
The VS Code window works. The panel starts on the Board of the shop, and the tour starts (see Tour).
- `visitor.RESET_DEMO` → Loading: everything the visitor and the scripted agent did is thrown away, every script that plays stops, and the demo starts again from the same project, with the tour at its first chapter. The theme and full screen stay as they are.
- `visitor.ENTER_FULLSCREEN` → Running: the demo, with its toolbar and the tour, fills the screen; nothing in the window changes.
- `visitor.EXIT_FULLSCREEN` → Running: the demo goes back into the page; nothing in the window changes.
- `visitor.RESIZE_WINDOW` → Too narrow: the window became narrower than the demo's minimum width.
- `visitor.LEAVE_DEMO` → Closed: the copy of the folders is lost.

### Too narrow
The demo window is hidden behind a message that asks to widen the browser window. It keeps its state: what was there comes back as it was, and the scripts that were playing go on meanwhile.
- `visitor.RESIZE_WINDOW` → Running: the window is wide enough again.
- `visitor.LEAVE_DEMO` → Closed

### Recording
In place of the VS Code window the page plays a recording of the tour, with an invitation to open the site from a computer to try the demo.
- `visitor.RESIZE_WINDOW` → Loading: the window became wide enough; the interactive demo starts.
- `visitor.LEAVE_DEMO` → Closed

## Events

### READY
The fresh copy of the two folders is ready and the VS Code window shows the panel on the Board.
