---
status: approved
base:
  work/drift.md: 31e74a55d8ce027c0d3c2c1116f3d1886315c87f573b1afaed3e5cfc77c78cff
  work/task.md: 0fd74238716cb3349a1395bdad160fd9568ad7ab55dbfaf681ff201443efbaec
  actors/agent.md: e96bb94fd216294edc5abbf89b02762eac7bbc076d371bddcb3134a71fe5dd87
  actors/developer.md: d87b6eb465d3b6def4419fdd0499331bb783e28e34f121aa1462edc27d965445
  agent-launching/drift-resolution.md: 143fc8258062c4cfe764bb672b2ac9ba52f5fc16762f20d2f6d6839ba8329f1a
  requirements/data/work.md: c242df05e09f625f04cdfcef1f3edb7bbc70b116121479871b57a6a953e40cf6
  requirements/rules/drifts.md: bb33da8c752fe6a9809831f1c210f57afd39376b161a84ebe4eadfb7fe9de35e
  requirements/rules/tasks.md: 0525a9606a3e25d67ee4ab1b25171ab6362512dda5e50680e93597ffc1ba40fb
  requirements/rules/autopilot.md: 73ae9e4a6c6e94463915035ad2a292303fe85e2fe0584c670fda13171dfbd38e
  requirements/tech/drifts.md: f2a2be572f520030c2c1a4f60bacbc52410d7f465127b5a2f0f35b8211b4bac9
  requirements/tech/work.md: 3a09eca870a15f6184e92420fdfa82a8149bfb3332350900b8d70d908aa1a476
  requirements/ui/work.md: a50538fa8ba86f4b3d500fed3077140f260e0463d5c8bf77936fca75f5bfa36f
  requirements/ui/tasks.md: new
delete: []
request: 2026-10-14T15-05-20
created: 2026-10-14T13:51:26.821Z
---
# Confirm a Drift in the code before filing it and before fixing it

Con l'autopilota acceso un Drift con premessa falsa diventa un Fix Task e poi una modifica inventata: il Drift `1301dta4` diceva che ritirare la delega segna come falliti i Task non avviati, ma il codice già non lo faceva, eppure ne è nato il Fix Task `zwopunwy`. Nessuno controlla oggi che «What happens» sia vero nel codice, né quando il Drift si archivia né quando si corregge.

Decisioni dell'intervista:
- Ogni Drift nuovo deve avere `Where in the code`, anche quello registrato dal developer: Trama rifiuta la creazione senza.
- Tutte le skill che archiviano Drift (scan, pre-flight, scansione di fine corsa, implement, import) rileggono il punto citato e archiviano solo se il codice fa davvero ciò che dice «What happens».
- Un Fix Task comincia con la stessa verifica; se il codice già fa ciò che dice il Model o il Requisito, l'agente non cambia nulla e chiude il Task «senza modifiche» con una nota su cosa ha verificato, e lo dice nel resoconto.
- Solo i Fix Task possono chiudersi così; possono farlo l'agente e il developer, con `trama task move <id> done --unchanged <nota>`.
- Il Drift del Task chiuso senza modifiche passa da Code to be fixed a Dismissed; la nota sta sul Task e il Drift la ricava dal suo Fix Task.
- Se il Task torna fuori da Done dimentica l'esito e il Drift resta Dismissed.
- Un Drift dismesso dal suo Fix Task non impedisce di riarchiviare la stessa differenza.
- Un Task chiuso senza modifiche non conta come realizzato: niente scansione di fine corsa per lui e nessun conteggio sul pulsante Scan.
- Per l'autopilota è un esito riuscito, non un caso fallito: l'origine si sblocca e il ciclo prosegue.
- Nessun limite ai Fix Task per raccolta; la risoluzione automatica non rilegge il codice, basta la verifica del Fix Task.
- Si vede con un badge `no changes` sul Task nella Board e nella riga di comando, e con la nota nei dettagli del Task e in `trama drift show`.
- Un Task ricontrolla i quattro Fix Task della risoluzione automatica `i7p31mdz` (`zwopunwy`, `xpppqbj4`, `0tgef9nw`, `tiz66cst`) e annulla le modifiche inventate.
