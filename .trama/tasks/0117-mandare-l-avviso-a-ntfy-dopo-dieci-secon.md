---
column: done
technical: false
refs:
  - notice/Waiting/time.NOTICE_DELAY_ELAPSED
  - notice/Sending
  - notice/First attempt
  - notice/Delivered
  - notice/Not sent
  - requirements/tech#notice
  - requirements/tech#General
  - requirements/rules#notice
  - requirements/quality#away-notifications
drift: null
proposal: "0027"
agent: false
---
# Mandare l'avviso a ntfy dopo dieci secondi se l'argomento è valido

Un avviso nasce in attesa e, passati dieci secondi, l'impostazione viene riletta. Se l'argomento è un nome valido (lettere, cifre, trattino e trattino basso, da 1 a 64 caratteri) l'avviso va a ntfy.sh con quel nome; se è un URL assoluto http o https di un argomento, senza credenziali dentro, va a quell'URL così com'è. Se l'argomento è stato tolto o non è valido l'avviso finisce in Non partito, senza nessuna richiesta di rete. Il testo si compone in quel momento con quanto vero allora, non alla nascita. L'invio è una sola richiesta POST con il testo come corpo e titolo, priorità e tag come intestazioni, senza credenziali né azioni ntfy; è riuscito solo con una risposta 2xx, ogni altra risposta, errore di rete o mancata risposta entro 10 secondi è un fallimento. L'invio è asincrono, ogni errore è catturato e non blocca né l'editor, né l'agente, né il round di domande, che non cambiano stato. I timer sono fermati se l'avviso è annullato o l'estensione si disattiva. L'avviso non è persistito: sta solo in memoria e sparisce con la finestra. È l'unica richiesta di rete che Trama fa da sé, e solo con un argomento indicato; nessuna nuova libreria runtime.
