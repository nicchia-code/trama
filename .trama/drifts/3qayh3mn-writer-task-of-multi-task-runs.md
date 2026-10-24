---
status: resolved
resolution: proposal
refs:
  - prenotazione-file
proposal: null
task: null
origin: q31mg7fb
previous: snjzl3et
option: null
note: null
resolvedBy: lrc6oxca
created: 2026-10-24T09:06:26.206Z
job: aec9d06b-2aa4-4c8d-ba23-c43c15d4ab66
---
# Writer Task of multi-Task Runs

## What happens

A sub-agent stopped by a claim must record the conflict when Parallel Execution is on, but in implement-all Runs (several Tasks) the sub-agent has no single Task: TRAMA_TASK is set only for single-Task Runs, so the hook cannot name the writer Task there. The claim file also has no field for the holder Task that the Requirement allows (Nessun altro campo), yet the holder Task is stored in the claim.

## What should happen

Decide how a sub-agent of a multi-Task Run names its Task so the conflict is recorded, and whether the claim file may store the holder Task.

## Fix options

### Sub-agent names its Task

The sub-agent states its Task in its first claimed write, or the Run passes a per-sub-agent Task the hook reads; the claim stores it and the conflict is recorded for all Runs.

### Record single-Task Runs only

Keep TRAMA_TASK for single-Task implement Runs; multi-Task conflicts are not recorded; state this in the Model.

### Record with the Run Task list

Record a conflict for multi-Task Runs with the Run Tasks as the tasks, without the holder and writer Task split.

## Where in the code

extension/src/omp/trama-hook.ts (writerOf, recordConflict); src/core/claims.ts (ClaimSchema task field); extension/src/host/controller.ts (send task)
