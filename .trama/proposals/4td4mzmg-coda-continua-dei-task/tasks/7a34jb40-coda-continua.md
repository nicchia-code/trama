---
refs:
  - task
  - requirements/rules#task
  - requirements/tech#task
  - requirements/rules#agent-launching
---
# Coda continua

Una corsa su più Task tiene al lavoro fino a N Task insieme, uno per sotto-agente, e non aspetta più la fine di un gruppo: appena un sotto-agente finisce, con il Task in Done, chiuso senza modifiche o fermato da un Drift, la corsa chiede i Task per i posti liberi e li affida subito.

Fatto quando:
- `trama task next --batch --max <N>` dà da uno a N Task eseguibili nell'ordine di sempre, mai due che riguardano la stessa cosa e mai uno che riguarda la stessa cosa di un Task In progress preso dall'agente; quando non ne può dare nessuno stampa ciò che stampa `trama task next`;
- `trama-implement` chiede all'inizio N Task, con N il limite dei sotto-agenti dell'istruzione, poi a ogni sotto-agente che finisce chiede i posti liberi e avvia subito i Task che riceve; ha finito i Task quando nessun sotto-agente lavora e non ne riceve altri; poi verifica finale, scansione di fine corsa e History come oggi;
- nel Run automatico la delega si ricontrolla con `trama drift autopilot --json` prima di affidare ogni Task;
- senza sotto-agenti, o con un posto solo, i Task si realizzano uno alla volta;
- il pre-flight parte prima del primo Task, come prima del primo gruppo oggi;
- `docs/cli.md` e la documentazione della corsa parallela parlano di posti liberi e non più di gruppi.
