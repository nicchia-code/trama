---
technical: false
refs:
  - question-round
  - requirements/ui#question-round
---
# Overlay domande in React

Si fa dopo «Base React e shadcn».

- **Componenti.** L'overlay delle domande è un `Dialog` di shadcn/ui, con:
  - indice, domanda corrente, opzioni (radio o caselle), risposta libera, riepilogo e conferma di Skip all, come componenti React;
  - la barra ridotta con Reopen.
- **Cosa resta uguale.** Funziona come dice il Question round:
  - il focus resta dentro l'overlay e va sul testo di ogni domanda nuova;
  - `Esc` non fa nulla;
  - Back e l'indice tengono ciò che è stato scritto.
- **Aspetto.** Colori del tema del pannello, caratteri dell'editor, transizioni tolte con la riduzione del movimento.
- **Codice vecchio.** La logica di `question-overlay-logic` resta; il codice di disegno vecchio sparisce.
- **Test**, con Testing Library:
  - focus sulla domanda nuova;
  - Skip all con conferma;
  - Send to agent dal riepilogo;
  - riduzione a barra e Reopen.
