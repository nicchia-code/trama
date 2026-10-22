---
column: done
technical: false
refs:
  - design-request
  - requirements/rules#design-request
drift: null
proposal: drdvf0p2
agent: false
created: 2026-10-22T05:44:21.487Z
finished: 2026-10-22T05:50:06.601Z
---
# Skill e immagini all'esecuzione

Quando il Task è fatto, le skill `skills/trama-design/SKILL.md`, `skills/trama-setup/SKILL.md` e `skills/trama-implement/SKILL.md` descrivono come le immagini di una richiesta scritta arrivano a chi realizza i Task.

`trama-design` e `trama-setup`: le immagini della richiesta restano prima di tutto contesto per scrivere la Proposal; ciò che conta si scrive a parole e le immagini della richiesta, o i loro percorsi, non sono mai copiate, collegate o citate nella Proposal, nel Modello, nei Requisiti, nelle Specs o nel testo dei Task. Quando la richiesta (di design o di setup) collega almeno un'immagine che l'agente vede ed è un file locale (nella cartella delle immagini della richiesta o altrove nel progetto), il primo round dell'intervista ha una sola domanda a scelta singola, sì/no, che chiede se mandare tutte quelle immagini anche al modello che realizza i Task; la raccomandazione la sceglie l'agente guardando le immagini (sì quando mostrano qualcosa che il codice deve rispettare, come una schermata o un layout); una domanda saltata vale la raccomandazione. Le immagini collegate da un indirizzo web non contano e non vanno mai all'esecuzione. Nessuna scelta per immagine.

Con il no nessuna immagine è legata. Con il sì l'agente lega ogni immagine locale ad almeno un Task, delle Proposal del design, a cui serve, con `trama proposal edit <id>` e `images: [{ task, path }]`, prima di consegnare la Proposal legata alla richiesta, perché quella consegna cancella la cartella delle immagini della richiesta; per i Task delle Proposal consegnate dopo può legare un'immagine copiandola da un Task a cui l'ha già legata (il percorso stampato da `trama task show`). Con Rework with feedback, la skill che rifà una Proposal i cui Task avevano immagini le lega ai Task nuovi a cui servono copiandole dai Task vecchi, senza chiedere di nuovo al developer.

`trama-implement`: per un Task con immagini (blocco `Images` di `trama task show`, campo `images` con `--json`), l'agente le guarda prima di cominciare quando realizza il Task da sé; quando lo affida a un sotto-agente gli passa i percorsi dicendogli di guardarle prima di cominciare, e il sotto-agente le apre con lo strumento con cui legge i file. Nessuna immagine entra nel testo dell'istruzione. Un'immagine che il modello non riesce a vedere è ignorata in silenzio.

Il comando `images` e il formato in `.trama/task-images/<identità del Task>/` (vedi `requirements/data#task`) sono realizzati da un altro Task; questo Task cambia solo i testi delle skill (anche le copie in `.agents/skills/` se il progetto le genera da `skills/`).
