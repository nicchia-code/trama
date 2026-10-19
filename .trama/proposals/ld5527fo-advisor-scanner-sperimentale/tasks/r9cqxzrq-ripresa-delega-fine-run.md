---
technical: false
refs:
  - drift-resolution
  - drift-resolution/Running tasks/agent-hook.IDLE
---
# Ripresa della delega a fine Run

Fatto quando:
- dopo la riapertura dell'editor, con l'Advisor Scanner attivo, la fine di un Run lanciato da Trama, con qualunque esito (hook a riposo, fine del comando, chiusura del terminale), rende operativa la delega dei Drift come la fine di uno scan, e il progetto viene rivalutato per una nuova raccolta;
- con l'Advisor Scanner non attivo la ripresa resta quella di oggi: la fine di uno scan o una richiesta esplicita;
- i Drift che l'advisor registra durante un Run aspettano la fine di quel Run prima di entrare in una raccolta automatica, come gli altri.
