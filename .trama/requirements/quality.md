---
description: "Use when the work touches performance, security, privacy, accessibility, offline behaviour, localisation or reliability."
---
# Quality

## General

## away-notifications
- Riservatezza: un avviso lascia la macchina e va al servizio indicato dall'impostazione. Contiene solo il nome della cartella del progetto, il testo e le etichette delle opzioni della domanda come le ha scritte l'agente, e i conteggi della Board. Non contiene mai risposte, contenuto di file, percorsi, Proposal, Task o Drift. Sul servizio pubblico l'argomento funziona da password, e l'impostazione lo dice.
- L'argomento e l'URL non compaiono mai in messaggi all'utente né in log o diagnostica di Trama, perché l'argomento è un segreto.
- Affidabilità: l'invio è asincrono e ogni errore è catturato; non blocca né l'editor né l'agente né il round di domande, e un fallimento non cambia lo stato di nessuno di essi.
- Un avviso non è persistito e non viene recuperato: se la finestra si chiude o il computer è in sospensione prima della scadenza o dell'invio, l'avviso va perso, e questo limite è detto nella descrizione della Feature.
