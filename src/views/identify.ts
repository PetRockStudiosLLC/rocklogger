// ---------- Identify view: trait quiz flow ----------

import * as db from "../db";
import {
  GRAVITY_CHOICES,
  HARDNESS_CHOICES,
  LUSTER_CHOICES,
  answersToTraits,
  identifyRock,
  type IdentifyAnswer,
} from "../identify";
import { findSpec } from "../knowledge";
import { COLORS, HABITS } from "../types";
import { esc, toast } from "../utils";

const STEPS = [
  { key: "hardness", title: "How hard is it?", hint: "Try scratch tests on a hidden part. Start soft, go harder." },
  { key: "luster", title: "How does it shine?", hint: "Look at how light reflects off a fresh surface." },
  { key: "gravity", title: "How heavy does it feel?", hint: "Compare to a similar-sized stone you know." },
  { key: "colors", title: "What colors do you see?", hint: "Pick all that apply — fresh surface + weathered surface." },
  { key: "habit", title: "What's its structure?", hint: "Look at the shape and texture of the rock itself." },
] as const;

interface ViewState {
  rockId?: string;
  step: number;
  answers: IdentifyAnswer;
}

export function renderIdentify(): HTMLElement {
  const root = document.createElement("div");
  root.className = "view identify";
  root.innerHTML = introHtml();
  return root;
}

function introHtml(): string {
  return `
    <h2>🔍 Identify a rock</h2>
    <p class="muted">Answer a few quick questions about your rock — luster, hardness, weight, color, structure — and RockLogger will match it against the field guide.</p>
    <details class="help">
      <summary>How to test hardness</summary>
      <ul>
        <li><b>Fingernail</b> scratches it → very soft (under ~2.5)</li>
        <li><b>Copper coin</b> scratches it → soft (~2.5–3.5)</li>
        <li><b>Steel knife / nail file</b> scratches it → medium (~3.5–5.5)</li>
        <li>It <b>scratches glass</b>, or a steel blade won't → hard (~5.5–7)</li>
        <li>It <b>scratches quartz</b> → very hard (7+)</li>
      </ul>
    </details>
    <button class="btn" data-action="id-start">Start identifying</button>
  `;
}

export function mountIdentify(root: HTMLElement, rockId?: string): void {
  const state: ViewState = { rockId, step: 0, answers: {} };
  root.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === "id-start") renderStep(state, root);
    else if (action === "id-next") {
      if (btn.dataset.see === "now") {
        state.step = STEPS.length;
        renderStep(state, root);
      } else {
        nextStep(state, root);
      }
    } else if (action === "id-back") prevStep(state, root);
    else if (action === "id-skip") skipStep(state, root);
    else if (action === "id-restart") renderStep(state, root, true);
    else if (action === "id-save" && btn.dataset.id) saveMatch(state, btn.dataset.id);
    else if (action === "id-log" && btn.dataset.id) {
      location.hash = `#/add?type=${btn.dataset.id}`;
    } else if (action === "id-pick" && btn.dataset.value && btn.dataset.step) {
      toggleChip(state, root, btn, btn.dataset.step as keyof IdentifyAnswer, btn.dataset.value);
    }
  });
}

function currentCount(state: ViewState): number {
  return identifyRock(state.answers).length;
}

function toggleChip(
  state: ViewState,
  root: HTMLElement,
  chip: HTMLElement,
  stepKey: keyof IdentifyAnswer,
  value: string
): void {
  if (stepKey === "colors" || stepKey === "habit") {
    const arr = ((state.answers[stepKey] as string[] | undefined) ?? []) as string[];
    const idx = arr.indexOf(value);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(value);
    state.answers[stepKey] = arr;
    chip.classList.toggle("on", idx < 0);
    updateChipCount(state, root, stepKey);
  } else {
    // single-select (luster / gravity): set value, exclusive highlight
    state.answers[stepKey] = value as never;
    root.querySelectorAll<HTMLElement>(`[data-step="${stepKey}"]`).forEach((c) => {
      c.classList.toggle("on", c === chip);
    });
  }
}

function updateChipCount(state: ViewState, root: HTMLElement, stepKey: "colors" | "habit"): void {
  const n = (state.answers[stepKey] as string[] | undefined)?.length ?? 0;
  const el = root.querySelector(`[data-count-for="${stepKey}"]`);
  if (el) el.textContent = n ? `${n} selected` : "Tap to select";
}

