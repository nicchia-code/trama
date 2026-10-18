---
status: approved
base:
  agent-launching/agent-terminal.md: 52ea51af1405e03d46825b79c8802ffd2b321593df70b67a389d57b2baf8cbc1
  work/announcement.md: 5eedf8e624f63b786cf93f861d20384c4550d514d38d34875e4ea58509461d55
  requirements/tech/questions-notices.md: 79f09ad9087d55d5d13c7760f873ec52cb15563eb95ff24a8696e44031a91242
  requirements/rules/autopilot.md: ddb4280156f679570b7f59f4a4ed5f3467db5a32edf623250ce7b8e332dce3c0
  requirements/rules/announcements.md: 36753025887593350880cfa63de29e6fe8493a7f1da9c46f797e5866957aaca1
  requirements/tech/announcements.md: b3d0e4554fe3e79c3084592f60c88dee47fb7e8696b0c786244bb437d72e3cea
  requirements/tech/agent-terminal.md: 4c4ab21292fff81f4709fe7db9f569683c83add10d1c1d5ef4f5f7eb40c40116
delete: []
request: 2026-10-18T10-54-04
created: 2026-10-18T09:02:38.348Z
label: Attese di Cursor
---
# Attese di Cursor

Due bug visti con la chat di Cursor. Dopo ogni round di domande l'agente di Cursor aspetta con un timer fisso invece di riprendere appena `trama ask` stampa il risultato, perché le skill dicono solo di «continuare ad aspettare» senza dire come. Dopo il clic su `Run all` il pulsante non diventa grigio subito, perché con la chat il Run comincia solo quando il comando che invia l'istruzione risponde, e in Cursor `composer.createNew` risponde molto tardi.

Decisioni prese nell'intervista:
- Attesa del round: `trama ask` parte con l'attesa predefinita di Cursor; se va in background l'agente aspetta solo quel comando, senza timer fissi, `sleep` o letture periodiche, e senza chiudere il turno. Vale per `trama-design`, `trama-import` e `trama-resolve-drifts`.
- Fine del turno con un round aperto: come oggi, resta la fine del lavoro; la correzione sta nelle skill.
- Inizio del lavoro con la chat: il lavoro (Run, scan, risoluzione) conta come in corso appena Trama comincia a inviare l'istruzione alla chat, senza aspettare la risposta del comando; così `Run all` diventa grigio subito, come col terminale.
- Ambito: tutti i lavori lanciati nella chat e il ghost del lancio, sia nella chat di Cursor sia in quella di Copilot.
- Deeplink e appunti: come oggi, nessun lavoro parte e `Run all` resta disponibile; il lavoro e il ghost già comparsi all'inizio dell'invio spariscono.
- Ghost tolto per un ripiego: senza avviso.

Assunzioni: il segno di richiesta di design inviata e il ricordo dell'ultimo scan del Sistema restano legati alla consegna come oggi (non sono lavori né ghost). Il pannello non ha uno stato provvisorio: il pulsante diventa grigio con il quadro nuovo dell'host.
