# Diagram

The zoom level at which the Diagram currently shows the Model. The System level draws the Features and Actors and the Events travelling between them. A Feature level draws that Feature's Machines with the Actors and other Features' Machines that send Events into it. A Machine level draws its States and Transitions. A State level zooms into a State that has sub-States. Following a link to an element opens the level where that element is drawn and selects it.

The Diagram starts at the System level and keeps its zoom level when the Model changes, falling back to the nearest level that still exists. Lo stesso ripiego vale quando il developer cambia la Proposal disegnata sopra il Modello e ciò che si guarda esisteva solo grazie alla Proposal di prima.

## States

### System level (initial)
- `developer.OPEN_FEATURE_LEVEL` → Feature level: a Feature is opened.
- `developer.OPEN_MACHINE_LEVEL` → Machine level: a link points to a State or Transition of a Machine.

### Feature level
- `developer.OPEN_SYSTEM_LEVEL` → System level
- `developer.OPEN_FEATURE_LEVEL` → Feature level: another Feature is shown, or a link points to a Machine of one.
- `developer.OPEN_MACHINE_LEVEL` → Machine level
- `workspace.MODEL_CHANGED` → System level: only if the Feature shown no longer exists.
- `developer.CHOOSE_DRAWN_PROPOSAL` → System level: solo se la Feature mostrata non esiste nel Modello disegnato con la Proposal ora scelta.

### Machine level
States with sub-States can be expanded in place to draw their sub-States inside them.
- `developer.OPEN_SYSTEM_LEVEL` → System level
- `developer.OPEN_FEATURE_LEVEL` → Feature level
- `developer.OPEN_MACHINE_LEVEL` → Machine level: another Machine is shown.
- `developer.OPEN_STATE_LEVEL` → State level: only a State that has sub-States can be opened.
- `workspace.MODEL_CHANGED` → System level: only if the Machine shown no longer exists.
- `developer.CHOOSE_DRAWN_PROPOSAL` → System level: solo se la Machine mostrata non esiste nel Modello disegnato con la Proposal ora scelta.

### State level
- `developer.OPEN_SYSTEM_LEVEL` → System level
- `developer.OPEN_FEATURE_LEVEL` → Feature level
- `developer.OPEN_MACHINE_LEVEL` → Machine level
- `developer.OPEN_STATE_LEVEL` → State level: a sub-State that has sub-States of its own.
- `workspace.MODEL_CHANGED` → Machine level: only if the State shown no longer has sub-States.
- `workspace.MODEL_CHANGED` → System level: only if the Machine shown no longer exists.
- `developer.CHOOSE_DRAWN_PROPOSAL` → Machine level: solo se, nel Modello disegnato con la Proposal ora scelta, lo Stato mostrato non ha sotto-Stati.
- `developer.CHOOSE_DRAWN_PROPOSAL` → System level: solo se la Machine mostrata non esiste nel Modello disegnato con la Proposal ora scelta.
