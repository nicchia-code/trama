---
column: done
technical: false
refs:
  - notice/Retrying
  - requirements/rules#notice
  - requirements/ui#notice
drift: null
proposal: null
agent: false
created: 2026-10-06T13:47:42.965Z
---
# Avviso nell'editor quando il secondo tentativo trova l'argomento non valido

Quando il primo invio di un avviso è fallito e, scaduta l'attesa del secondo tentativo, l'argomento ntfy è ancora impostato ma con un valore non valido, l'avviso finisce in Not sent senza richiesta di rete e il developer lo viene a sapere con lo stesso avviso nell'editor usato per un invio fallito (motivo `the setting is not a topic name or an http(s) URL`), una sola volta finché un invio non riesce, come già succede quando il valore non è valido allo scadere dei primi dieci secondi. Se invece l'argomento è stato tolto (vuoto), non si mostra nulla.