function renderStep(state: ViewState, root: HTMLElement, reset = false): void {
  if (reset) {
    state.step = 0;
    state.answers = {};
  }
  if (state.step >= STEPS.length) {
    renderResults(state, root);
    return;
  }
  const step = STEPS[state.step];
  const key = step.key;
  const answered = !!state.answers[key as keyof IdentifyAnswer];

  let optionsHtml = "";
  if (key === "hardness") {
    optionsHtml = HARDNESS_CHOICES.map(
      (h) => `
        <label class="guide-item" style="display:flex; flex-direction:column; align-items:flex-start; gap:2px; ${
          (state.answers.hardness as (typeof HARDNESS_CHOICES)[number] | undefined)?.id === h.id ? "border-color:var(--accent)" : ""
        }">
          <span class="nm">${esc(h.label)}</span>
          <span class="ds">${esc(h.test)}</span>
          <input type="radio" name="hardness" value="${h.id}" style="display:none" ${(state.answers.hardness as (typeof HARDNESS_CHOICES)[number] | undefined)?.id === h.id ? "checked" : ""} />
        </label>`
    ).join("");
  } else if (key === "luster") {
    optionsHtml = `<div class="chips">${LUSTER_CHOICES.map(
      (l) => `<span class="chip ${state.answers.luster === l.id ? "on" : ""}" data-action="id-pick" data-step="luster" data-value="${l.id}">${esc(l.label)}</span>`
    ).join("")}</div>`;
  } else if (key === "gravity") {
    optionsHtml = `<div class="chips">${GRAVITY_CHOICES.map(
      (g) => `<span class="chip ${state.answers.gravity === g.id ? "on" : ""}" data-action="id-pick" data-step="gravity" data-value="${g.id}">${esc(g.label)}</span>`
    ).join("")}</div>`;
  } else if (key === "colors") {
    optionsHtml = `<div class="chips">${COLORS.map(
      (c) => `<span class="chip ${(state.answers.colors ?? []).includes(c) ? "on" : ""}" data-action="id-pick" data-step="colors" data-value="${c}">${esc(c)}</span>`
    ).join("")}</div>
    <p class="muted small" data-count-for="colors">${(state.answers.colors ?? []).length ? `${state.answers.colors!.length} selected` : "Tap to select"}</p>`;
  } else if (key === "habit") {
    optionsHtml = `<div class="chips">${HABITS.map(
      (h) => `<span class="chip ${(state.answers.habit ?? []).includes(h) ? "on" : ""}" data-action="id-pick" data-step="habit" data-value="${h}">${esc(h)}</span>`
    ).join("")}</div>
    <p class="muted small" data-count-for="habit">${(state.answers.habit ?? []).length ? `${state.answers.habit!.length} selected` : "Tap to select"}</p>`;
  }

  const progress = ((state.step + 1) / (STEPS.length + 1)) * 100;
  const matches = currentCount(state);

  root.innerHTML = `
    <div class="q-progress"><div class="bar" style="width:${progress}%"></div></div>
    <p class="muted small" style="margin-bottom:4px">Question ${state.step + 1} of ${STEPS.length} · ${matches} rocks match so far</p>
    <h3>${esc(step.title)}</h3>
    <p class="hint">${esc(step.hint)}</p>
    <div style="margin-bottom:16px">${optionsHtml}</div>
    <div class="btn-row">
      ${state.step > 0 ? `<button class="btn secondary small" data-action="id-back">← Back</button>` : ""}
      <button class="btn small" data-action="id-skip">Skip →</button>
    </div>
    <div class="btn-row">
      <button class="btn ${answered ? "" : "secondary"}" data-action="id-next">${answered ? "Next →" : "Continue →"}</button>
      ${matches > 0 && matches <= 12 ? `<button class="btn small secondary" data-action="id-next" data-see="now">See matches (${matches})</button>` : ""}
    </div>
  `;

  // radio behavior for hardness
  if (key === "hardness") {
    root.querySelectorAll<HTMLInputElement>('input[name="hardness"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        const choice = HARDNESS_CHOICES.find((h) => h.id === radio.value);
        if (choice) state.answers.hardness = choice;
        renderStep(state, root);
      });
    });
  }
}

function nextStep(state: ViewState, root: HTMLElement, force = false): void {
  const step = STEPS[state.step];
  const key = step.key;
  const has = key === "colors" || key === "habit" ? (state.answers[key] as string[] | undefined)?.length : !!state.answers[key as keyof IdentifyAnswer];
  if (!has && !force) {
    toast("Pick an answer, or tap Skip");
    return;
  }
  state.step++;
  renderStep(state, root);
}

