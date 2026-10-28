---
status: rejected
base:
  agent-launching/design-request.md: 74365746bae46d41bba503a9501f9aff7b8c6a7838bdfcd10a2dcafc9fbe7d0c
  agent-launching/omp-chat-conversation.md: 8c883720995c6bb8f3b1a7609e1722e09756cecb89d939a73be5138ed1a460d8
  requirements/rules/requests.md: 04958e39be577122f1671bbf0dda28fa2c5e04ee95b25796e617ec1052d65f14
  requirements/rules/omp-chat-conversation.md: 0bdac2a9b6657c03564b66255fb808d95033f1803ca991236e6fe1e6a391d974
  requirements/tech/requests.md: 78064eedb7e7d064b96354a6dc2e3166ef5e60ba9434891e65f587a9d8f9f5bd
  requirements/quality/omp-chat.md: 7aa380aa9e3167c57d5f5fa18320575f0856671e5e01f0c582d1131ab6202740
delete: []
request: 2026-10-28T12-21-51
created: 2026-10-28T11:44:38.171Z
label: Un solo launcher
---
# Un solo launcher per lavoro

Il developer segnala una regressione: aprendo una nuova richiesta con + Add Work Item si aprono insieme una conversazione di omp Chat e un terminale di omp, senza l'avviso del ripiego. Il Modello diceva già "con il launcher scelto", ma non escludeva in modo esplicito il doppio lancio né diceva che creare una richiesta non lancia nulla. Questa Proposal lo rende esplicito e porta il Task che trova e corregge la causa, con i test di regressione.

Decisioni dell'intervista:
- Con omp Chat in uso, l'invio di una richiesta apre solo una conversazione di omp Chat, nessun terminale.
- Se la conversazione non parte, il ripiego resta il terminale con l'avviso, come oggi; nella vista non resta nessuna conversazione di quel lavoro.
- Il limite per aprire la sessione resta 30 s (già oltre i 10 s chiesti); un fallimento certo (omp mancante, errore, uscita) ripiega subito.
- Il doppio lancio compare già con + Add Work Item, alla sola apertura della scheda, e senza l'avviso del ripiego: creare o aprire una richiesta non deve lanciare nulla.
- La regola "un solo launcher per istruzione" vale per tutti i lavori lanciati da Trama, non solo per le richieste scritte.
- Servono test di regressione dell'host con `bun:test`.

Nota per chi realizza: la lettura statica del codice non ha trovato un percorso che lanci due volte (`DesignRequests.open`, `send`, `closed`, `deliver` in `extension/src/host/design-requests.ts`; `launchAgent` in `extension/src/host/agent.ts`); la causa va riprodotta.
