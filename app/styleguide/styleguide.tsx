"use client";

import { useState, type ReactNode } from "react";
import * as Icons from "@/components/icons";
import {
  BowlIllustration,
  EmptyTinIllustration,
  PieIllustration,
  PotIllustration,
  RecipeBoxIllustration,
} from "@/components/illustrations";
import { Logo } from "@/components/logo";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { RecipeSnapshot } from "@/components/recipes/recipe-image";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, cardClass } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert, inputClass, Label, linedTextareaClass, TextField } from "@/components/ui/field";
import { PageLoading, Spinner } from "@/components/ui/spinner";
import { chipClass, DraftStamp, RotationStamp, Tag } from "@/components/ui/tag";
import { UnitToggleView } from "@/components/units/unit-toggle";
import type { RecipeSummary } from "@/lib/recipes/summary";
import type { UnitSystem } from "@/lib/units/constants";

const COLORS: { name: string; use: string }[] = [
  { name: "paper", use: "App background" },
  { name: "card", use: "Card stock" },
  { name: "kraft", use: "Tinted panels, chips" },
  { name: "line", use: "Borders" },
  { name: "rule", use: "Ruled lines (decorative)" },
  { name: "ink", use: "Main text" },
  { name: "muted", use: "Secondary text" },
  { name: "paprika", use: "Primary, title rule" },
  { name: "on-paprika", use: "Text on paprika" },
  { name: "paprika-soft", use: "Paprika tint" },
  { name: "sage", use: "Fills, icons, borders" },
  { name: "sage-ink", use: "Sage as text" },
  { name: "sage-soft", use: "Sage tint" },
  { name: "mustard", use: "Rare highlight (dark text)" },
  { name: "mustard-soft", use: "Notes, draft stamp" },
  { name: "danger", use: "Destructive, errors" },
  { name: "danger-soft", use: "Error tint" },
];

