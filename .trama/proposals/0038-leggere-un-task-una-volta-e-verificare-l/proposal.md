---
status: approved
base:
  requirements/tech.md: 044ffe72f2881d4d7c657f95385b6decd7b91352953df1214477fa0b8cfd85b9
  requirements/quality.md: 36d72998d2e5da6fcacf676d20de7a0b2fd3db4669149d449c5afa8b0e83809e
delete: []
---
# Leggere un task una volta e verificare la corsa alla fine

Un task chiede all'agente di rileggere Modello e Requisiti da molti comandi e da skill intere, e di rilanciare test, lint e build dopo ogni task. Il comando risponde in un secondo: la mezz'ora è quel rituale.

Decisioni:
- Un task si legge una volta, con trama task show. Niente stato, evento, percorsi, macchina, requisiti né skill trama-req per quel task. La lettura del codice resta.
- Quel comando contiene il testo che oggi è solo un rimando: l'albero della macchina, chi riceve i suoi eventi, le transizioni in uscita di uno stato comprese quelle ereditate, chi reagisce a un evento, il testo intero di un'area, e i Requisiti generali scritti per intero.
- Se una transizione che il task deve realizzare non è in quel testo, un solo comando (trama state o trama event) e poi stop. Dopo il codice non si rifà il giro.
- Mentre scrive, l'agente può eseguire i test aggiunti o modificati per quel task e i test già esistenti del comportamento che cambia. Suite, lint e build del progetto una volta sola, a fine corsa. Un task chiesto per nome è la sua corsa.
- Se la verifica finale fallisce, corregge il codice e la rilancia, senza rileggere il Modello, prima del resoconto. I task restano dov'erano. Se non sa quale task ha rotto la verifica, lo dice e si ferma.
- I task restano in sequenza. La scansione, la dimensione dei task e le skill di design e import non cambiano.

Scelte da rivedere:
- Nessun tetto in minuti: Trama non esegue il modello che scrive il codice, quindi il vincolo è sulla lettura e sulla verifica.
- I percorsi fra stati non entrano nel testo dell'unico comando.
