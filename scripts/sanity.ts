// ---------- sanity checks for knowledge base + ID engine ----------
import { ROCKS } from "../src/knowledge";
import { identifyRock, HARDNESS_CHOICES } from "../src/identify";
import { COLORS, HABITS, LUSTERS, GROUPS, TEXTURES } from "../src/types";

let fails = 0;
const fail = (msg: string) => {
  fails++;
  console.log("  ✗ " + msg);
};

// 1. ids unique, names unique
const ids = new Set<string>();
const names = new Set<string>();
for (const r of ROCKS) {
  if (ids.has(r.id)) fail(`duplicate id: ${r.id}`);
  ids.add(r.id);
  if (names.has(r.name)) fail(`duplicate name: ${r.name}`);
  names.add(r.name);
  if (!(r.group in GROUPS)) fail(`bad group: ${r.name} -> ${r.group}`);
  if (typeof r.mohs !== "number" || r.mohs < 0.5 || r.mohs > 10.5) fail(`bad mohs: ${r.name} -> ${r.mohs}`);
  for (const l of r.luster) if (!(LUSTERS as readonly string[]).includes(l)) fail(`bad luster: ${r.name} -> ${l}`);
  for (const c of r.colors) if (!(COLORS as readonly string[]).includes(c)) fail(`bad color: ${r.name} -> ${c}`);
  for (const h of r.habit) if (!(HABITS as readonly string[]).includes(h)) fail(`bad habit: ${r.name} -> ${h}`);
  if (r.gravity && !["light", "medium", "heavy"].includes(r.gravity)) fail(`bad gravity: ${r.name}`);
  if (!r.looks || !r.hints) fail(`missing looks/hints: ${r.name}`);
}
console.log(`✓ ${ROCKS.length} entries, ids/names unique, vocab valid`);

// 1b. texture vocab sanity — every texture maps to real habits, conflicts valid
const textureIds = new Set<string>();
for (const t of TEXTURES) {
  if (textureIds.has(t.id)) fail(`duplicate texture id: ${t.id}`);
  textureIds.add(t.id);
  for (const h of t.habits) if (!(HABITS as readonly string[]).includes(h)) fail(`bad texture habit: ${t.id} -> ${h}`);
}
console.log(`✓ ${TEXTURES.length} macro-textures valid`);

// 2. ID engine — known test cases
// texture: macro-texture id matching the expected rock's grain/structure
const cases: [string, { hardness?: string; luster?: string; gravity?: string; colors?: string[]; habit?: string[]; texture?: string }, string[]][] = [
  ["magnetite", { hardness: "hard", luster: "metallic", gravity: "heavy", colors: ["black"], habit: ["massive"], texture: "fine" }, ["magnetite", "hematite"]],
  ["pyrite", { hardness: "hard", luster: "metallic", gravity: "heavy", colors: ["gold"], habit: ["crystals"], texture: "coarse" }, ["pyrite", "chalcopyrite"]],
  ["obsidian", { hardness: "medium", luster: "vitreous", gravity: "medium", colors: ["black"], habit: ["glassy"], texture: "glassy" }, ["obsidian"]],
  ["pumice", { hardness: "hard", luster: "earthy", gravity: "light", colors: ["white"], habit: ["porous"], texture: "porous" }, ["pumice", "tuff"]],
  ["limestone", { hardness: "soft", luster: "earthy", gravity: "medium", colors: ["gray"], habit: ["massive"], texture: "fine" }, ["limestone", "mudstone"]],
  ["gneiss", { hardness: "hard", luster: "earthy", gravity: "medium", colors: ["gray", "white"], habit: ["banded"], texture: "layered" }, ["gneiss"]],
  ["calcite", { hardness: "soft", luster: "vitreous", gravity: "medium", colors: ["white"], habit: ["crystals"], texture: "coarse" }, ["calcite", "quartz"]],
  ["galena", { hardness: "very-soft", luster: "metallic", gravity: "heavy", colors: ["silver"], habit: ["crystals"], texture: "coarse" }, ["galena"]],
];

