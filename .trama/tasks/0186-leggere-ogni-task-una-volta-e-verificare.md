---
column: done
technical: false
refs:
  - task
  - requirements/tech#task
  - requirements/quality#task
drift: null
proposal: "0038"
agent: false
---
# Leggere ogni task una volta e verificare la corsa solo alla fine

Una corsa che realizza dei Task legge Modello e Requisiti di ciascun Task una sola volta, dal testo del Task. Per quel Task non si riguardano stato, evento, percorsi, macchina né Requisiti, e non si aprono le skill dei Requisiti. La lettura del codice resta. Se una transizione che il Task deve realizzare non compare in quel testo, si può guardare quella transizione una sola volta, dallo stato o dall'evento, e poi ci si ferma; dopo il codice non si rifà il giro.

Mentre si scrive, si possono eseguire i test aggiunti o modificati per quel Task e i test già esistenti del comportamento che il Task cambia. Non si esegue la suite intera, il lint né la build dopo ogni Task.

Test, lint e build del progetto girano una volta, alla fine della corsa. Un Task chiesto per nome è da solo la sua corsa. In una corsa di più Task la suite è dopo l'ultimo, quando non resta nessun Task eseguibile.

Se quella verifica fallisce, si corregge il codice e la si rilancia, senza rileggere il Modello, prima del resoconto. I Task restano nella colonna in cui sono. Se non si sa quale Task ha rotto la verifica, lo si dice nel resoconto e ci si ferma, senza un altro giro di lettura.
