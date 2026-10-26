# Requirements: Tecnologia e vincoli, Funzioni facoltative accese per default

Usa quando leggi o salvi le impostazioni delle funzioni facoltative accese per default (Advisor Scanner, Parallel Execution, Async Drift Resolver, Sub-agents Context Sharing, Auto-update Stale Proposals).

## developer.CHANGE_SETTING

- The optional features on by default (`trama.advisorScanner`, `trama.parallelExecution`, `trama.asyncDriftResolver`, `trama.subagentsContextSharing`, `trama.autoUpdateStaleProposals`, besides `trama.ompChat` and `trama.ompChatIntentTracing`) are all read as on unless the user value is `false`, never as `=== true`: `storedValue` (`extension/src/host/settings-schema.ts`) removes a user value equal to the manifest default, so ticking one of them in the Settings tab or in the wizard leaves no value, and only an explicit `false` is written. No migration: a `false` saved earlier stays and keeps the feature off; a `true` saved earlier stays and changes nothing. The wizard's initial values and its summary follow the manifest defaults with no code of their own. The tests that assumed an absent value meant off are updated; `docs/cli.md` and `docs/uat.md` say the features are on by default and are turned off with `false`, and `CHANGELOG.md` records the new defaults.
