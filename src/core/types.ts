/** A problem found in a Model file. `line` is 1-based; 0 means the whole file. */
export interface Diagnostic {
  file: string;
  line: number;
  message: string;
}

export interface EventRef {
  /** Owner ID (Machine or Actor). Always resolved: a bare event belongs to the Machine that writes it. */
  owner: string;
  name: string;
}

export interface Transition {
  event: EventRef;
  /** Target State name, as written. */
  target: string;
  /** Condition and consequence, free prose. Empty when absent. */
  prose: string;
  line: number;
}

export interface State {
  name: string;
  initial: boolean;
  final: boolean;
  description: string;
  transitions: Transition[];
  children: State[];
  /** Name of the parent State, or null for a top-level State. */
  parent: string | null;
  line: number;
}

export interface EventDecl {
  name: string;
  description: string;
  line: number;
}

export interface Machine {
  id: string;
  feature: string;
  file: string;
  name: string;
  description: string;
  /** Top-level States. */
  states: State[];
  events: EventDecl[];
}

export interface Actor {
  id: string;
  file: string;
  name: string;
  description: string;
  events: EventDecl[];
}

export interface Feature {
  id: string;
  file: string;
  name: string;
  description: string;
  /** Machine IDs, sorted. */
  machines: string[];
}

export interface Model {
  system: { file: string; name: string; description: string };
  actors: Map<string, Actor>;
  features: Map<string, Feature>;
  machines: Map<string, Machine>;
  diagnostics: Diagnostic[];
}

/** Model files keyed by path relative to `.trama/model/`, using `/` separators. */
export type FileMap = Map<string, string>;

export const ID_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
export const EVENT_NAME_PATTERN = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/;
export const RESERVED_IDS: Record<string, true> = { system: true, feature: true, actors: true };
