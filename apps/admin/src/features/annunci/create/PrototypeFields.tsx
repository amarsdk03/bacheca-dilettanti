"use client";

import {createContext, useContext} from "react";
import type {FieldIssue} from "./contracts";
import {nationalityLabel} from "@bacheca/announcements/features/profilo/player-nationalities";
import {Plus, X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {type MockField, type MockValues, textValue} from "./prototype-model";

const FieldIssuesContext = createContext<FieldIssue[]>([]);
export const FieldIssuesProvider = FieldIssuesContext.Provider;
const optionLabel = (value: string, key: string) => key === "nationality" ? nationalityLabel(value) ?? value : value.replaceAll("::", " · ");

export function PrototypeSelect({id, value, options, onChange, placeholder = "Seleziona…", required = false, describedBy, invalid = false, disabled = false}: {
  id: string; value: string; options: readonly {value: string; label: string}[];
  onChange: (value: string) => void; placeholder?: string; required?: boolean; describedBy?: string; invalid?: boolean; disabled?: boolean;
}) {
  return <Select disabled={disabled} value={value || null} items={options} onValueChange={(next) => onChange(next ?? "")}>
    <SelectTrigger id={id} className="w-full" aria-invalid={invalid} aria-required={required} aria-describedby={describedBy}>
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent><SelectGroup>
      {!required && <SelectItem value={null}>Non specificare</SelectItem>}
      {options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
    </SelectGroup></SelectContent>
  </Select>;
}

export function PrototypeFields({prefix, fields, values, onChange, scope, parentPath}: {
  prefix: string; fields: readonly MockField[]; values: MockValues; scope?: "profile" | "announcement"; parentPath?: string;
  onChange: (key: string, value: MockValues[string]) => void;
}) {
  const allIssues = useContext(FieldIssuesContext);
  const basePath = parentPath ?? scope ?? (prefix.startsWith("create-profile") ? "profile" : "announcement");
  return <FieldGroup className="admin-create-fields">{fields.map(field => {
    const id = `${prefix}-${field.key}`;
    const path = `${basePath}.${field.key}`;
    const issue = allIssues.find(issue => issue.path === path || field.kind === "repeat" && issue.path.startsWith(`${path}.`));
    const value = textValue(values, field.key);
    const fieldValue = values[field.key];
    if (field.kind === "repeat") {
      const rows = Array.isArray(fieldValue) ? fieldValue.filter((row): row is MockValues => typeof row === "object") : [];
      return <FieldSet key={field.key} className="admin-create-wide admin-create-repeat" data-field-path={path} data-state={issue?.severity}>
        <FieldLegend variant="label">{field.label} {field.required ? <span className="admin-create-required" aria-hidden="true">*</span> : <span className="admin-create-optional">Facoltativo</span>}</FieldLegend>
        {issue && <FieldDescription className={`admin-create-${issue.severity}`}>{issue.message}</FieldDescription>}
        {rows.map((row, index) => <div key={index} className="admin-create-repeat-row">
          <PrototypeFields prefix={`${id}-${index}`} parentPath={`${path}.${index}`} fields={field.fields ?? []} values={row}
            onChange={(key, next) => onChange(field.key, rows.map((item, i) => i === index ? {...item, [key]: next} : item))} />
          <Button type="button" size="icon-sm" variant="ghost" aria-label={`Rimuovi ${field.label.toLocaleLowerCase("it-IT")} ${index + 1}`}
            onClick={() => onChange(field.key, rows.filter((_, i) => i !== index))}><X aria-hidden="true" /></Button>
        </div>)}
        <Button type="button" variant="outline" className="self-start" onClick={() => onChange(field.key, [...rows, {}])}>
          <Plus data-icon="inline-start" aria-hidden="true" />Aggiungi voce
        </Button>
      </FieldSet>;
    }
    const options = (field.options ?? []).map(option => ({value: option, label: optionLabel(option, field.key)}));
    const descriptionId = field.description || issue ? `${id}-description` : undefined;
    return <Field key={field.key} data-field-path={path} data-state={issue?.severity} data-invalid={issue?.severity === "error"} className={field.wide ? "admin-create-wide" : undefined}>
      <FieldLabel htmlFor={id}>{field.label} {field.required ? <span className="admin-create-required" aria-hidden="true">*</span> : <span className="admin-create-optional">Facoltativo</span>}</FieldLabel>
      {field.kind === "textarea" ? <Textarea id={id} value={value} rows={4} maxLength={field.maxLength ?? 5000}
        placeholder={field.placeholder} aria-invalid={issue?.severity === "error"} aria-required={field.required} aria-describedby={descriptionId}
        onChange={(event) => onChange(field.key, event.target.value)} /> :
      field.kind === "multi" ? <Select multiple items={options}
        value={Array.isArray(fieldValue) ? fieldValue.filter((item): item is string => typeof item === "string") : []}
        onValueChange={(next) => onChange(field.key, next)}>
        <SelectTrigger id={id} className="w-full" aria-invalid={issue?.severity === "error"} aria-required={field.required} aria-describedby={descriptionId}>
          <SelectValue placeholder="Seleziona una o più opzioni" />
        </SelectTrigger>
        <SelectContent><SelectGroup>{options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectGroup></SelectContent>
      </Select> : field.kind === "select" ?
        <PrototypeSelect id={id} value={value} options={options} onChange={(next) => onChange(field.key, next)} required={field.required} invalid={issue?.severity === "error"} describedBy={descriptionId} /> :
        <Input id={id} type={field.kind ?? "text"} value={value} maxLength={field.maxLength ?? 160}
          step={field.kind === "number" ? "any" : undefined} aria-invalid={issue?.severity === "error"} aria-required={field.required} aria-describedby={descriptionId}
          placeholder={field.placeholder} onChange={(event) => onChange(field.key, event.target.value)} />}
      {(issue || field.description) && <FieldDescription id={descriptionId} className={issue ? `admin-create-${issue.severity}` : undefined}>{issue?.message ?? field.description}</FieldDescription>}
    </Field>;
  })}</FieldGroup>;
}
