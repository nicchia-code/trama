---
description: "Use when the work touches performance, security, privacy, accessibility, offline behaviour, localisation or reliability."
---
# Quality

## General

## editor-chat
- Affidabilità: `trama cursor-hook` e `trama copilot-hook` stanno sul percorso di ogni prompt che il developer invia nella chat, quindi non possono rallentarlo né bloccarlo. Se l'editor non risponde entro un secondo rinunciano ed escono con 0; non scrivono niente su disco e niente su standard error della chat tranne un errore di scrittura del file degli hook.
- Riservatezza: gli hook non conservano né registrano il testo del prompt; lo leggono solo per riconoscere se comincia con una skill di Trama, e all'editor mandano l'evento, l'identificatore della conversazione e la cartella del progetto, mai il prompt. Le voci di Trama in `~/.cursor/hooks.json` e il file degli hook di Copilot contengono solo un percorso locale.
- Compatibilità: i comandi interni di Cursor che Trama usa (`composer.createNew`, il deeplink con `workspace`), i comandi della chat di VS Code (`workbench.action.chat.open`) e gli hook della chat di VS Code (in anteprima) non sono API stabili. Ogni nuova versione di Cursor o di VS Code che il developer usa è provata dallo smoke test dell'accettazione (una richiesta di design e un `trama ask`) prima di dichiararla supportata; un comando che sparisce passa al ripiego, e il developer lo vede come un prompt negli appunti, mai come un errore; un hook che non scatta lascia il lavoro in corso finché la conversazione non è chiusa o l'editor non riparte.

## agent-launching
- Sicurezza: la chiave di Jev sta solo nell'archivio segreto dell'editor. Non entra mai nelle impostazioni, nell'ambiente dei terminali, nei file del progetto o di `.trama/`, nell'istruzione, nell'output di `trama classify` o nei log; il comando `trama` non la riceve mai.
- Sicurezza: `trama.agent`, `trama.terminalLocation`, `trama.autoExit`, i ruoli dei modelli e `trama.system1` si leggono solo dalle impostazioni utente, e i nomi dei modelli e il JSON degli hook entrano nella riga di comando solo citati per la shell, così il file di un repository clonato non può cambiare il programma o le opzioni che Trama esegue.
- Riservatezza: senza `trama.system1` impostata nulla lascia la macchina per lo smistamento. Con Jev acceso, a TypeSafe va solo lo stato che l'agente passa a `trama classify`, mai altri file del progetto.
- Affidabilità: una chiamata a Jev dura al più 10 secondi e non blocca mai l'editor; un classificatore che non risponde manda la Machine all'analisi, così una differenza non va mai persa per un errore di rete.

## agent-terminal
- Affidabilità: l'hook di omp e quello di Claude Code non bloccano mai l'agente: ogni chiamata a `trama agent-event` ha un timeout di 3 secondi e ogni errore è ignorato. Chiudere un terminale con `trama.autoExit` non blocca l'editor e non lancia errori se il terminale è già chiuso.
- Affidabilità: senza quiete, un agente morto senza segnale lascia Run, ghost e Task presi in corso; il developer li libera chiudendo il terminale o la conversazione, con `trama task take-back`, o riaprendo l'editor, che azzera i Run e ritira gli annunci.

## task
- Una corsa che realizza dei task legge Modello e Requisiti di ciascun task una volta, da `trama task show`, e esegue test, lint e build del progetto una volta, alla fine della corsa, dopo l'ultimo gruppo; mai un sotto-agente.
- Mentre scrive, l'agente o il sotto-agente non rilancia la suite intera al posto dei test di quel task.
- Prestazioni: quando l'agente ha dei sotto-agenti, una corsa realizza insieme fino a quattro Task che non riguardano la stessa cosa, la scansione confronta fino a venti Machine insieme, con al massimo quattro chiamate `classify` contemporanee all'editor, e il design esplora con fino a quattro sotto-agenti. Il limite di quattro per Task e design tiene sotto controllo il carico della macchina, i limiti del fornitore dell'agente e i conflitti fra file; per la scansione il limite è venti e i limiti del fornitore sono rispettati dalla coda delle chiamate `classify` a quattro.
- Prestazioni: la scansione dopo l'approvazione legge solo l'ambito di scansione della Proposal, non le Feature intere.
