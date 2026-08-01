// ---------- Field guide view + spec sheets ----------

import { findSpec, groupedRocks, ROCKS } from "../knowledge";
import type { RockSpec } from "../types";
import { esc } from "../utils";

export function renderGuide(): HTMLElement {
  const root = document.createElement("div");
  root.className = "view";
  root.innerHTML = `
    <h2>📖 Field guide</h2>
    <input type="search" class="search" id="guide-search" placeholder="Search rocks & minerals…" autocomplete="off" />
    <div id="guide-body">${groupsHtml("")}</div>
  `;
  return root;
}

export function mountGuide(root: HTMLElement): void {
  const search = root.querySelector<HTMLInputElement>("#guide-search");
  search?.addEventListener("input", () => {
    const q = (search.value ?? "").trim().toLowerCase();
    const body = root.querySelector("#guide-body");
    if (body) body.innerHTML = groupsHtml(q);
  });

  root.addEventListener("click", (e) => {
    const item = (e.target as HTMLElement).closest("[data-guide-id]") as HTMLElement | null;
    if (!item) return;
    const id = item.dataset.guideId;
    const sheet = root.querySelector<HTMLElement>(`#gsheet-${id}`);
    if (sheet) {
      sheet.style.display = sheet.style.display === "none" ? "block" : "none";
    }
  });
}

function groupsHtml(query: string): string {
  const q = query.trim().toLowerCase();
  const groups = groupedRocks();
  const out = groups
    .map((g) => {
      const rocks = g.rocks.filter(
        (r) =>
          !q ||
          r.name.toLowerCase().includes(q) ||
          r.looks.toLowerCase().includes(q) ||
          r.group.toLowerCase().includes(q)
      );
      if (!rocks.length) return "";
      return `
        <div class="guide-group">
          <h3>${esc(g.label)} (${rocks.length})</h3>
          ${rocks.map((r) => guideItem(r)).join("")}
        </div>
      `;
    })
    .join("");
  if (!out) return `<p class="muted">No rocks match "${esc(query)}".</p>`;
  return out;
}

function guideItem(r: RockSpec): string {
  return `
    <div class="guide-item" data-guide-id="${r.id}">
      <span class="em">${r.emoji ?? "🪨"}</span>
      <div style="flex:1">
        <div class="nm">${esc(r.name)}</div>
        <div class="ds">${esc(r.looks)}</div>
      </div>
      <span class="muted">▾</span>
    </div>
    <div class="spec-sheet" id="gsheet-${r.id}" style="display:none">${specSheetBody(r)}</div>
  `;
}

export function renderSpec(id: string): HTMLElement {
  const root = document.createElement("div");
  root.className = "view";
  const spec = findSpec(id);
  if (!spec) {
    root.innerHTML = `<div class="empty"><span class="big">🪨</span><h2>Not found</h2><button class="btn" data-action="nav" data-href="#/guide">Back to guide</button></div>`;
    return root;
  }
  root.innerHTML = `
    <h2>${spec.emoji ?? "🪨"} ${esc(spec.name)}</h2>
    <p class="muted small" style="text-transform:uppercase; letter-spacing:0.05em; font-weight:700; color:var(--accent)">${esc(spec.group)}</p>
    <div class="spec-sheet">${specSheetBody(spec)}</div>
    <div class="btn-row">
      <button class="btn" data-action="nav" data-href="#/add?type=${spec.id}">📝 Log one like this</button>
      <button class="btn secondary" data-action="nav" data-href="#/guide">Back to guide</button>
    </div>
  `;
  return root;
}

export function specSheetBody(spec: RockSpec): string {
  return `
    <p class="looks">${esc(spec.looks)}</p>
    <div class="hint">💡 ${esc(spec.hints)}</div>
    <div class="trait-list" style="margin-top:10px">
      <div class="trait-row"><span class="k">Group</span><span class="v">${esc(spec.group)}</span></div>
      <div class="trait-row"><span class="k">Hardness</span><span class="v">Mohs ${spec.mohs}</span></div>
      <div class="trait-row"><span class="k">Luster</span><span class="v">${esc(spec.luster.join(", "))}</span></div>
      <div class="trait-row"><span class="k">Colors</span><span class="v">${esc(spec.colors.join(", "))}</span></div>
      <div class="trait-row"><span class="k">Structure</span><span class="v">${esc(spec.habit.join(", "))}</span></div>
      ${spec.streak ? `<div class="trait-row"><span class="k">Streak</span><span class="v">${esc(spec.streak)}</span></div>` : ""}
      ${spec.gravity ? `<div class="trait-row"><span class="k">Weight</span><span class="v">${esc(spec.gravity)}</span></div>` : ""}
      ${spec.reactsToAcid ? `<div class="trait-row"><span class="k">Acid test</span><span class="v">Fizzes with vinegar</span></div>` : ""}
      ${spec.magnetic ? `<div class="trait-row"><span class="k">Magnet</span><span class="v">Attracts a magnet</span></div>` : ""}
      ${spec.uses ? `<div class="trait-row"><span class="k">Uses</span><span class="v">${esc(spec.uses)}</span></div>` : ""}
    </div>
  `;
}

export { ROCKS };
