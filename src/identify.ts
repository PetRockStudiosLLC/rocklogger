// ---------- Trait-based identification engine ----------

import { ROCKS, findSpec } from "./knowledge";
import type { ObservedTraits, RockSpec } from "./types";

export type HardnessChoice = {
  id: string;
  label: string;
  test: string;
  min: number;
  max: number;
};

export const HARDNESS_CHOICES: HardnessChoice[] = [
  {
    id: "very-soft",
    label: "Fingernail scratches it",
    test: "Your fingernail digs in (Mohs under ~2.5)",
    min: 0,
    max: 2.5,
  },
  {
    id: "soft",
    label: "A copper coin scratches it",
    test: "Copper penny/coin leaves a mark (Mohs ~2.5–3.5)",
    min: 2.5,
    max: 3.5,
  },
  {
    id: "medium",
    label: "A steel knife scratches it",
    test: "Knife blade or nail file scratches it (Mohs ~3.5–5.5)",
    min: 3.5,
    max: 5.5,
  },
  {
    id: "hard",
    label: "Glass or quartz scratches it",
    test: "It scratches glass, or quartz scratches it (Mohs ~5.5–7)",
    min: 5.5,
    max: 7,
  },
  {
    id: "very-hard",
    label: "It scratches quartz / nothing scratches it",
    test: "Mohs over ~7 — topaz, corundum, diamond territory",
    min: 7,
    max: 11,
  },
];

export const LUSTER_CHOICES = [
  { id: "metallic", label: "Metallic — shines like metal", score: 3 },
  { id: "vitreous", label: "Glassy / shiny like glass", score: 3 },
  { id: "earthy", label: "Dull / earthy, no shine", score: 3 },
  { id: "waxy", label: "Waxy — dull but smooth", score: 3 },
  { id: "pearly", label: "Pearly — shimmers like a pearl", score: 3 },
  { id: "silky", label: "Silky — soft shimmer, often layered", score: 3 },
  { id: "greasy", label: "Greasy / soapy feel", score: 3 },
  { id: "adamantine", label: "Brilliant — sparkles like a diamond", score: 3 },
];

export const GRAVITY_CHOICES = [
  { id: "light", label: "Feels light for its size", score: 1 },
  { id: "medium", label: "Feels about normal", score: 1 },
  { id: "heavy", label: "Feels noticeably heavy / dense", score: 1 },
];

export interface MatchResult {
  spec: RockSpec;
  score: number;
  max: number;
  pct: number;
  matched: string[];
}

export interface IdentifyAnswer {
  hardness?: HardnessChoice;
  luster?: string;
  gravity?: string;
  colors?: string[];
  habit?: string[];
}

export function identifyRock(answers: IdentifyAnswer): MatchResult[] {
  const results: MatchResult[] = [];

  for (const spec of ROCKS) {
    let score = 0;
    const max = 11; // 3 hardness + 3 luster + 2 gravity + 2 colors + 1 habit
    const matched: string[] = [];

    // Hardness (weight 3)
    if (answers.hardness) {
      if (spec.mohs >= answers.hardness.min && spec.mohs <= answers.hardness.max) {
        score += 3;
        matched.push("hardness");
      } else if (
        // tolerate boundary rounding (e.g. mohs 6.5 in 5.5–7 bucket is fine)
        spec.mohs >= answers.hardness.min - 0.25 &&
        spec.mohs <= answers.hardness.max + 0.25
      ) {
        score += 2;
        matched.push("hardness (close)");
      }
    }

    // Luster (weight 3)
    if (answers.luster) {
      if (spec.luster.includes(answers.luster)) {
        score += 3;
        matched.push("luster");
      }
    }

    // Gravity (weight 2 — highly diagnostic; mismatch penalizes)
    if (answers.gravity) {
      if (spec.gravity === answers.gravity) {
        score += 2;
        matched.push("weight");
      } else if (spec.gravity) {
        score -= 1;
      }
    }

    // Colors (weight 2)
    if (answers.colors && answers.colors.length) {
      const overlap = answers.colors.filter((c) => spec.colors.includes(c));
      if (overlap.length) {
        score += overlap.length >= 2 ? 2 : 1.5;
        matched.push("color");
      }
    }

    // Habit (weight 1)
    if (answers.habit && answers.habit.length) {
      const overlap = answers.habit.filter((h) => spec.habit.includes(h));
      if (overlap.length) {
        score += overlap.length >= 2 ? 1 : 0.5;
        matched.push("structure");
      }
    }

    results.push({
      spec,
      score,
      max,
      pct: Math.round((score / max) * 100),
      matched,
    });
  }

  return results
    .filter((r) => r.score > 0)
    .sort((a, b) => b.pct - a.pct || a.spec.mohs - b.spec.mohs);
}

/** Convert an IdentifyAnswer into persistent ObservedTraits */
export function answersToTraits(a: IdentifyAnswer): ObservedTraits {
  return {
    hardness: a.hardness
      ? { min: a.hardness.min, max: a.hardness.max, label: a.hardness.label }
      : undefined,
    luster: a.luster,
    gravity: a.gravity as ObservedTraits["gravity"],
    colors: a.colors,
    habit: a.habit,
  };
}

export function traitsSummary(t: ObservedTraits): string[] {
  const parts: string[] = [];
  if (t.hardness) parts.push(`Hardness: ${t.hardness.label}`);
  if (t.luster) parts.push(`Luster: ${t.luster}`);
  if (t.gravity) parts.push(`Weight: ${t.gravity}`);
  if (t.colors?.length) parts.push(`Color: ${t.colors.join(", ")}`);
  if (t.habit?.length) parts.push(`Structure: ${t.habit.join(", ")}`);
  return parts;
}

/** Suggest likely type names for an entry with no matched type yet */
export function suggestForTraits(t?: ObservedTraits): MatchResult[] {
  if (!t) return [];
  return identifyRock({
    hardness: t.hardness
      ? HARDNESS_CHOICES.find(
          (h) => Math.abs(h.min - (t.hardness?.min ?? 0)) < 0.01 && Math.abs(h.max - (t.hardness?.max ?? 0)) < 0.01
        )
      : undefined,
    luster: t.luster,
    gravity: t.gravity,
    colors: t.colors,
    habit: t.habit,
  }).slice(0, 5);
}

/** Cross-reference: same name exists in knowledge base? */
export function findByName(name: string): RockSpec | undefined {
  const n = name.trim().toLowerCase();
  if (!n) return undefined;
  return ROCKS.find((r) => r.name.toLowerCase() === n || r.name.toLowerCase().includes(n));
}

export { findSpec };
