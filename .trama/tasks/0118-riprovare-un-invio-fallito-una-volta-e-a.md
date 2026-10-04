---
column: done
technical: false
refs:
  - notice/First attempt/ntfy.DELIVERY_FAILED
  - notice/Retrying
  - notice/Second attempt
  - notice/Failed
  - requirements/rules#notice
  - requirements/tech#notice
  - requirements/ui#notice
  - requirements/data#notice
  - requirements/quality#away-notifications
drift: null
proposal: "0027"
agent: false
---
# Riprovare un invio fallito una volta e avvisare il developer nell'editor una sola volta

Se il primo invio fallisce l'avviso aspetta dieci secondi (fissi, non un'impostazione), poi rilegge l'impostazione: se l'argomento c'è ancora ed è valido riprova con lo stesso testo del primo invio, senza ricomporlo; altrimenti finisce in Non partito. Un solo secondo tentativo. Se anche questo fallisce l'avviso finisce in Fallito e il developer vede nell'editor un messaggio di avviso 'Trama could not send the ntfy notification: <reason>. Check the trama.ntfy setting and your connection.', senza pulsanti, con <reason> uno tra 'the setting is not a topic name or an http(s) URL', 'HTTP <status>', 'no response within 10 seconds' e il messaggio dell'errore di rete; non contiene mai l'argomento né l'URL. Lo stesso messaggio compare anche quando un valore non valido impedisce l'invio. Il messaggio compare una sola volta per finestra: non si ripete finché non riesce almeno un invio, e dopo un invio riuscito può comparire di nuovo al prossimo fallimento. Il fatto è tenuto solo in memoria. Un avviso riuscito o fallito non cambia nulla nel round, nei Task, nelle Proposal, nei Drift né nell'agente.
