// ---------- DOM integration test (jsdom + fake-indexeddb) ----------
// Exercises the real view code: journal, add form, detail, identify quiz, guide.
import { JSDOM } from "jsdom";
import "fake-indexeddb/auto";

const dom = new JSDOM("<!doctype html><html><body><div id='app'></div></body></html>", {
  url: "http://localhost/",
  pretendToBeVisual: true,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
Object.defineProperty(globalThis, "location", { value: dom.window.location, configurable: true });
(globalThis as any).HTMLElement = dom.window.HTMLElement;
(globalThis as any).Element = dom.window.Element;
(globalThis as any).Event = dom.window.Event;
(globalThis as any).MouseEvent = dom.window.MouseEvent;
(globalThis as any).Image = dom.window.Image;
(globalThis as any).FileReader = dom.window.FileReader;
(globalThis as any).history = dom.window.history;
(globalThis as any).confirm = () => true;
(globalThis as any).scrollTo = () => {};

let fails = 0;
const check = (cond: boolean, msg: string) => {
  if (cond) console.log(`  ✓ ${msg}`);
  else {
    fails++;
    console.log(`  ✗ ${msg}`);
  }
};
const click = (el: Element | null) => {
  if (!el) return;
  el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, cancelable: true }));
};
const fire = (el: Element, evt: string) => {
  el.dispatchEvent(new dom.window.Event(evt, { bubbles: true, cancelable: true }));
};
// Poll until a condition is true (async renders resolve at variable speed),
// instead of fixed sleeps which race IndexedDB/event-loop timing on slow devices.
const waitFor = async (cond: () => boolean, msg: string, timeout = 2000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (cond()) {
      check(true, msg);
      return;
    }
    await new Promise((r) => setTimeout(r, 10));
  }
  check(false, msg);
};
const q = (root: Element, sel: string): Element | null => root.querySelector(sel);
const qa = (root: Element, sel: string): Element[] => Array.from(root.querySelectorAll(sel));
const val = (root: Element, sel: string): string => (q(root, sel) as HTMLInputElement | null)?.value ?? "";

// ---------- 1. journal empty state ----------
const { renderJournal } = await import("../src/views/journal");
const journal = renderJournal();
await waitFor(() => journal.innerHTML.includes("No rocks logged yet"), "journal shows empty state");
click(q(journal, '[data-action="nav"][data-href="#/add"]'));

// ---------- 2. add form ----------
const { renderAdd } = await import("../src/views/add");
const add = renderAdd();
await new Promise((r) => setTimeout(r, 20));
const nameInput = q(add, "#f-name") as HTMLInputElement;
check(!!nameInput, "add form has name field");
nameInput.value = "Beach pebble";
(q(add, "#f-place") as HTMLInputElement).value = "Narragansett, RI";
(q(add, "#f-notes") as HTMLTextAreaElement).value = "Smooth and sparkly";
(q(add, "#f-tags") as HTMLInputElement).value = "beach, shiny";
fire(q(add, "#rock-form")!, "submit");
await new Promise((r) => setTimeout(r, 80));

// ---------- 3. journal now shows the rock ----------
const journal2 = renderJournal();
await waitFor(() => journal2.innerHTML.includes("Beach pebble"), "journal lists the saved rock");
check(journal2.innerHTML.includes("Unidentified"), "rock shown as unidentified");
check(journal2.innerHTML.includes("Narragansett"), "location shown on card");

// ---------- 4. detail view ----------
const { renderDetail } = await import("../src/views/detail");
const { getAllRocks } = await import("../src/db");
const rocks = await getAllRocks();
const rockId = rocks[0].id;
const detail = renderDetail(rockId);
await waitFor(() => detail.innerHTML.includes("Beach pebble"), "detail shows name");
check(detail.innerHTML.includes("Narragansett, RI"), "detail shows place");
check(detail.innerHTML.includes("Smooth and sparkly"), "detail shows notes");
check(detail.innerHTML.includes("🔍 Identify this rock"), "detail offers identification");

// ---------- 5. identify quiz full flow ----------
const { renderIdentify, mountIdentify } = await import("../src/views/identify");
const idRoot = renderIdentify();
mountIdentify(idRoot, rockId);
click(q(idRoot, '[data-action="id-start"]'));
check(idRoot.innerHTML.includes("How does it look up close?"), "quiz step 1: texture");
// texture: coarse (visible grains) — matches granite
click(qa(idRoot, "[data-action='id-pick']").find((c) => c.dataset.value === "coarse")!);
click(q(idRoot, '[data-action="id-next"]'));
check(idRoot.innerHTML.includes("How hard is it?"), "quiz step 2: hardness");
// hardness: pick "hard" (radio), then Continue
const hardRadio = qa(idRoot, 'input[name="hardness"]').find((r) => (r as HTMLInputElement).value === "hard");
fire(hardRadio!, "change");
click(q(idRoot, '[data-action="id-next"]'));
check(idRoot.innerHTML.includes("How does it shine?"), "quiz step 3: luster");
// luster: earthy
click(qa(idRoot, "[data-action='id-pick']").find((c) => c.dataset.value === "earthy")!);
click(q(idRoot, '[data-action="id-next"]'));
check(idRoot.innerHTML.includes("How heavy does it feel?"), "quiz step 4: gravity");
click(qa(idRoot, "[data-action='id-pick']").find((c) => c.dataset.value === "light")!);
click(q(idRoot, '[data-action="id-next"]'));
check(idRoot.innerHTML.includes("What colors do you see?"), "quiz step 5: colors");
for (const c of ["gray", "white"]) click(qa(idRoot, "[data-action='id-pick']").find((ch) => ch.dataset.value === c)!);
click(q(idRoot, '[data-action="id-next"]'));
check(idRoot.innerHTML.includes("What's its structure?"), "quiz step 6: habit");
click(qa(idRoot, "[data-action='id-pick']").find((ch) => ch.dataset.value === "granular")!);
click(q(idRoot, '[data-action="id-next"]'));
await waitFor(() => idRoot.innerHTML.includes("Your matches"), "quiz shows results");
check(idRoot.innerHTML.includes("granite"), "granite appears in results");
check(idRoot.innerHTML.includes("conf"), "results show confidence badges");

// save the match
click(qa(idRoot, "[data-action='id-save']").find((b) => b.dataset.id === "granite")!);
await new Promise((r) => setTimeout(r, 80));

// ---------- 6. detail now identified ----------
const detail2 = renderDetail(rockId);
await waitFor(() => detail2.innerHTML.includes("Granite"), "detail shows identified type");
check(detail2.innerHTML.includes("Observed traits"), "detail shows traits");

// ---------- 7. guide search ----------
const { renderGuide, mountGuide } = await import("../src/views/guide");
const guide = renderGuide();
mountGuide(guide);
check(qa(guide, ".guide-group").length === 4, "guide shows 4 groups");
const search = q(guide, "#guide-search") as HTMLInputElement;
search.value = "magnetite";
fire(search, "input");
check(guide.innerHTML.includes("Magnetite"), "guide search finds magnetite");
check(!guide.innerHTML.includes("Granite"), "guide search filters out others");

// ---------- 8. export ----------
const { exportAll } = await import("../src/db");
const exported = await exportAll();
check(exported.length === 1 && exported[0].typeId === "granite", "export includes identified rock");

if (fails) {
  console.log(`\nRESULT: ${fails} failure(s)`);
  process.exit(1);
}
console.log("\nRESULT: all DOM integration checks passed ✓");
