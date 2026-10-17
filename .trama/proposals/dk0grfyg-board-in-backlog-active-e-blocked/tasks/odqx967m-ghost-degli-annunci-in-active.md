---
technical: false
refs:
  - announcement
  - announcement/Announced/agent.SUBMIT_PROPOSAL
  - announcement/Checking
  - requirements/rules#announcement
---
# Annunci con ghost in Active, Resolve Drifts annunciato e titoli dei controlli senza design

Quando il Task è finito, il ghost di ogni annuncio, di qualunque tipo (Proposal, Drift, Task o controllo), appartiene alla colonna `Active`; il tipo dell'annuncio dice soltanto dove arriverà la scheda vera: `Backlog` per una Proposal, `Blocked` per un Drift, `Active` per un Task, nessuna colonna per un controllo. Nel codice non resta alcuna corrispondenza tipo → colonna del ghost basata sulle vecchie colonne (Work Items, Ready, In progress): va tolta, non affiancata.

- `agent.SUBMIT_PROPOSAL`: la consegna della Proposal legata a un annuncio di Proposal consegna l'annuncio e la scheda arriva in `Backlog`. La consegna della Draft legata all'annuncio di un Drift continua a non consegnarlo: lo consegna il Drift archiviato con il suo ID, la cui scheda arriva in `Blocked`. Una Proposal destinata a un Drift non ha mai un ghost a sé.
- Resolve Drifts lanciato con un agente del terminale annuncia una Proposal con il titolo `Resolve Drifts` sia da `Resolve all` sia da `Resolve` su un singolo Drift, al momento in cui l'istruzione è davvero inviata, legata al terminale in cui è digitata; la prima Proposal che l'agente comincia senza nominare un annuncio la prende, come per le richieste di design.
- Controlli (`Checking`): il ghost di un controllo sta in `Active` insieme agli altri e mostra la fase (Verifying o Scanning); il controllo resta annunciato dopo che i Task della corsa hanno lasciato In progress. I titoli non prevedono più la corsa di un design: spariscono `Final check of <titolo della Proposal>` e ogni titolo legato a `Run this design`; restano `Final check after Task <numero breve>`, `Final check after all Tasks` per `Run all`, `Pre-flight before Task <numero breve>`, `Pre-flight before all Tasks`, `Pre-flight before automatic fixes`, `Scan of the System`, `Scan of Feature <a>`, `Scan of Features <a>, <b>`. Vanno aggiornati i punti che compongono questi titoli (skill `trama-implement`, `trama-scan`, eventuali helper in `src/core`/`src/cli`) e i relativi test.

Tutte le altre regole degli annunci (ritiro per hook a riposo, fine comando, chiusura terminale, chat, Draft scartata, avvio dell'estensione) restano invariate.
