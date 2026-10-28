---
status: resolved
resolution: unified
refs:
  - requirements/rules#project
  - requirements/tech#project
proposal: null
task: null
origin: null
unifiedInto: 2pdnq92f
option: null
note: null
created: 2026-10-27T07:15:38.673Z
job: e60ceeff-b80c-4f03-82bf-504764d7d43a
---
# Copilot cleanup contradicts rules

## What happens

La regola del progetto dice che il controllo all'apertura e Update skills tolgono i pezzi della chat di Copilot scritti dalle versioni precedenti. Il codice non li tocca più, e la regola di tecnologia dice esplicitamente che quella pulizia è sparita. Le due regole si contraddicono.

## What should happen

Una sola regola vale per tutto il progetto: o la pulizia delle tracce di Copilot c'è e la regola di tecnologia non la nega, oppure non c'è e la regola del progetto non la chiede più.

## Fix options

### Keep code, align the rule

Il codice resta senza la pulizia di Copilot, e la regola del progetto va corretta con una Proposal perché dica quello che dice la regola di tecnologia: il controllo all'apertura e Update skills non toccano più i file di Copilot. Nessun file di Copilot viene letto o scritto. Il costo è una Proposal in più, e chi ha ancora tracce di Copilot nel progetto le toglie a mano.

### Restore cleanup in code

Il codice torna a rimuovere le tracce che le versioni precedenti scrivevano per Copilot, all'attivazione, nel controllo all'apertura e in Update skills, come chiede la regola del progetto. La regola di tecnologia va allora corretta con una Proposal, perché non dica più che la pulizia è sparita. Il costo è codice da mantenere per una chat che non è più supportata.

## Where in the code

src/cli/commands/project.ts (Update skills) e extension/src/host, nel controllo all'apertura di Trama; requirements/rules/project.md e requirements/tech/project.md

## Prepared question

```json
{
  "question": {
    "id": "7uge71w4",
    "question": "Le tracce di Copilot vanno ancora tolte dal progetto, o la regola deve dire che non si tolgono più?",
    "context": "La regola del progetto dice che il controllo all'apertura e Update skills tolgono i pezzi della chat di Copilot scritti dalle versioni precedenti. La regola di tecnologia dice che questa pulizia è sparita e che l'estensione non legge né scrive nessun file di Copilot o di Cursor. Le due regole si contraddicono e una sola deve valere per tutto il progetto.",
    "options": [
      {
        "label": "Nessuna pulizia di Copilot, regola del progetto allineata",
        "description": "Il progetto non toglie più le tracce di Copilot; la regola del progetto viene corretta di conseguenza.",
        "details": "Meno codice da mantenere per una chat non più supportata. Le tracce già presenti nel progetto vanno tolte a mano."
      },
      {
        "label": "Pulizia di Copilot ripristinata nel codice",
        "description": "Il controllo all'apertura e Update skills tornano a togliere le tracce di Copilot; la regola del progetto resta com'è.",
        "details": "Le tracce vecchie spariscono da sole. Il codice da mantenere cresce per una chat non più supportata, e la regola di tecnologia va corretta."
      },
      {
        "label": "Regola del progetto corretta con la Proposal",
        "description": "Il codice non toglie più le tracce di Copilot; la Proposal u4wz6xb4 toglie la pulizia dalla regola del progetto.",
        "details": "Il codice non cambia. La Proposal u4wz6xb4 modifica solo requirements/rules#project, senza toccare il Model."
      }
    ],
    "recommended": 0,
    "multi": false
  },
  "decisions": [
    {
      "decision": "fix-code",
      "option": 1
    },
    {
      "decision": "fix-code",
      "option": 2
    },
    {
      "decision": "proposal"
    }
  ],
  "fingerprint": "c3a0fa09488163195ed54ef6c75a03a87f0964d850da34b463e01c6fb3398e07",
  "prepared": "2026-10-27T07:17:44.414Z"
}
```
