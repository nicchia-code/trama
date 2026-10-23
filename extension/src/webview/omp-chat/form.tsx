import { useMemo, useState } from "react";
import type { FormAnswerMessage, FormView } from "../../omp-chat-protocol";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Textarea } from "../ui/textarea";
import { answerOf, type FieldDef, type FieldValue, fieldsOf, initialValues, missingRequired, valueText } from "./forms";

function Field({ field, value, onChange, disabled, formId }: { field: FieldDef; value: FieldValue | undefined; onChange: (value: FieldValue) => void; disabled: boolean; formId: string }) {
  const labelId = `${formId}-${field.key}`;
  const label = (
    <span id={labelId} className="font-medium">
      {field.label}
      {field.required ? <span aria-hidden="true"> *</span> : null}
    </span>
  );
  const description = field.description === undefined ? null : <span className="text-muted-foreground">{field.description}</span>;
  switch (field.kind) {
    case "single":
      return (
        <div className="flex flex-col gap-1.5">
          {label}
          {description}
          <RadioGroup value={typeof value === "string" ? value : ""} onValueChange={onChange} disabled={disabled} aria-labelledby={labelId}>
            {field.options.map((option) => (
              <label key={option.value} className="flex items-center gap-2">
                <RadioGroupItem value={option.value} />
                {option.label}
              </label>
            ))}
          </RadioGroup>
        </div>
      );
    case "multi": {
      const chosen = Array.isArray(value) ? value : [];
      return (
        <div className="flex flex-col gap-1.5" role="group" aria-labelledby={labelId}>
          {label}
          {description}
          {field.options.map((option) => (
            <label key={option.value} className="flex items-center gap-2">
              <Checkbox
                disabled={disabled}
                checked={chosen.includes(option.value)}
                onCheckedChange={(checked) => onChange(checked === true ? [...chosen, option.value] : chosen.filter((each) => each !== option.value))}
              />
              {option.label}
            </label>
          ))}
        </div>
      );
    }
    case "boolean":
      return (
        <label className="flex items-center gap-2">
          <Checkbox disabled={disabled} checked={value === true} onCheckedChange={(checked) => onChange(checked === true)} />
          {field.label}
          {description}
        </label>
      );
    case "number":
      return (
        <div className="flex flex-col gap-1.5">
          {label}
          {description}
          <Input type="number" aria-labelledby={labelId} disabled={disabled} value={typeof value === "string" || typeof value === "number" ? value : ""} onChange={(event) => onChange(event.target.value)} />
        </div>
      );
    case "text":
      return (
        <div className="flex flex-col gap-1.5">
          {label}
          {description}
          <Textarea aria-labelledby={labelId} disabled={disabled} value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} />
        </div>
      );
  }
}

/**
 * A form of the agent in the conversation: a box with the colour of the focus ring, the question, its fields and `Submit` and `Skip`. After the answer it stays,
 * read-only, with what was given.
 */
export function Form({ form, answer, onAnswer }: { form: FormView; answer: FormAnswerMessage | undefined; onAnswer: (answer: FormAnswerMessage) => void }) {
  const fields = useMemo(() => fieldsOf(form.schema), [form.schema]);
  const [values, setValues] = useState<Record<string, FieldValue>>(() => initialValues(fields));
  const answered = answer !== undefined;
  const title = form.schema.title ?? form.message;
  return (
    <section aria-label={title} data-form={form.requestId} className="flex flex-col gap-3 rounded-lg border-2 border-ring p-3">
      <p className="font-medium">{title}</p>
      {form.schema.title !== undefined && form.schema.title !== null && form.schema.title !== form.message && form.message !== "" ? <p className="text-muted-foreground">{form.message}</p> : null}
      {answered ? (
        <ReadOnly fields={fields} answer={answer} />
      ) : (
        <>
          {fields.map((field) => (
            <Field key={field.key} field={field} formId={form.requestId} value={values[field.key]} disabled={false} onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))} />
          ))}
          <div className="flex gap-2">
            <Button size="sm" disabled={missingRequired(fields, values)} onClick={() => onAnswer(answerOf(fields, values))}>
              Submit
            </Button>
            <Button size="sm" variant="outline" onClick={() => onAnswer({ action: "decline" })}>
              Skip
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

function ReadOnly({ fields, answer }: { fields: FieldDef[]; answer: FormAnswerMessage }) {
  if (answer.action === "decline") return <p className="text-muted-foreground">Skipped</p>;
  return (
    <dl className="flex flex-col gap-1.5">
      {fields.map((field) => (
        <div key={field.key}>
          <dt className="text-muted-foreground">{field.label}</dt>
          <dd className="whitespace-pre-wrap">{valueText(field, answer.content[field.key]) || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
