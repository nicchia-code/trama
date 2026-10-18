---
status: approved
kind: resolution
drifts:
  - drift: m0k7pd0q
    decision: fix-code
    option: 1
  - drift: xrxapt04
    decision: proposal
base:
  requirements/ui/settings-specs.md: 570f25fe0b01265599d15801bbbfe07740400354760008c85e4c335ab956293e
delete: []
created: 2026-10-17T20:41:22.240Z
---
# Risoluzione dei Drift sulle impostazioni della scheda Settings

Risolve due Drift sulle impostazioni della scheda Settings.

- Drift m0k7pd0q – Menu della delega con testi copiati nel codice: si corregge il codice; il menu della delega dei Drift prende livelli, spiegazioni e valore predefinito dallo schema del manifest, come gli altri controlli a scelta fissa.
- Drift xrxapt04 – Requisiti in conflitto sul tipo di submitWhileRunning: si adotta la Proposal allegata; nella scheda Settings l'impostazione che lascia partire un Run mentre un altro è in corso è una casella di spunta, come dicono il manifest e il resto dei Requisiti.
