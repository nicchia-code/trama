---
column: done
technical: true
refs:
  - requirements/tech#notice
  - requirements/ui#notice
  - requirements/quality#away-notifications
drift: null
proposal: null
agent: false
---
# Dichiarare l'impostazione trama.ntfy solo nelle impostazioni utente

L'estensione offre l'impostazione trama.ntfy: testo libero, vuoto per default (vuoto o di soli spazi vuol dire non impostata), valida solo nelle impostazioni utente e ignorata nelle impostazioni del workspace, così l'argomento non finisce in un file versionato con il progetto. La descrizione dell'impostazione, in inglese, dice tutto quello che i Requisiti di interfaccia elencano: nome o URL completo, quando parte la notifica, che vale solo per gli agenti avviati da Trama in un terminale, che vuota non manda nulla, che vale solo nelle impostazioni utente e che sul servizio pubblico l'argomento funziona da password. Un lettore dell'impostazione (come per la lingua) restituisce il valore senza spazi ai bordi e lo rilegge a ogni uso. L'argomento non compare mai in messaggi all'utente, log o diagnostica.
