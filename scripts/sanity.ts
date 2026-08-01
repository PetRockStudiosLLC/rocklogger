// ---------- sanity checks for knowledge base + ID engine ----------
import { ROCKS } from "../src/knowledge";
import { identifyRock, HARDNESS_CHOICES } from "../src/identify";
import { COLORS, HABITS, LUSTERS, GROUPS } from "../src/types";

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

// 2. ID engine — known test cases
const cases: [string, { hardness?: string; luster?: string; gravity?: string; colors?: string[]; habit?: string[] }, string[]][] = [
  ["magnetite", { hardness: "hard", luster: "metallic", gravity: "heavy", colors: ["black"], habit: ["massive"] }, ["magnetite", "hematite"]],
  ["pyrite", { hardness: "hard", luster: "metallic", gravity: "heavy", colors: ["gold"], habit: ["crystals"] }, ["pyrite", "chalcopyrite"]],
  ["obsidian", { hardness: "medium", luster: "vitreous", gravity: "medium", colors: ["black"], habit: ["glassy"] }, ["obsidian"]],
  ["pumice", { hardness: "hard", luster: "earthy", gravity: "light", colors: ["white"], habit: ["porous"] }, ["pumice", "tuff"]],
  ["limestone", { hardness: "soft", luster: "earthy", gravity: "medium", colors: ["gray"], habit: ["massive"] }, ["limestone", "mudstone"]],
  ["gneiss", { hardness: "hard", luster: "earthy", gravity: "medium", colors: ["gray", "white"], habit: ["banded"] }, ["gneiss"]],
  ["calcite", { hardness: "soft", luster: "vitreous", gravity: "medium", colors: ["white"], habit: ["crystals"] }, ["calcite", "quartz"]],
  ["galena", { hardness: "very-soft", luster: "metallic", gravity: "heavy", colors: ["silver"], habit: ["crystals"] }, ["galena"]],
];

let engineFails = 0;
for (const [expected, ans, allowed] of cases) {
  const hardness = HARDNESS_CHOICES.find((h) => h.id === ans.hardness);
  const results = identifyRock({ hardness, luster: ans.luster, gravity: ans.gravity as never, colors: ans.colors, habit: ans.habit });
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

if (fails + engineFails) {
  console.log(`\nRESULT: ${fails + engineFails} problem(s) found`);
  process.exit(1);
} else {
  console.log("\nRESULT: all sanity checks passed ✓");
}
