import type { ModelSuggestion } from "../host/model-lists";

/** The input types of typing: a name typed out in full waits like any text, while a suggestion chosen from the list is sent at once. */
const TYPED_INPUT: readonly string[] = ["insertText", "insertCompositionText", "insertFromPaste", "deleteContentBackward", "deleteContentForward"];

/**
 * A model name field: free text, with the names the agent offers as its list. Shared by the model roles of the Settings
 * tab and by the model window of a Proposal on the Board. The caller places the parts and sets the placeholder.
 */
export interface ModelField {
  /** The text field. Typing waits for the field to be left or Enter; a suggestion chosen from the list is sent at once. */
  input: HTMLInputElement;
  /** The names the agent offers; the input points to it while there are any. */
  datalist: HTMLDataListElement;
  /** Why omp gives no names, under the field; hidden when there is nothing to say. */
  note: HTMLElement;
  /** Shows the saved value, unless the developer is typing in the field, which is never overwritten. */
  setValue(value: string): void;
  /** Offers the newest names and the reason omp gives none, if it does. */
  setModels(models: ModelSuggestion[], error: string | null): void;
}

/** A field whose confirmed text is passed to `commit`, trimmed when it is left or confirmed with Enter. */
export function modelField(id: string, commit: (value: string) => void): ModelField {
  const input = document.createElement("input");
  input.className = "st-input";
  input.type = "text";
  input.id = id;
  const datalist = document.createElement("datalist");
  datalist.id = `${id}-models`;
  const note = document.createElement("p");
  note.className = "st-note";
  note.id = `${id}-note`;
  note.hidden = true;

  let dirty = false;
  let suggestions: string[] = [];

  input.addEventListener("input", (event) => {
    dirty = true;
    // A suggestion chosen from the list is sent at once; a name typed out in full waits for the field to be left.
    const typed = event instanceof InputEvent && TYPED_INPUT.includes(event.inputType);
    if (!typed && suggestions.includes(input.value)) {
      dirty = false;
      commit(input.value);
    }
  });
  input.addEventListener("change", () => {
    dirty = false;
    commit(input.value.trim());
  });
  // Left without a change (the text went back to what it was), the field no longer holds unsaved text.
  input.addEventListener("blur", () => {
    dirty = false;
  });

  return {
    input,
    datalist,
    note,
    setValue(value) {
      if (!dirty) input.value = value;
    },
    setModels(models, error) {
      datalist.replaceChildren(
        ...models.map((model) => {
          const option = document.createElement("option");
          option.value = model.value;
          if (model.label !== undefined) option.label = model.label;
          return option;
        }),
      );
      suggestions = models.map((model) => model.value);
      if (suggestions.length === 0) input.removeAttribute("list");
      else input.setAttribute("list", datalist.id);
      note.hidden = error === null;
      note.textContent = error ?? "";
    },
  };
}