let engineFails = 0;
for (const [expected, ans, allowed] of cases) {
  const hardness = HARDNESS_CHOICES.find((h) => h.id === ans.hardness);
  const results = identifyRock({ hardness, luster: ans.luster, gravity: ans.gravity as never, colors: ans.colors, habit: ans.habit, texture: ans.texture as never });
  const top = results[0]?.spec.id;
  if (!results.length) {
    engineFails++;
    console.log(`  ✗ ${expected}: no results`);
    continue;
  }
  const ok = results.slice(0, 3).some((r) => r.spec.id === expected);
  const inAllowed = allowed.includes(top ?? "");
  if (!ok || !inAllowed) {
    engineFails++;
    console.log(`  ✗ ${expected}: top=${top} (${results[0]?.pct}%) — expected one of ${allowed.join("/")}`);
  } else {
    console.log(`  ✓ ${expected}: top=${top} ${results[0]?.pct}%`);
  }
}

// 2b. multi-stage suppression — a solid fine-grained dark rock (the user's
// exact false-positive case) must drop Scoria (porous) and Granite (coarse),
// even though all three share hardness/luster/color. Basalt may TIE with
// hornfels/chert (genuinely similar rocks) — that tie is honest and fine.
{
  const hardness = HARDNESS_CHOICES.find((h) => h.id === "hard");
  const results = identifyRock({
    hardness,
    luster: "earthy",
    gravity: "medium",
    colors: ["black", "gray"],
    habit: ["massive"],
    texture: "fine",
  });
  const top3 = results.slice(0, 3).map((r) => r.spec.id);
  const top = results[0]!;
  const inTop3 = (id: string) => top3.includes(id);
  if (inTop3("basalt") && !inTop3("scoria") && !inTop3("granite") && top.confidence === "tie") {
    console.log(`  ✓ fine-grained solid rock: top3=[${top3.join(", ")}] — scoria/granite suppressed, honest tie (${top.pct}%)`);
  } else {
    engineFails++;
    console.log(`  ✗ fine-grained solid rock: top3=[${top3.join(", ")}] conf=${top.confidence} — expected basalt in top3, no scoria/granite, tie confidence`);
  }
}

// 2c. confidence calibration
{
  // distinctive match -> high confidence
  const hardness = HARDNESS_CHOICES.find((h) => h.id === "medium");
  const r = identifyRock({ hardness, luster: "vitreous", gravity: "medium", colors: ["black"], habit: ["glassy"], texture: "glassy" });
  const top = r[0];
  if (top?.spec.id === "obsidian" && top.confidence === "high") {
    console.log(`  ✓ distinctive match: obsidian ${top.pct}% confidence=${top.confidence} (gap ${top.gapToNext})`);
  } else {
    engineFails++;
    console.log(`  ✗ distinctive match: top=${top?.spec.id} conf=${top?.confidence} — expected obsidian/high`);
  }

  // ambiguous answers (only weight + luster) -> tie, not overconfident
  const r2 = identifyRock({ luster: "earthy", gravity: "medium" });
  const top2 = r2[0];
  if (top2 && (top2.confidence === "tie" || top2.confidence === "low") && r2[1]?.score === top2.score) {
    console.log(`  ✓ ambiguous answers: top=${top2.spec.id} ${top2.pct}% confidence=${top2.confidence} — no false high confidence`);
  } else {
    engineFails++;
    console.log(`  ✗ ambiguous answers: top=${top2?.spec.id} conf=${top2?.confidence} score=${top2?.score} next=${r2[1]?.score} — expected tie/low with equal scores`);
  }
}

if (fails + engineFails) {
  console.log(`\nRESULT: ${fails + engineFails} problem(s) found`);
  process.exit(1);
} else {
  console.log("\nRESULT: all sanity checks passed ✓");
}
