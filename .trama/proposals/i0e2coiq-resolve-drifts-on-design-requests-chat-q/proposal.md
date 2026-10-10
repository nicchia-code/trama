---
status: approved
kind: resolution
drifts:
  - drift: 4g1v5bmc
    decision: fix-code
    option: 1
  - drift: tb5h0tft
    decision: proposal
  - drift: haxrfyc2
    decision: fix-code
    option: 1
  - drift: qdfjtxus
    decision: proposal
  - drift: sza6qtx4
    decision: proposal
  - drift: xy6tbbvu
    decision: proposal
  - drift: rmxs8h95
    decision: fix-code
    option: 1
base:
  agent-launching/drift-resolution.md: c981caf6411e6d5867c304c2a63e46669bbc8a553ba5551f7932d97f1306ed06
  actors/time.md: c3ffca65415ebb064078ddb1f8c2d48d73628302023ae241f62a5ab4d32ff567
  project-setup/project.md: 6affc4b3e6e08d459691ff9193335602ad06e51013d08f677128f30182ebfc63
  work/task.md: 804bb12a6375c242176c611f165703b151525f0e5402c656e85dddb79cde895c
  requirements/rules/drifts.md: 2f85f54003fdf08bcdfe60bfe913bd9767f5fd6ad2a05e7232cb9f2e5ef281ae
  requirements/tech/announcements.md: fa56e47817e6119536417a6eef11b0192d03f74115e7e1186a46cefda23e92c1
  requirements/rules/project.md: 0e5074111279b211fc727ff281286f979a06885d735e5df67c844d7d15e5392b
  requirements/rules/tasks.md: 09823593520b2c4753f69b8db23d7256291440c408bc40d46ececefc6e8c45cf
delete: []
created: 2026-10-10T09:00:46.344Z
---
# Resolve Drifts on design requests, chat quiet period, Draft discard, omp definitions, unknown-terminal Tasks and Drift notes

Risolve sette Drift aperti con le decisioni del developer:

- 4g1v5bmc Consumed request reappears after editor restart: si corregge il codice; le richieste consumate o abbandonate sono ricordate anche dopo un riavvio dell'editor, e la scheda ripristinata di una richiesta finita si chiude senza salvare né inviare.
- tb5h0tft Read-only commands restart the quiet period of a non-Cursor chat run: cambiano Model e Requisiti; nella chat di un editor che non è Cursor anche i comandi di Trama che leggono soltanto fanno ripartire la quiete dei lavori di quella chat.
- haxrfyc2 Discarding an attached Draft is refused: si corregge il codice; il developer può scartare una bozza allegata a un Drift aperto, e il Drift resta aperto e com'è.
- qdfjtxus Initialization refuses over customised omp sub-agent definitions: si descrive il comportamento attuale; una definizione dei sotto-agenti di omp diversa da quella di Trama blocca l'inizializzazione come una skill personalizzata, salvo conferma.
- sza6qtx4 Model does not describe omp sub-agent definitions: si descrive il comportamento attuale; inizializzazione e aggiornamento delle skill scrivono anche le due definizioni dei sotto-agenti di omp.
- xy6tbbvu Agent takes a Task without knowing its terminal: si descrive il comportamento attuale; un Task preso dall'agente senza un terminale o una chat riconosciuti è rilasciato da qualsiasi fine che rilascia i Task presi.
- rmxs8h95 Empty note accepted when accepting a Proposal or dismissing a Drift: si corregge il codice; una nota data accettando la Proposal allegata o chiudendo il Drift è rifiutata anche se vuota.
