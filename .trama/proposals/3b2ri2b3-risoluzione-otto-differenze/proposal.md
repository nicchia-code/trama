---
status: approved
kind: resolution
drifts:
  - drift: 2pdnq92f
    decision: fix-code
    note: |-
      Correggere nel codice solo queste quattro differenze; le altre quattro (History, Split, Issue, Copilot) sono chiuse da questa risoluzione adeguando Modello e Requisiti.

      - Menu laterale: misurare la vista intera (spostare il margine interno del menu su un elemento figlio del contenitore), così le sole icone compaiono sotto i 56 px come dice il Requisito.
      - Raffinamento: gli avvisi «did not start» e «was refined but not approved» vanno nella riga degli avvisi in cima alla Board, con il pulsante di chiusura, al posto della notifica dell'editor.
      - Diagramma: un riferimento a una sezione dei Requisiti che esiste ma non è intitolata a un elemento del Modello non è né un passo né un mancante, come General e le Aree intere.
      - General: dopo una ricarica con la sessione non riaperta, General riparte vuota senza la riga `New session: …`; la riga resta solo dopo un omp chiuso da solo.
base:
  requirements/tech/history.md: 79ab7a4e37a108e85d6c7a119bdfbc096d5c623f99afb10402fb63861f639f7e
  model-changes/proposal.md: 1786693b60308ed745cf42daff95ba152f04b6acae5a7978f0e25695d4120af6
  team/issue.md: 8f912d5aa8f410c59696bb98b89c66544ff84bab5e77e8fb8b1b9c754197939a
  requirements/rules/project.md: ea8244a70d2ca67348099fd85d7b49da3c1735225e5a1d001411692716c52186
  project-setup/project.md: 89d388ae51643ec6960b7d4c67aa58249ed893589c737fb33cdfb9ff3e6ee170
delete: []
created: 2026-10-27T07:43:09.816Z
---
# Risoluzione otto differenze

Risolve il Drift 2pdnq92f – Otto differenze col codice, con una decisione per ciascuna delle otto differenze:

- **Correggere il codice** (`fix-code`):
  - Menu laterale: le sole icone compaiono sotto i 56 px misurando la vista intera.
  - Raffinamento: gli avvisi «did not start» e «was refined but not approved» stanno in cima alla Board, al posto della notifica dell'editor.
  - Diagramma: un riferimento a una sezione dei Requisiti senza elemento del Modello non è né un passo né un mancante.
  - General: dopo una ricarica con la sessione non riaperta riparte vuota senza la riga sulla sessione nuova.
- **Adeguare Modello e Requisiti al codice**:
  - History: il dettaglio di una voce usa la finestra di dialogo del pannello, come le altre modali.
  - Split: la divisione di un issue aspetta la fine di un Run della finestra, come dice già il Requisito.
  - Issue: da Not published l'agente può registrare la pubblicazione già avvenuta o un nuovo motivo.
  - Copilot: né la regola del progetto né il Modello del progetto chiedono più la pulizia delle tracce di Copilot.
