---
column: done
technical: false
refs:
  - announcement/Announced
  - announcement/Announced/agent.SUBMIT_PROPOSAL
  - requirements/data#announcement
  - requirements/rules#announcement
  - requirements/tech#announcement
drift: null
proposal: hlnh5d44
agent: false
created: 2026-10-09T07:14:37.766Z
finished: 2026-10-09T08:23:59.459Z
---
# Drop rework announcements and hide ghosts of attached Drafts

Il rifacimento della Proposal obsoleta di un Drift non esiste più, ma gli annunci lo ricordano ancora: un annuncio può portare il Drift che rifà, quel campo è letto e riscritto, la scelta di correggere il codice ritira l'annuncio del rifacimento di quel Drift, e il ghost di una Proposal la cui Draft è allegata a un Drift aperto è disegnato dentro quel Drift come «Being reworked».

Quando è fatto:
- Nessun annuncio porta più il campo `drift`: Trama non lo scrive mai, nemmeno quando riscrive un annuncio rimasto da prima (per esempio aggiornando `touched`), e in un annuncio rimasto da prima è ignorato: quell'annuncio vale come uno qualunque del suo tipo.
- Scegliere di correggere il codice su un Drift non ritira più nessun annuncio (la transizione `drift.CODE_FIX_CHOSEN` → Withdrawn non c'è più); gli annunci si ritirano solo nei modi rimasti.
- Il ghost di una Proposal la cui Draft è allegata a un Drift aperto non si disegna da nessuna parte: né in To decide né dentro la scheda del Drift. Il Drift non ha più un ghost di rifacimento al posto della sua Proposal allegata.
- La consegna resta com'è: la consegna di una Proposal consegna solo un annuncio di Proposal; la Draft legata all'annuncio di un Drift non lo consegna, lo consegna il Drift.
- Il Board non riconosce più i titoli «Rework of Proposal …» per riscriverli con il numero breve, né nel ghost né nell'avviso di un annuncio ritirato.
- Il formato dei file degli annunci documentato non ha `drift`, e `source: request` dice che Trama lo scrive per una richiesta di design o per Resolve Drifts.

Non fanno parte di questo Task il lancio di Resolve Drifts e il suo annuncio, il lancio del rifacimento dal pannello, il pulsante «Rework Proposal», il comando `trama drift replace-proposal` e il riquadro della Proposal allegata nella scheda del Drift.
