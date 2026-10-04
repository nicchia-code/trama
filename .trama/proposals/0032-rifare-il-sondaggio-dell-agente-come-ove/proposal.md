---
status: approved
requires:
  - "0031"
base:
  agent-questions/question-round.md: 469dd993e4784df041a9d95cb8792e7781b072aae73386213e4334cf53f9de4b
  agent-questions/feature.md: 91b61d1883343513261367c07a560ea26edb6e47d6a2212bb9aa398efd676739
  actors/developer.md: d17147cd9be55c3d9f638585ec4430b2c1ccfed07d722afaed9815805ef5c37a
  editor-panel/panel.md: 274c705f3fc3a9a8dc3b56f4e7b47db8208105b4abdbed492b37d988716077cf
  requirements/ui.md: f5ccd5419863b19630468ccb40820dcb9d3e4e0b2aabcca435a599741811aeb9
  requirements/rules.md: b7f60c00c9520c5c592c0bb970a661cadf2a7d9b180c97e358f66f940b788f42
  requirements/data.md: 239e45e556c5a6b71f691b72a8fe20286dbd266e91e2b0a448d9ba67819b7012
  requirements/tech.md: c47893fb7ab259cb5079781b72ad04059b61fe1be9c35912d45849c0e58e773c
delete: []
---
# Rifare il sondaggio dell'agente come overlay nel pannello

Le domande dell'agente oggi passano per la Quick Pick nativa: il testo della domanda sta in un placeholder di una riga, le descrizioni delle opzioni sono troncate e la risposta libera è un input box di una riga, quindi domande e risposte sono spesso tagliate e illeggibili. Il round diventa un overlay modale dentro il pannello Trama (identico in Cursor e VS Code): una domanda alla volta con indice laterale cliccabile e riepilogo finale con Send, testo in Markdown, contesto opzionale per domanda e dettagli opzionali per opzione, area di testo multilinea sempre visibile. La Quick Pick sparisce. Inoltre trama-design, finito il questionario, apre la Proposal senza chiedere conferma di un riepilogo.

Decisioni del developer: overlay nel pannello che si apre da solo in primo piano; riducibile a barra per consultare il Modello; chiudere il pannello lascia il round in attesa con una notifica Reopen; chiudere l'overlay o Skip all chiede conferma e poi consegna subito; Skip per singola domanda senza conferma; Esc non fa nulla; dettagli delle opzioni chiusi con Show details; tasti 1–9; dal riepilogo, dopo una modifica, si torna al riepilogo; Send disabilitato finché manca una risposta o un salto; la Quick Pick sparisce del tutto.

Dettagli scelti dall'agente, da verificare:
- i nomi dei campi nuovi della richiesta: `context` sulla domanda e `details` sull'opzione;
- tutti i testi dell'interfaccia (`Questions from the agent`, `Your answer (optional)`, `Show details`, `Send to agent`, `Answer or skip <n> more question(s) to send.`, la barra e la notifica);
- la soglia di 600 px sotto cui l'indice diventa una riga di pallini, e l'area di testo che cresce fino a dieci righe;
- nella scelta singola si deseleziona l'opzione cliccandola di nuovo, per rispondere solo con il testo;
- quello che si sceglie o scrive senza confermare resta sulla domanda ma non arriva mai all'agente, e con Skip all una domanda non confermata è saltata;
- un nuovo Event `question-round.ROUND_OPENED` fa aprire o portare in primo piano il pannello;
- lo stato del round vive nell'host dell'estensione e il testo scritto vi arriva mentre si scrive, così chiudere il pannello non perde nulla;
- la Proposal richiede la 0031, che tocca gli stessi file: si potrà approvare solo dopo di essa.
