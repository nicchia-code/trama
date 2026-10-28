---
status: rejected
base:
  actors/developer.md: 2065cb13e7c230c335f54f97be2f9a1f88cdfa948314e0b145e8f6a3c78a397e
  project-setup/project.md: d4f5690ceeda58000abf2b54d2159fba81efab30cd65027b610b41d8a5ca72fa
  requirements/rules/general.md: c6d7a020b91a61e807f3ace701c90ad9e829682629f65b3d4b1a745376176f3d
  requirements/tech/agent-terminal.md: 0aa26eeefd5d39f36e78fef8378041ec6fa9d0af2dd813b48905be56836106fa
delete: []
created: 2026-10-27T08:01:59.649Z
label: Identity rewrite
---
# Rimozione riscrittura identità

Il Model e due Requisiti descrivono ancora il comando `trama ids rewrite` e la transizione `developer.REWRITE_IDENTITIES`, mentre il Requisito `cli#General`, `docs/cli.md` e `CHANGELOG.md` dicono che il comando è stato tolto senza sostituto e il codice non lo ha. Questa Proposal allinea il Model e i Requisiti allo stato dichiarato dalla documentazione.

Decisioni prese dall'agente, da controllare:
- Il comando resta rimosso: la transizione `developer.REWRITE_IDENTITIES` esce dal Model, insieme al suo Evento nell'Actor `developer`.
- Le schede ancora numerate `NNNN-<slug>` restano leggibili ma non si convertono più, come dice `cli#General`.
- `rules#General` e `tech#agent-terminal` smettono di nominare `ids rewrite`: i comandi di decisione eseguibili dall'agente diventano sei (`proposal approve`, `proposal reject`, `proposal discard`, `drift resolve`, `task take-back`, `task delete`).

Se il developer preferisce tenere il comando, questa Proposal va rifiutata e il Requisito `cli#General` e la documentazione vanno invece aggiornati.

## Feedback

Drift 41tpljc1 resolved by Proposal ogv9l141
