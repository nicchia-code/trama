---
description: "Use when the work touches performance, security, privacy, accessibility, offline behaviour, localisation or reliability."
---
# Quality

## General

## cursor-chat
- Affidabilità: `trama cursor-hook` sta sul percorso di ogni prompt che il developer invia in Cursor, quindi non può rallentarlo né bloccarlo. Se l'editor non risponde entro un secondo rinuncia ed esce con 0; non scrive niente su disco e niente su standard error di Cursor tranne un errore di scrittura del file degli hook.
- Riservatezza: l'hook non conserva né registra il testo del prompt; lo legge solo per riconoscere se comincia con una skill di Trama, e all'editor manda l'evento, l'identificatore della conversazione e la cartella del progetto, mai il prompt. Le voci di Trama in `~/.cursor/hooks.json` contengono solo un percorso locale.
- Compatibilità: i comandi interni di Cursor che Trama usa (`composer.createNew`, il deeplink con `workspace`) non sono documentati. Ogni nuova versione di Cursor che il developer usa è provata dallo smoke test dell'accettazione (una richiesta di design e un `trama ask`) prima di dichiararla supportata; un comando che sparisce passa al ripiego, e il developer lo vede come un prompt negli appunti, mai come un errore.

## agent-terminal
- Affidabilità: aprire o riusare una finestra esterna non blocca l'editor. Il processo del terminale parte staccato, ogni errore è catturato e mostrato come descritto in `ui`, e la fine del comando arriva solo dal marcatore, mai dall'attesa del processo del terminale.
- Sicurezza: la riga di comando che gira nella finestra esterna contiene l'istruzione solo citata per la shell, e `trama.externalTerminalCommand` si legge solo dalle impostazioni utente, così il file di un repository clonato non può far eseguire un comando al posto del terminale.
- Riservatezza: il marcatore di fine contiene solo lo stato di uscita, mai l'istruzione, il suo testo o percorsi del progetto.

## worktree-round
- La cartella aperta non riceve mai i marcatori di conflitto: l'unione si prova solo nel worktree di merge, e si applica alla cartella solo quando è pulita e non ha conflitti.
- Se un worktree sparisce prima dell'unione, quella Proposal torna da decidere e il developer è avvisato; le altre continuano. Vale anche se a cancellarlo è la pulizia automatica dei worktree di Cursor.
- Scrivere `trama.worktreeAgent` vuoto nelle impostazioni utente non cancella un comando già impostato.

## task
- Una corsa che realizza dei task legge Modello e Requisiti di ciascun task una volta, da `trama task show`, e esegue test, lint e build del progetto una volta, alla fine della corsa, dopo l'ultimo gruppo; mai un sotto-agente.
- Mentre scrive, l'agente o il sotto-agente non rilancia la suite intera al posto dei test di quel task.
- Prestazioni: quando l'agente ha dei sotto-agenti, una corsa realizza insieme fino a quattro Task che non riguardano la stessa cosa, la scansione confronta fino a quattro Machine insieme e il design esplora con fino a quattro sotto-agenti. Il limite di quattro tiene sotto controllo il carico della macchina, i limiti del fornitore dell'agente e i conflitti fra file.
- Prestazioni: la scansione dopo l'approvazione legge solo l'ambito di scansione della Proposal, non le Feature intere.
