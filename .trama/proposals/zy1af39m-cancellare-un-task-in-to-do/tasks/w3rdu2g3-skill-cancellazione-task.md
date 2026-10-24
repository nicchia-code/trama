---
technical: false
refs:
  - agent
  - requirements/rules#General
---

# Skill: cancellare un Task

Cancellare un Task in To do diventa una delle decisioni del developer che l'agente può eseguire per suo conto, ma solo quando il developer glielo chiede esplicitamente nella conversazione. Le decisioni del developer sono ora: approvare, rifiutare o scartare una Proposal, risolvere un Drift, riprendere un Task, cancellare un Task in To do e riscrivere le identità delle schede. Il comando che la esegue è `trama task delete <id>`, che funziona anche quando lo lancia un agente (`TRAMA_AGENT=1`), senza un avviso aggiuntivo e con le stesse conseguenze di quando lo lancia il developer: Trama non lo rifiuta per chi lo lancia. Il comando stesso è descritto e realizzato da un altro Task della stessa Proposal.

Quando il lavoro è finito:

- Ogni skill distribuita che elenca le decisioni che l'agente esegue solo su richiesta esplicita del developer include anche la cancellazione di un Task in To do. Sono le regole in testa a `skills/trama-design/SKILL.md`, `skills/trama-implement/SKILL.md`, `skills/trama-import/SKILL.md`, `skills/trama-resolve-drifts/SKILL.md`, `skills/trama-scan/SKILL.md`, `skills/trama-setup/SKILL.md` e la frase delle decisioni in `skills/trama-compare/SKILL.md`. Ciascuna dice, nel suo stile e in inglese, che l'agente cancella un Task (`trama task delete`) solo quando il developer glielo chiede esplicitamente nella conversazione; senza quella richiesta non decide e non ne fa una domanda, ma si ferma e dice al developer che la decisione è sua, sulla Board. La richiesta di progettare, scansionare, realizzare Task, importare o preparare una risoluzione non autorizza da sola a cancellare un Task.
- Lo stesso vale per i testi fissi che l'estensione manda all'agente e che elencano quelle decisioni: il punto 6 di `extension/media/ask-more.md` e la frase delle decisioni di `extension/media/general.md`. In `ask-more.md`, fra i comandi che permettono di sistemare le schede su richiesta esplicita, `trama task delete <id>` è il modo per togliere un Task in To do che il developer non vuole più.
- Nessuna skill e nessun testo fisso dice di cancellare un Task da solo, per esempio per «fare pulizia» dopo una corsa o una scansione.
- Le copie installate delle skill si aggiornano come sempre con l'aggiornamento delle skill del progetto; non si scrivono a mano.
- I testi non usano la prima persona e restano in inglese, come il resto delle skill.
