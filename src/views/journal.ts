// ---------- Journal view: collection grid ----------

import * as db from "../db";
import { findSpec } from "../knowledge";
import type { RockEntry } from "../types";
import { esc, fmtDate } from "../utils";

export function renderJournal(): HTMLElement {
  const root = document.createElement("div");
  root.className = "view";
  void db.getAllRocks().then((rocks) => {
    root.innerHTML = journalHtml(rocks);
  });
  return root;
}

function journalHtml(rocks: RockEntry[]): string {
  if (!rocks.length) {
    return `
      <div class="empty">
        <span class="big">🪨</span>
        <h2>No rocks logged yet</h2>
        <p class="muted">Found a cool rock? Snap a photo, note where you found it, and log it.</p>
        <button class="btn" data-action="nav" data-href="#/add">➕ Add your first rock</button>
        <div style="height:10px"></div>
        <button class="btn secondary" data-action="nav" data-href="#/identify">🔍 Identify a rock you already have</button>
      </div>
    `;
  }

  const identified = rocks.filter((r) => r.typeId).length;
  const total = rocks.length;

  const cards = rocks
    .map((r) => {
      const spec = findSpec(r.typeId);
      const photo = r.photo
        ? `<img src="${r.photo}" alt="${esc(r.name)}" loading="lazy" />`
        : spec?.emoji ?? "🪨";
      const when = r.foundAt ? fmtDate(r.foundAt) : "date unknown";
      const where = r.place ? ` · ${esc(r.place)}` : "";
      const badge = spec
        ? `<div class="badge">${esc(spec.name)}</div>`
        : `<div class="badge ghost">Unidentified</div>`;
      return `
        <div class="rock-card" data-action="nav" data-href="#/rock/${r.id}">
          <div class="thumb">${photo}</div>
          <div class="info">
            <div class="name">${esc(r.name)}</div>
            <div class="meta">${when}${where}</div>
            ${badge}
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="row" style="margin-bottom:12px; gap:10px">
      <div class="stat-callout"><div class="n">${total}</div><div class="l">Rocks</div></div>
      <div class="stat-callout"><div class="n">${identified}</div><div class="l">Identified</div></div>
      <div class="stat-callout"><div class="n">${total - identified}</div><div class="l">To ID</div></div>
    </div>
    <div class="rock-grid">${cards}</div>
  `;
}
