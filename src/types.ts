// ---------- RockLogger data model ----------

export type RockGroup = "igneous" | "sedimentary" | "metamorphic" | "mineral";

export interface RockSpec {
  id: string;
  name: string;
  group: RockGroup;
  /** Mohs hardness (numeric center value) */
  mohs: number;
  /** Luster terms the rock can show */
  luster: string[];
  /** Canonical colors */
  colors: string[];
  /** Habit / structure terms */
  habit: string[];
  /** Streak color on unglazed tile, if known */
  streak?: string;
  /** Feels heavy / light */
  gravity?: "light" | "medium" | "heavy";
  /** Fizzes with dilute acid (vinegar) */
  reactsToAcid?: boolean;
  /** Attracted to a magnet */
  magnetic?: boolean;
  /** One-line description shown in the guide */
  looks: string;
  /** Identification tip */
  hints: string;
  /** Common uses */
  uses?: string;
  /** Emoji for list decoration */
  emoji?: string;
}

export interface ObservedTraits {
  hardness?: { min: number; max: number; label: string };
  luster?: string;
  gravity?: "light" | "medium" | "heavy";
  colors?: string[];
  habit?: string[];
}

export interface RockEntry {
  id: string;
  name: string;
  /** Matched knowledge-base id (optional until identified) */
  typeId?: string;
  /** Compressed JPEG dataURL */
  photo?: string;
  lat?: number;
  lng?: number;
  place?: string;
  /** ISO date found (YYYY-MM-DD) */
  foundAt: string;
  notes?: string;
  tags?: string[];
  traits?: ObservedTraits;
  createdAt: number;
  updatedAt: number;
}

export const GROUPS: Record<RockGroup, string> = {
  igneous: "Igneous (volcanic / cooled magma)",
  sedimentary: "Sedimentary (layers, water deposits)",
  metamorphic: "Metamorphic (changed by heat & pressure)",
  mineral: "Mineral (single crystal / mineral specimen)",
};

export const LUSTERS = [
  "metallic",
  "vitreous",
  "earthy",
  "waxy",
  "pearly",
  "silky",
  "greasy",
  "adamantine",
] as const;

export const HABITS = [
  "crystals",
  "layered",
  "glassy",
  "porous",
  "banded",
  "chalky",
  "fibrous",
  "granular",
  "massive",
] as const;

export const COLORS = [
  "white",
  "gray",
  "black",
  "brown",
  "tan",
  "yellow",
  "orange",
  "red",
  "pink",
  "green",
  "blue",
  "purple",
  "clear",
  "gold",
  "silver",
] as const;
