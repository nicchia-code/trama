---
technical: false
refs:
  - drift/Open/developer.DISMISS_DRIFT
---
# Dismiss Drift dal pannello rifiutato finché l'agente che ha registrato il Drift non ha finito il turno

Quando il developer usa Dismiss Drift dal pannello su un Drift Open, oltre ai rifiuti già previsti (Drift in una Proposal di risoluzione in scrittura o aperta, oppure un agente che sta risolvendo i Drift) la chiusura è rifiutata anche finché l'agente che ha appena registrato quel Drift non ha finito il suo turno: il Drift resta Open, nulla cambia e la Proposal allegata non viene scartata. Sulla card del Drift il pulsante Dismiss Drift resta disabilitato con `The agent is still finishing` fino alla fine del turno di quell'agente (hook idle, fine del comando, chiusura del terminale, fine o interruzione o chiusura del turno di chat), senza timer; lo stato è tenuto in memoria nell'host. L'host deve rifiutare anche un messaggio Dismiss Drift che arrivi comunque in quel periodo, non solo disabilitare il pulsante.

Finito il turno, Dismiss Drift si comporta come prima: dopo la conferma il Drift passa a Dismissed senza cambiare codice né Modello, ricordando che il codice è stato tenuto, la Proposal allegata in scrittura o aperta è scartata senza feedback, i Task che bloccava tornano liberi e la sua origine resta dov'è. Il Dismiss Drift dalla riga di comando non cambia.

Aggiungere test dell'host per il rifiuto durante il turno e per la chiusura riuscita dopo la fine del turno.
