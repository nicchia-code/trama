# Workspace

The project's files on disk, changed by the developer, the agent, version control or Trama itself.

## Events

### MODEL_CHANGED
A file of the Model, the Requirements, the Proposals, the Tasks, the Drifts or the announcements was created, changed or deleted.

### REQUIREMENTS_CHANGED
A file of the Requirements was created, changed or deleted, typically edited by hand by the developer.

### REQUEST_DELETED
Il file di una richiesta di design, inviata o no, è stato cancellato da qualcuno che non è Trama, per esempio a mano dal developer o dal controllo di versione.

### MERGE_COMMITTED
The merge Trama started and remembers has ended with its merge commit, made by the developer or by anyone else, in this window or outside it.

### MERGE_ABANDONED
The merge Trama started and remembers is no longer in progress and no commit contains the merged branch: it was aborted outside Trama.
