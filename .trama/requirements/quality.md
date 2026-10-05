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

## cursor-chat
- Affidabilità: `trama cursor-hook` sta sul percorso di ogni prompt che il developer invia in Cursor, quindi non può rallentarlo né bloccarlo. Se l'editor non risponde entro un secondo rinuncia ed esce con 0; non scrive niente su disco e niente su standard error di Cursor tranne un errore di scrittura del file degli hook.
- Riservatezza: l'hook non conserva né registra il testo del prompt; lo legge solo per riconoscere se comincia con una skill di Trama, e all'editor manda l'evento, l'identificatore della conversazione e la cartella del progetto, mai il prompt. Le voci di Trama in `~/.cursor/hooks.json` contengono solo un percorso locale.
- Compatibilità: i comandi interni di Cursor che Trama usa (`composer.createNew`, il deeplink con `workspace`) non sono documentati. Ogni nuova versione di Cursor che il developer usa è provata dallo smoke test dell'accettazione (una richiesta di design e un `trama ask`) prima di dichiararla supportata; un comando che sparisce passa al ripiego, e il developer lo vede come un prompt negli appunti, mai come un errore.

## worktree-round
- La cartella aperta non riceve mai i marcatori di conflitto: l'unione si prova solo nel worktree di merge, e si applica alla cartella solo quando è pulita e non ha conflitti.
- Se un worktree sparisce prima dell'unione, quella Proposal torna da decidere e il developer è avvisato; le altre continuano. Vale anche se a cancellarlo è la pulizia automatica dei worktree di Cursor.
- Scrivere `trama.worktreeAgent` vuoto nelle impostazioni utente non cancella un comando già impostato.

## task
- Una corsa che realizza dei task legge Modello e Requisiti di ciascun task una volta, da `trama task show`, e esegue test, lint e build del progetto una volta, alla fine della corsa.
- Mentre scrive, l'agente non rilancia la suite intera al posto dei test di quel task.
