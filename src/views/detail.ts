// ---------- Rock detail view ----------

import * as db from "../db";
import { identifyRock, traitsSummary, HARDNESS_CHOICES } from "../identify";
import { findSpec } from "../knowledge";
import type { RockEntry } from "../types";
import { coordsLabel, esc, fmtDate, toast } from "../utils";

export function renderDetail(id: string): HTMLElement {
  const root = document.createElement("div");
  root.className = "view detail";
  root.innerHTML = `<div class="empty"><span class="big">🪨</span><p>Loading…</p></div>`;

  void db.getRock(id).then((entry) => {
    if (!entry) {
      root.innerHTML = `
        <div class="empty">
          <span class="big">😕</span>
          <h2>Rock not found</h2>
          <button class="btn" data-action="nav" data-href="#/">Back to journal</button>
        </div>
      `;
      return;
    }
    root.innerHTML = detailHtml(entry);
  });

  return root;
}

function detailHtml(entry: RockEntry): string {
  const spec = findSpec(entry.typeId);
  const photo = entry.photo
    ? `<img class="detail-photo" src="${entry.photo}" alt="${esc(entry.name)}" />`
    : `<div class="detail-photo placeholder">${spec?.emoji ?? "🪨"}</div>`;

  const traitLines = entry.traits ? traitsSummary(entry.traits) : [];
  const suggestions = entry.traits && !entry.typeId ? identifyFromTraits(entry) : [];

  return `
    ${photo}
    <h2>${esc(entry.name)}</h2>
    <div class="found">
      ${entry.foundAt ? `🗓️ ${fmtDate(entry.foundAt)}` : ""}
      ${entry.place ? ` · 📍 ${esc(entry.place)}` : ""}
      ${entry.lat !== undefined ? ` · ${esc(coordsLabel(entry.lat, entry.lng))}` : ""}
    </div>

    <div style="margin-bottom:14px">
      ${
        spec
          ? `<span class="badge" style="font-size:13px; padding:5px 12px">${spec.emoji ?? ""} ${esc(spec.name)}</span>
             <span class="muted small" style="margin-left:8px">${esc(spec.group)}</span>`
          : `<span class="badge ghost" style="font-size:13px; padding:5px 12px">🔍 Unidentified</span>`
      }
    </div>

    ${
      spec
        ? `<div class="card" style="padding:14px; margin-bottom:14px">
             <p style="margin:0 0 8px">${esc(spec.looks)}</p>
             <div class="hint" style="background:var(--bg2); border-left:3px solid var(--accent); border-radius:8px; padding:10px 12px; font-size:13px">
               💡 ${esc(spec.hints)}
             </div>
           </div>`
        : ""
    }

    ${
      entry.notes
        ? `<div class="card" style="padding:14px; margin-bottom:14px">
             <h3 style="margin-bottom:6px">Notes</h3>
             <p style="margin:0; white-space:pre-wrap">${esc(entry.notes)}</p>
           </div>`
        : ""
    }

    ${
      entry.tags?.length
        ? `<div style="margin-bottom:14px">${entry.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join("")}</div>`
        : ""
    }

    ${
      traitLines.length
        ? `<div class="card" style="padding:14px; margin-bottom:14px">
             <h3 style="margin-bottom:8px">Observed traits</h3>
             <div class="trait-list">
               ${traitLines.map((t) => `<div class="trait-row"><span class="k">•</span><span class="v">${esc(t)}</span></div>`).join("")}
             </div>
           </div>`
        : ""
    }

    ${
      suggestions.length
        ? `<div class="card" style="padding:14px; margin-bottom:14px">
             <h3 style="margin-bottom:8px">Could be…</h3>
             ${suggestions
               .map(
                 (m) => `
                   <div class="result-card" data-action="nav" data-href="#/spec/${m.spec.id}">
                     <div class="top">
                       <span class="rname">${m.spec.emoji ?? ""} ${esc(m.spec.name)}</span>
                       <span class="pct">${m.pct}%</span>
                     </div>
                     <div class="looks">${esc(m.spec.looks)}</div>
                     <div class="pctbar"><div class="fill" style="width:${m.pct}%"></div></div>
                   </div>`
               )
               .join("")}
             <p class="muted small" style="margin:6px 0 0">Based on traits you logged. Tap a match to confirm it, then save from the detail page.</p>
           </div>`
        : ""
    }

    <div class="btn-row">
      ${
        spec
          ? `<button class="btn small" data-action="confirm-type" data-id="${entry.id}">✅ Confirm ${esc(spec.name)}</button>`
          : `<button class="btn" data-action="nav" data-href="#/identify/${entry.id}">🔍 Identify this rock</button>`
      }
    </div>
    <div class="btn-row">
      <button class="btn small secondary" data-action="nav" data-href="#/add/${entry.id}">✏️ Edit</button>
      <button class="btn small secondary" data-action="nav" data-href="#/guide">📖 Field guide</button>
      <button class="btn small danger" data-action="delete-rock" data-id="${entry.id}">🗑️ Delete</button>
    </div>
  `;
}

function identifyFromTraits(entry: RockEntry) {
  const t = entry.traits!;
  return identifyRock({
    hardness: t.hardness
      ? HARDNESS_CHOICES.find((h) => Math.abs(h.min - (t.hardness?.min ?? 0)) < 0.01 && Math.abs(h.max - (t.hardness?.max ?? 0)) < 0.01)
      : undefined,
    luster: t.luster,
    gravity: t.gravity,
    colors: t.colors,
    habit: t.habit,
  }).slice(0, 4);
}

/** Attach actions handled via delegation in main.ts (confirm-type / delete-rock) */
export async function confirmType(id: string): Promise<void> {
  const entry = await db.getRock(id);
  if (!entry) return toast("Rock not found");
  if (!entry.typeId) {
    // user pressed confirm without a match — pick top suggestion
    const sug = entry.traits ? identifyFromTraits(entry) : [];
    if (sug.length) entry.typeId = sug[0].spec.id;
  }
  entry.updatedAt = Date.now();
  await db.putRock(entry);
  toast("Identified! 🎉");
  location.hash = `#/rock/${id}`;
}

export async function deleteRock(id: string): Promise<void> {
  const ok = window.confirm("Delete this rock from your collection?");
  if (!ok) return;
  await db.deleteRock(id);
  toast("Rock deleted");
  location.hash = "#/";
}
