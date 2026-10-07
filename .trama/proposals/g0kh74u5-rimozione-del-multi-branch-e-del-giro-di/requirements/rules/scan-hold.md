---
description: "Usa quando implementi l'interruttore Hold scan e la scansione in sospeso."
---
# Regole di Hold scan

## scan-hold
- Accendere Hold scan riesce sempre e parte con il sospeso vuoto.
- Una Proposal entra nel sospeso solo se, con l'interruttore acceso, è approvata dal pannello (direttamente o accettando la Proposal di un Drift) ed è un'approvazione che farebbe partire la scansione automatica (`rules#agent-terminal`), tolto il comando dell'agente: modifica ordinaria, `trama.autoScan` acceso e almeno una Feature toccata che esiste ancora. Una Proposal già nel sospeso non entra due volte.
- Spegnere con il sospeso vuoto scrive `off` e non invia nulla.
- Spegnere con qualcosa in sospeso considera le Proposal in sospeso il cui ambito di scansione ha ancora un riferimento dentro una Feature che esiste. Se non ce n'è nessuna, scrive `off`, svuota `held` e avvisa (vedi `ui`). Altrimenti invia l'istruzione della scansione in sospeso con la stessa catena di consegna di un pulsante: se il comando dell'agente serve e non è configurato lo chiede una volta, e in Cursor, se `composer.createNew` non riesce, ripiega sul deeplink e sugli appunti invece di mostrare l'avviso «Scan now».
- Appena l'istruzione è consegnata (scritta nel terminale, inviata alla chat, lasciata pronta nella chat o copiata negli appunti) Trama scrive `off` e svuota `held`. Se non è consegnata (richiesta del comando annullata, finestra esterna che non si apre) l'interruttore resta `on`, `held` non cambia e il developer è avvisato (vedi `ui`).
- L'istruzione elenca le Proposal considerate dalla più vecchia alla più recente: "Use the trama-scan skill on what Proposals <a>, <b> changed: each scan scope is in `trama proposal show <id>`. Compare every reference once, against the current Model, and link every Task you file with --proposal to the most recent of those Proposals whose scan scope covers it." Con `trama.autoImplement` acceso la stessa riga prosegue: " If the scan files no Drift, go on with the trama-implement skill on every Task of those Proposals that is in the \"todo\" column, taking them from `trama task next --batch --proposal <id>` for each Proposal in that order, one group at a time, until it says there is none." Con una sola Proposal l'istruzione è esattamente quella della scansione automatica. La frase della lingua e la seconda riga della chat di Cursor si aggiungono come per ogni istruzione.
- Il terminale della scansione in sospeso si chiama `Scan` e si apre o si riusa come per la scansione automatica.
- Le scansioni chieste a mano (System o Feature) non leggono e non cambiano il sospeso.
- `trama proposal approve` e `trama drift resolve --accept-proposal` dalla riga di comando non toccano il sospeso, come non avviano la scansione automatica.