const sample = (over: Partial<RecipeSummary>): RecipeSummary => ({
  id: "sample",
  title: "Oma's apple pannenkoek",
  imageUrl: "",
  totalTime: 35,
  tags: ["sweet", "weekend"],
  cuisine: "Dutch",
  inRotation: true,
  timesCooked: 4,
  lastCookedAt: null,
  skipUntil: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  ingredientText: "",
  ...over,
});

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="title-rule pb-2 font-display text-2xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Panel({ mode }: { mode: "light" | "dark" }) {
  const [units, setUnits] = useState<UnitSystem>("metric");
  const [chip, setChip] = useState("quick");
  return (
    <div className={cn(mode, "min-w-0 space-y-10 bg-paper p-5 text-ink sm:p-8")} style={{ backgroundImage: "var(--grain)" }}>
      <div className="flex items-center gap-3">
        <Logo className="h-10 w-10" />
        <p className="font-display text-3xl font-semibold capitalize">{mode}</p>
      </div>

      <Section title="Colour tokens">
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {COLORS.map((c) => (
            <li key={c.name} className="overflow-hidden rounded-card border border-line bg-card">
              <div className="h-12 border-b border-line" style={{ background: `var(--${c.name})` }} />
              <div className="px-3 py-2">
                <p className="font-mono text-sm font-bold">{c.name}</p>
                <p className="text-xs text-muted">{c.use}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="grid gap-2 text-sm">
          <p className="rounded-card bg-paper p-3 ring-1 ring-line">ink on paper · <span className="text-muted">muted on paper</span> · <span className="font-bold text-paprika">paprika on paper</span> · <span className="text-sage-ink">sage-ink</span></p>
          <p className="rounded-card bg-kraft p-3">ink on kraft · <span className="text-muted">muted on kraft</span></p>
        </div>
      </Section>

      <Section title="Type">
        <p className="font-display text-4xl font-semibold leading-tight">Fraunces, soft &amp; warm</p>
        <p className="font-display text-2xl font-semibold">Recipe title · Ingredients · Method</p>
        <p>Nunito Sans body text at 16px. Whisk the flour, milk and eggs into a smooth batter, then rest it for ten minutes.</p>
        <p className="text-sm text-muted">Small secondary text, still at least 4.5:1.</p>
        <p className="font-script text-3xl">From the kitchen of Oma</p>
        <table className="text-left tabular-nums">
          <tbody>
            <tr><td className="pr-4 font-bold">250 g</td><td>flour</td></tr>
            <tr><td className="pr-4 font-bold">1 ¼ lb</td><td>potatoes</td></tr>
            <tr><td className="pr-4 font-bold">11 min</td><td>tabular numbers line up</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Surfaces, shadows, textures">
        <div className="grid grid-cols-2 gap-4">
          <div className={cn(cardClass, "p-4 text-sm")}>shadow-card · rounded-card</div>
          <div className={cn(cardClass, "p-4 text-sm shadow-lift")}>shadow-lift (hover)</div>
          <div className={cn(cardClass, "card-lift p-4 text-sm")}>card-lift: hover me (fine pointers only)</div>
          <div className="rounded-control bg-kraft p-4 text-sm shadow-press">shadow-press · rounded-control</div>
        </div>
        <div className={cn(cardClass, "px-4 pt-4")}>
          <p className="font-display text-xl font-semibold">Title</p>
          <div className="title-rule mt-1" />
          <p className="ruled pb-2 leading-8 [--rule-step:2rem]">
            Ruled lines follow the 2rem line height,
            <br />
            so wrapped text always sits on a line.
          </p>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="sage">
            <Icons.RepeatIcon width={20} height={20} /> In rotation
          </Button>
          <Button variant="danger">
            <Icons.TrashIcon width={18} height={18} /> Delete
          </Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" variant="ghost" aria-label="Close">
            <Icons.XIcon />
          </Button>
        </div>
      </Section>

      <Section title="Inputs">
        <TextField label="Title" defaultValue="Shakshuka" />
        <TextField label="Source link" placeholder="https://…" hint="Recipe websites and social posts." />
        <TextField label="Email" defaultValue="not-an-email" error="Enter a valid email address" />
        <div className="space-y-1.5">
          <Label htmlFor={`${mode}-ta`}>Lines</Label>
          <textarea id={`${mode}-ta`} rows={4} className={cn(inputClass, linedTextareaClass)} defaultValue={"200 g spaghetti\n2 cloves garlic, sliced\nsalt"} />
        </div>
        <label className="flex min-h-11 items-center gap-3 font-bold">
          <input type="checkbox" defaultChecked className="h-6 w-6 accent-paprika" /> Add to our rotation
        </label>
      </Section>

      <Section title="Tags, stamps, chips, toggles">
        <div className="flex flex-wrap items-center gap-2">
          <Tag>vegetarian</Tag>
          <Tag tone="paprika">Dutch</Tag>
          <Tag tone="sage">This device</Tag>
          <RotationStamp />
          <DraftStamp />
        </div>
        <div className="flex flex-wrap gap-2">
          {["quick", "comfort", "≤ 30 min"].map((c) => (
            <button key={c} type="button" className={chipClass(chip === c)} aria-pressed={chip === c} onClick={() => setChip(c)}>
              {c}
            </button>
          ))}
        </div>
        <UnitToggleView value={units} onChange={setUnits} />
        <div>
          <UnitToggleView value={units} onChange={setUnits} compact />
        </div>
      </Section>

      <Section title="Feedback">
        <Alert>Couldn&apos;t save the recipe. Please try again.</Alert>
        <Alert tone="info">Nothing in the rotation matches those filters.</Alert>
        <Alert tone="success">Here&apos;s what we found. Check it over, then save.</Alert>
        <div className="flex items-center gap-3 text-muted">
          <Spinner className="h-6 w-6 text-paprika" /> Spinner
        </div>
        <PageLoading label="Fetching the recipe box…" />
      </Section>

      <Section title="Recipe cards">
        <div className="grid gap-4 lg:grid-cols-2">
          <RecipeCard recipe={sample({})} />
          <RecipeCard recipe={sample({ title: "Tuna pasta (from Mum's notebook)", inRotation: false, totalTime: null, tags: ["needs-details", "pantry"] })} />
        </div>
        <div className="flex gap-6">
          <RecipeSnapshot title="Bowl" imageUrl="" className="h-24 w-24" />
          <RecipeSnapshot title="Pot!" imageUrl="" className="h-24 w-24" tilt="left" />
        </div>
        <aside className="-rotate-[0.6deg] rounded-[4px] border border-mustard/60 bg-mustard-soft px-4 pb-4 pt-2 shadow-card">
          <p className="font-script text-2xl">Kitchen notes</p>
          <p>Less chilli next time. Great with garlic bread.</p>
        </aside>
      </Section>

      <Section title="Empty states & illustrations">
        <Card className="p-0">
          <EmptyState Illustration={RecipeBoxIllustration} title="No recipes yet… time to dig through the recipe box!" action={<Button>Add your first recipe</Button>}>
            Snap a cookbook page, paste a recipe, or drop in a link.
          </EmptyState>
        </Card>
        <div className="flex flex-wrap gap-4 text-muted">
          {[RecipeBoxIllustration, EmptyTinIllustration, BowlIllustration, PotIllustration, PieIllustration].map((I, i) => (
            <I key={i} className="h-16 w-auto" />
          ))}
        </div>
      </Section>

      <Section title="Icons (Lucide, one stroke weight)">
        <div className="flex flex-wrap gap-4 text-ink">
          {Object.entries(Icons)
            .filter(([k]) => k.endsWith("Icon"))
            .map(([k, I]) => {
              const Icon = I as (p: { width?: number; height?: number }) => ReactNode;
              return (
                <span key={k} title={k}>
                  <Icon />
                </span>
              );
            })}
        </div>
      </Section>

      <Card className="space-y-2">
        <CardTitle>Where this lives</CardTitle>
        <p className="text-sm text-muted">
          Tokens: <code className="font-mono">app/globals.css</code> (CSS variables + Tailwind @theme). PWA colours mirror{" "}
          <code className="font-mono">--paper</code> in <code className="font-mono">lib/theme.ts</code>.
        </p>
      </Card>
    </div>
  );
}

export function Styleguide() {
  return (
    <main className="grid min-h-dvh xl:grid-cols-2">
      <Panel mode="light" />
      <Panel mode="dark" />
    </main>
  );
}
