---
status: resolved
resolution: unified
refs:
  - requirements/ui#menu-laterale
  - menu-laterale
proposal: null
task: null
origin: null
unifiedInto: 2pdnq92f
option: null
note: null
created: 2026-10-27T07:08:22.723Z
job: e60ceeff-b80c-4f03-82bf-504764d7d43a
---
# Solo icone troppo presto

## What happens

Sotto i 72 px di larghezza il menu mostra solo le icone, perché il padding del contenitore non entra nella misura: tra 56 e 72 px il testo sparisce.

## What should happen

La Requirement di interfaccia del menu dice che il menu mostra solo le icone sotto i 56 px di larghezza della vista e torna a mostrare il testo da 56 px in su.

## Fix options

### Misurare la vista intera

Spostare il padding del menu su un elemento figlio, così il contenitore misura la larghezza della vista e la soglia di 56 px vale come scritto nella Requirement. Le voci e le icone restano uguali; cambia solo dove si misura la larghezza.

### Portare la soglia a 72 px

Lasciare il menu com'è e cambiare la Requirement di interfaccia da 56 a 72 px, la larghezza che il codice già usa per le sole icone. Scelta utile se la vista stretta va bene così, ma il Model cambia.

## Where in the code

extension/src/webview/menu/app.tsx:109-115

## Prepared question

```json
{
  "question": {
    "id": "bncvm9y3",
    "question": "Il menu nella barra laterale deve passare alle sole icone sotto i 56 px o sotto i 72 px di larghezza?",
    "context": "La Requirement di interfaccia del menu (`ui#menu-laterale`) fissa la modalità solo icone sotto i 56 px di larghezza della vista. Il codice la attiva sotto i 72 px, perché il padding del contenitore non entra nella misura: tra 56 e 72 px il testo sparisce anche se la Requirement dice che dovrebbe restare.",
    "options": [
      {
        "label": "Misurare la vista intera",
        "description": "Il menu resta a 56 px come scritto nella Requirement.",
        "details": "Il padding del menu passa a un elemento figlio, così la larghezza misurata è quella della vista. Voci e icone restano uguali; cambia solo dove si misura la larghezza."
      },
      {
        "label": "Portare la soglia a 72 px",
        "description": "La Requirement dice 72 px come il codice.",
        "details": "Il menu resta com'è. La Requirement di interfaccia passa da 56 a 72 px, anche nel punto sull'implementazione: la vista stretta resta con solo icone fino a 72 px."
      },
      {
        "label": "Tenere 72 px come ora",
        "description": "Il codice resta com'è e la Requirement cambia in 72 px.",
        "details": "Il Requisito e il codice dicono entrambi 72 px. Il cambiamento è descritto nella Proposal preparata, che porta la soglia di `ui#menu-laterale` e `tech#menu-laterale` a 72 px."
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
  "fingerprint": "539e337dcdd8839c9b38773c90083c5e8f96bc572c94f5736e0b9e2eaa1766ae",
  "prepared": "2026-10-27T07:17:40.546Z"
}
```