function skipStep(state: ViewState, root: HTMLElement): void {
  const step = STEPS[state.step];
  const key = step.key;
  if (key === "hardness") state.answers.hardness = undefined;
  state.step++;
  renderStep(state, root);
}

function prevStep(state: ViewState, root: HTMLElement): void {
  if (state.step > 0) {
    state.step--;
    renderStep(state, root);
  }
}

function renderResults(state: ViewState, root: HTMLElement): void {
  const results = identifyRock(state.answers);
  root.innerHTML = `
    <div class="q-progress"><div class="bar" style="width:100%"></div></div>
    <h2>${results.length ? "🎯 Your matches" : "No matches yet"}</h2>
    <p class="hint">
      ${
        results.length
          ? `Ranked by how well your answers match ${results.length} candidates. Best guesses first.`
          : "Nothing matched — try again with looser answers (skip more questions)."
      }
    </p>
    ${results
      .slice(0, 8)
      .map(
        (m) => `
          <div class="result-card" data-action="id-toggle" data-id="${m.spec.id}">
            <div class="top">
              <span class="rname">${m.spec.emoji ?? ""} ${esc(m.spec.name)}</span>
              <span class="pct">${m.pct}%</span>
            </div>
            <div class="looks">${esc(m.spec.looks)}</div>
            <div class="pctbar"><div class="fill" style="width:${m.pct}%"></div></div>
            <div class="spec-extra" id="extra-${m.spec.id}" style="display:none; margin-top:10px">
              <div class="hint" style="background:var(--bg2); border-left:3px solid var(--accent); border-radius:8px; padding:10px 12px; font-size:13px">💡 ${esc(m.spec.hints)}</div>
              <div class="trait-row"><span class="k">Hardness</span><span class="v">Mohs ${m.spec.mohs}</span></div>
              <div class="trait-row"><span class="k">Luster</span><span class="v">${esc(m.spec.luster.join(", "))}</span></div>
              <div class="trait-row"><span class="k">Colors</span><span class="v">${esc(m.spec.colors.join(", "))}</span></div>
              ${m.spec.streak ? `<div class="trait-row"><span class="k">Streak</span><span class="v">${esc(m.spec.streak)}</span></div>` : ""}
              ${m.spec.gravity ? `<div class="trait-row"><span class="k">Weight</span><span class="v">${esc(m.spec.gravity)}</span></div>` : ""}
              ${m.spec.reactsToAcid ? `<div class="trait-row"><span class="k">Acid test</span><span class="v">Fizzes with vinegar</span></div>` : ""}
              ${m.spec.magnetic ? `<div class="trait-row"><span class="k">Magnet</span><span class="v">Yes — attracts a magnet</span></div>` : ""}
              ${m.spec.uses ? `<div class="trait-row"><span class="k">Uses</span><span class="v">${esc(m.spec.uses)}</span></div>` : ""}
              <div class="btn-row">
                ${
                  state.rockId
                    ? `<button class="btn small" data-action="id-save" data-id="${m.spec.id}">✅ This is it</button>`
                    : `<button class="btn small" data-action="id-log" data-id="${m.spec.id}">📝 Log this rock</button>`
                }
              </div>
            </div>
          </div>`
      )
      .join("")}
    <div class="btn-row">
      <button class="btn secondary" data-action="id-restart">↺ Start over</button>
    </div>
  `;

  // toggle spec-extra
  root.querySelectorAll<HTMLElement>("[data-action='id-toggle']").forEach((card) => {
    card.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest("[data-action='id-save'], [data-action='id-log']")) return;
      const id = card.dataset.id;
      const extra = root.querySelector<HTMLElement>(`#extra-${id}`);
      if (extra) extra.style.display = extra.style.display === "none" ? "block" : "none";
    });
  });

  if (state.rockId) {
    void db.getRock(state.rockId).then((entry) => {
      if (entry) {
        const btn = document.createElement("div");
        btn.className = "muted small";
        btn.style.marginTop = "10px";
        btn.textContent = `Saving a match will update "${entry.name}".`;
        root.querySelector(".btn-row")?.appendChild(btn);
      }
    });
  }
}

async function saveMatch(state: ViewState, typeId: string): Promise<void> {
  if (!state.rockId) return;
  const entry = await db.getRock(state.rockId);
  if (!entry) return toast("Rock not found");
  entry.typeId = typeId;
  entry.traits = answersToTraits(state.answers);
  entry.updatedAt = Date.now();
  await db.putRock(entry);
  toast(`Identified: ${findSpec(typeId)?.name} 🎉`);
  location.hash = `#/rock/${state.rockId}`;
}
