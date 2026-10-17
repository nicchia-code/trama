---
status: approved
requires:
  - dk0grfyg
base:
  editor-panel/panel.md: d68309ed885ddf019d9968ebb9f96332ee8a009c9e676e548ad37e065c38488c
  work/announcement.md: dd15bf278db8d84c0f98b51e55ef3e3faa8e5486b7bae76526383ae4ca49dc90
  model-changes/proposal.md: 81b23758420d1686b06fce534453581a2237551115132d76d33d3858a36df8d1
  work/drift.md: 05cfed3b4a1b6c3657ab5e5a04ad3abe2353a1b1fac71fbd97e4cbb1e7d8a2f0
  agent-launching/agent-terminal.md: 7f1740d13553874c0d73727170da8cc51acf1708ecb31ea5baa282d12302d08a
  agent-launching/drift-resolution.md: 1f739b4ada9c2c7616b099f1a4d029d0ec800170401195202c4bfc055eda09a9
  agent-launching/design-request.md: 0395896d49c138e8986aad3cec076b9c67ee34f3c005ec6d3944caa7311f6bf2
  requirements/data/proposals.md: f5be21b76fdd1abdf276d29740b0848e64adf351b55f56edd0564137a6ebe923
  requirements/tech/announcements.md: 5d5af422c78b7684fc083071c216f1c5fcdd009ed6424253bf75d2972bffa3c0
  requirements/ui/ghosts.md: c6ba57cfb8a6daa0defdb8bfb1b7b18437694083dd505b34f6128d12699fd90d
  requirements/ui/work.md: d0b5162f45baae124540d1fd5b89ac83750e3455f67282055f4eefe3f7edab76
  requirements/ui/board.md: 8c4ff7543273bf626f852a5403fd36a8b94e188c5b8c85c1a5f2a4bed4ff9e54
  requirements/rules/announcements.md: bb9031bff899b04c6206ea03cf591dd33215a5ac7e994cec400ad7c3945f4aa9
delete: []
created: 2026-10-17T09:57:07.154Z
---
# Lavori in corso in Active e pulsanti a fine turno

La richiesta «Rework UI/UX - Board» vuole che, per sapere cosa sta succedendo, basti guardare Active, e che nessun pulsante si abiliti mentre l'agente che ha consegnato la scheda sta ancora lavorando (per esempio scrivendo il resoconto dopo `trama proposal submit`). Si appoggia alla Proposal `dk0grfyg`, che mette tutti i ghost in Active.

## Decisioni

- Ogni lavoro che Trama lancia ha un ghost in Active dal momento del lancio, con qualunque agente, nel terminale o nella chat: design, Resolve Drifts, scan e import. Un Run si vede dai suoi Task presi dall'agente e dai suoi controlli.
- I ghost dei lavori dicono tipo e azione in corso: `Scan` «Scanning System» o «Scanning <Feature>», `Import` «Importing from code», `Resolve` «Resolving Drift <numero breve>» o «Resolving <N> Drifts».
- Resolve Drifts ha un solo ghost per lancio, non uno per Drift.
- I ghost restano scheletri con lo shimmer, senza il bordo animato.
- I pulsanti di una scheda appena consegnata da un agente (Approve e Reject di una Proposal, Resolve e Dismiss Drift di un Drift, Run di un Task archiviato) si abilitano solo alla fine del turno di quell'agente; si aspetta solo lui, senza timer. Quando Trama non può riconoscere la fine del turno, si abilitano subito.
- Il motivo mostrato è `The agent is still finishing`.

## Scelte fatte da me, da controllare

- Il ghost di Resolve tiene il titolo «Resolving …» anche dopo che la Draft esiste, fino alla consegna; il titolo è calcolato dal pannello dalle identità dei Drift, per non scrivere numeri brevi nei file.
- Il controllo dello scan annunciato da Trama al lancio è preso dalla skill `trama-scan` quando comincia, senza crearne un secondo; i titoli degli scan diventano `Scanning …` anche quando li annuncia l'agente.
- L'import ha un nuovo tipo di annuncio, il lavoro (State `Al lavoro`), che sparisce senza avviso quando l'agente finisce.
- Una scheda consegnata senza un terminale riconosciuto aspetta, come gli annunci della chat, la fine del turno di una conversazione di Trama del progetto se ce n'è una aperta; un terminale senza hook non fa aspettare; riaprire l'editor dimentica l'attesa.
- I pulsanti in fondo alle colonne (`Run all`, `Resolve all`, `+ Add Work Item`) non aspettano; la riga di comando non aspetta mai.
