"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition, type ReactNode } from "react";
import { saveRecipeAction } from "@/app/(app)/recipes/actions";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Alert, inputClass, Label, TextField } from "@/components/ui/field";
import { formatIngredient, groupBy, parseIngredientLine } from "@/lib/recipes/ingredients";
import type { Ingredient, RecipeInput, SourceType } from "@/lib/recipes/schema";

type Section = { key: string; name: string; text: string };

let keySeq = 0;
const nextKey = () => `s${++keySeq}`;

function toSections<T extends { group: string }>(items: T[], line: (t: T) => string): Section[] {
  const groups = groupBy(items);
  if (!groups.length) return [{ key: nextKey(), name: "", text: "" }];
  return groups.map((g) => ({ key: nextKey(), name: g.group, text: g.items.map(line).join("\n") }));
}

const numOrNull = (s: string) => {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export type RecipeFormProps = {
  initial: RecipeInput;
  recipeId?: string;
  rawSourceText?: string;
  /** Shown above the form, e.g. AI warnings on the review screen. */
  banner?: ReactNode;
  submitLabel?: string;
  onCancelHref?: string;
};

export function RecipeForm({ initial, recipeId, rawSourceText, banner, submitLabel, onCancelHref }: RecipeFormProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [servings, setServings] = useState(initial.servings?.toString() ?? "");
  const [prepTime, setPrepTime] = useState(initial.prepTime?.toString() ?? "");
  const [cookTime, setCookTime] = useState(initial.cookTime?.toString() ?? "");
  const [totalTime, setTotalTime] = useState(initial.totalTime?.toString() ?? "");
  const [cuisine, setCuisine] = useState(initial.cuisine);
  const [tags, setTags] = useState(initial.tags.join(", "));
  const [notes, setNotes] = useState(initial.notes);
  const [sourceUrl, setSourceUrl] = useState(initial.sourceUrl);
  const [sourceAuthor, setSourceAuthor] = useState(initial.sourceAuthor);
  const [imageUrl, setImageUrl] = useState(initial.imageUrl);
  const [addToRotation, setAddToRotation] = useState(true);

  const [ingredientSections, setIngredientSections] = useState(() => toSections(initial.ingredients, formatIngredient));
  const [stepSections, setStepSections] = useState(() => toSections(initial.steps, (s) => s.text.replace(/\n+/g, " ")));

  // Lines the user hasn't touched keep their original structured parse
  // (e.g. the AI's split of quantity/unit/item), edited lines are re-parsed.
  const originals = useMemo(() => {
    const m = new Map<string, Ingredient>();
    for (const i of initial.ingredients) m.set(formatIngredient(i), i);
    return m;
  }, [initial.ingredients]);
  // Edited lines keep the unit-conversion classification of the same ingredient
  // (e.g. "1 cup flour" → "2 cups flour"); the server's table lookup still wins.
  const classByItem = useMemo(() => {
    const m = new Map<string, Pick<Ingredient, "category" | "gramsPerCup">>();
    for (const i of initial.ingredients) m.set(i.item.toLowerCase(), { category: i.category, gramsPerCup: i.gramsPerCup });
    return m;
  }, [initial.ingredients]);

  const buildInput = (): RecipeInput => {
    const ingredients = ingredientSections.flatMap((sec) =>
      sec.text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((line) => {
          const orig = originals.get(line);
          const parsed = orig ? { ...orig } : parseIngredientLine(line);
          if (!parsed) return null;
          const cls = orig ? null : classByItem.get(parsed.item.toLowerCase());
          return { ...parsed, ...(cls ?? {}), group: sec.name.trim() };
        })
        .filter((x): x is Ingredient => x !== null),
    );
    const steps = stepSections.flatMap((sec) =>
      sec.text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((text) => ({ text, group: sec.name.trim() })),
    );
    return {
      title,
      description,
      servings: numOrNull(servings),
      prepTime: numOrNull(prepTime),
      cookTime: numOrNull(cookTime),
      totalTime: numOrNull(totalTime),
      ingredients,
      steps,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      cuisine,
      notes,
      sourceType: initial.sourceType as SourceType,
      sourceUrl: sourceUrl.trim(),
      sourceAuthor,
      imageUrl: imageUrl.trim(),
      language: initial.language,
    };
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    start(async () => {
      const res = await saveRecipeAction({ id: recipeId, input: buildInput(), rawSourceText, addToRotation });
      if (res.ok) {
        router.push(`/recipes/${res.id}`);
      } else {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  };

  const otherErrors = Object.entries(fieldErrors).filter(([k]) => !["title", "sourceUrl", "imageUrl"].includes(k));

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      {banner}
      {error && (
        <Alert>
          <p className="font-semibold">{error}</p>
          {otherErrors.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {otherErrors.map(([k, v]) => (
                <li key={k}>
                  {k}: {v}
                </li>
              ))}
            </ul>
          )}
        </Alert>
      )}

      <Card>
        <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required error={fieldErrors.title} />
        <TextArea label="Short description" value={description} onChange={setDescription} rows={2} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <NumberField label="Servings" value={servings} onChange={setServings} />
          <NumberField label="Prep (min)" value={prepTime} onChange={setPrepTime} />
          <NumberField label="Cook (min)" value={cookTime} onChange={setCookTime} />
          <NumberField label="Total (min)" value={totalTime} onChange={setTotalTime} />
        </div>
      </Card>

      <Card>
        <SectionHeader title="Ingredients" hint="One per line, e.g. “200 g spaghetti, cooked”." />
        <SectionsEditor sections={ingredientSections} onChange={setIngredientSections} placeholder={"200 g spaghetti\n2 cloves garlic, sliced\nsalt"} addLabel="Add ingredient group" groupPlaceholder="e.g. For the sauce" />
      </Card>

      <Card>
        <SectionHeader title="Steps" hint="One step per line." />
        <SectionsEditor sections={stepSections} onChange={setStepSections} placeholder={"Boil the pasta.\nFry the garlic.\nToss together."} addLabel="Add step group" groupPlaceholder="e.g. Make the dough" />
      </Card>

      <Card>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Tags" value={tags} onChange={(e) => setTags(e.target.value)} hint="Comma separated, e.g. vegetarian, quick" />
          <TextField label="Cuisine" value={cuisine} onChange={(e) => setCuisine(e.target.value)} />
        </div>
        <TextArea label="Our notes" value={notes} onChange={setNotes} rows={3} placeholder="Less chilli next time. Great with garlic bread." />
      </Card>

      <Card>
        <SectionHeader title="Source" />
        <TextField label="Source link" type="url" inputMode="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} error={fieldErrors.sourceUrl} />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Author / account" value={sourceAuthor} onChange={(e) => setSourceAuthor(e.target.value)} />
          <TextField label="Image link" type="url" inputMode="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} error={fieldErrors.imageUrl} />
        </div>
      </Card>

      <div className="sticky bottom-20 z-30 -mx-4 space-y-3 border-t border-border bg-bg/95 px-4 py-3 backdrop-blur md:bottom-0">
        {!recipeId && (
          <label className="flex min-h-10 items-center gap-3 font-semibold">
            <input type="checkbox" className="h-5 w-5 accent-[var(--primary)]" checked={addToRotation} onChange={(e) => setAddToRotation(e.target.checked)} />
            Add to our rotation
          </label>
        )}
        <div className="flex gap-3">
          {onCancelHref && (
            <Button variant="secondary" onClick={() => router.push(onCancelHref)} disabled={pending}>
              Cancel
            </Button>
          )}
          <Button type="submit" className="flex-1" size="lg" disabled={pending}>
            {pending ? "Saving…" : (submitLabel ?? "Save recipe")}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <section className="space-y-4 rounded-3xl border border-border bg-surface p-4 sm:p-5">{children}</section>;
}

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {hint && <p className="text-sm text-muted">{hint}</p>}
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <TextField
      label={label}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
    />
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        value={value}
        rows={Math.max(rows, value.split("\n").length + 1)}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} py-3 leading-relaxed`}
      />
    </div>
  );
}

function SectionsEditor({
  sections,
  onChange,
  placeholder,
  addLabel,
  groupPlaceholder,
}: {
  sections: Section[];
  onChange: (s: Section[]) => void;
  placeholder: string;
  addLabel: string;
  groupPlaceholder: string;
}) {
  const update = (key: string, patch: Partial<Section>) =>
    onChange(sections.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  const showNames = sections.length > 1 || sections.some((s) => s.name);
  return (
    <div className="space-y-4">
      {sections.map((s, idx) => (
        <div key={s.key} className="space-y-2">
          {showNames && (
            <div className="flex items-end gap-2">
              <TextField
                className="flex-1"
                label={`Group ${idx + 1} name`}
                placeholder={groupPlaceholder}
                value={s.name}
                onChange={(e) => update(s.key, { name: e.target.value })}
              />
              {sections.length > 1 && (
                <Button variant="ghost" size="icon" aria-label={`Remove group ${idx + 1}`} onClick={() => onChange(sections.filter((x) => x.key !== s.key))}>
                  <TrashIcon />
                </Button>
              )}
            </div>
          )}
          <TextArea label={showNames ? `Group ${idx + 1} lines` : "Lines"} value={s.text} onChange={(text) => update(s.key, { text })} placeholder={placeholder} rows={5} />
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={() => onChange([...sections, { key: nextKey(), name: "", text: "" }])}>
        <PlusIcon width={18} height={18} /> {addLabel}
      </Button>
    </div>
  );
}
