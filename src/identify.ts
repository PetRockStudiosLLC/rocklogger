// ---------- Trait-based identification engine ----------
// Multi-stage: macro-texture (grain size / structure) is scored first with a
// strong conflict penalty, then fine traits (hardness, luster, weight, color,
// habit). Final matches are confidence-calibrated by the score gap between
// adjacent candidates so ties and near-ties don't look overconfident.

import { ROCKS, findSpec } from "./knowledge";
import { TEXTURES, type Confidence, type TextureId } from "./types";
import type { ObservedTraits, RockSpec } from "./types";

export type HardnessChoice = {
  id: string;
  label: string;
  test: string;
  min: number;
  max: number;
};

export interface TextureChoice {
  id: TextureId;
  label: string;
  /** habit terms this macro-texture implies */
  habits: readonly string[];
}

export const TEXTURE_CHOICES: readonly TextureChoice[] = TEXTURES;

/**
 * Macro-textures that directly contradict a habit term.
 * e.g. a solid fine-grained rock ("fine") is NOT porous, glassy or grainy —
 * so Scoria (porous) and Granite (granular) get suppressed.
 */
const TEXTURE_CONFLICTS: Record<TextureId, readonly string[]> = {
  glassy: ["granular", "crystals", "porous", "chalky", "layered", "banded", "fibrous"],
  fine: ["granular", "crystals", "porous", "glassy", "fibrous"],
  coarse: ["glassy", "porous", "chalky"],
  layered: ["glassy", "porous", "massive"],
  porous: ["glassy", "massive", "layered", "banded"],
  chalky: ["glassy", "granular", "crystals"],
  fibrous: ["glassy", "massive"],
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
  /** Calibrated confidence based on the gap to the next candidate */
  confidence: Confidence;
  /** Score gap to the next-lower candidate (Infinity for the last one) */
  gapToNext: number;
}

export interface IdentifyAnswer {
  hardness?: HardnessChoice;
  luster?: string;
  gravity?: string;
  colors?: string[];
  habit?: string[];
  texture?: TextureId;
}

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: "likely",
  medium: "possible",
  low: "weak match",
  tie: "tied",
};

export function identifyRock(answers: IdentifyAnswer): MatchResult[] {
  const results: MatchResult[] = [];

  for (const spec of ROCKS) {
    let score = 0;
    const max = 13; // 3 hardness + 3 luster + 2 gravity + 2 colors + 1 habit + 2 texture
    const matched: string[] = [];

    // Hardness (weight 3; a definite mismatch also penalizes — a fingernail-soft
    // rock is definitely not granite)
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
      } else {
        score -= 1;
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

    // Macro-texture (weight 2 — multi-stage gate; strong conflict suppression)
    if (answers.texture) {
      const tex = TEXTURE_CHOICES.find((t) => t.id === answers.texture);
      if (tex) {
        const specHabits = new Set(spec.habit);
        const matching = tex.habits.filter((h) => specHabits.has(h));
        const conflicting = (TEXTURE_CONFLICTS[tex.id] ?? []).filter((h) => specHabits.has(h));
        if (matching.length) {
          score += 2;
          matched.push("texture");
        } else if (conflicting.length) {
          score -= 3;
        }
      }
    }

    results.push({
      spec,
      score,
      max,
      pct: Math.round((score / max) * 100),
      matched,
      confidence: "low",
      gapToNext: 0,
    });
  }

  const sorted = results
    .filter((r) => r.score > 0)
    // stable sort — equal scores stay in knowledge-base order so genuine ties
    // are NOT resolved by an arbitrary tiebreak (a 5.5 mohs rock isn't "more
    // correct" than a 6.0 one when every observed trait matches both).
    .sort((a, b) => b.pct - a.pct);

  // Confidence calibration: the top pick is only "likely" if it clearly beats
  // the runner-up; ties and near-ties are labeled honestly.
  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i];
    const next = sorted[i + 1];
    const prev = sorted[i - 1];
    const gap = next ? r.score - next.score : Infinity;
    r.gapToNext = gap;
    if (i === 0) {
      r.confidence = gap >= 3 ? "high" : gap >= 1.5 ? "medium" : gap > 0 ? "low" : "tie";
    } else {
      r.confidence = prev && prev.score === r.score ? "tie" : "low";
    }
  }

  return sorted;
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
    texture: a.texture,
  };
}

export function traitsSummary(t: ObservedTraits): string[] {
  const parts: string[] = [];
  if (t.texture) {
    const tex = TEXTURE_CHOICES.find((x) => x.id === t.texture);
    parts.push(`Texture: ${tex ? tex.label : t.texture}`);
  }
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
    texture: t.texture,
  }).slice(0, 5);
}

/** Cross-reference: same name exists in knowledge base? */
export function findByName(name: string): RockSpec | undefined {
  const n = name.trim().toLowerCase();
  if (!n) return undefined;
  return ROCKS.find((r) => r.name.toLowerCase() === n || r.name.toLowerCase().includes(n));
}

export { findSpec };
