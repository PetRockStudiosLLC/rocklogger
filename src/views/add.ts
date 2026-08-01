// ---------- Add / Edit rock form ----------

import * as db from "../db";
import { findSpec } from "../knowledge";
import type { RockEntry } from "../types";
import { compressImage, esc, getLocation, todayISO, toast, uid } from "../utils";

interface FormState {
  id?: string;
  photo?: string;
  lat?: number;
  lng?: number;
  place?: string;
  typeId?: string;
}

export function renderAdd(params: { id?: string; typeId?: string } = {}): HTMLElement {
  const root = document.createElement("div");
  root.className = "view";

  const state: FormState = {
    id: params.id,
    typeId: params.typeId,
    place: "",
  };

  const isEdit = !!params.id;

  if (isEdit) {
    void db.getRock(params.id!).then((entry) => {
      if (!entry) {
        toast("Rock not found");
        location.hash = "#/";
        return;
      }
      state.photo = entry.photo;
      state.lat = entry.lat;
      state.lng = entry.lng;
      state.place = entry.place;
      state.typeId = entry.typeId;
      fillForm(entry);
    });
  }

  const typePre = params.typeId ? findSpec(params.typeId) : undefined;

  root.innerHTML = `
    <h2>${isEdit ? "✏️ Edit rock" : "➕ Log a rock"}</h2>
    ${
      typePre
        ? `<p class="muted small">Logging as <b style="color:var(--accent2)">${esc(typePre.name)}</b> (${esc(typePre.group)})</p>`
        : ""
    }

    <form id="rock-form" novalidate>
      <div class="field">
        <label>Photo</label>
        <div class="photo-drop" id="photo-drop">
          <div id="photo-placeholder" style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:12px">
            <span style="font-size:40px">📷</span>
            <span class="muted">Tap to add a photo</span>
          </div>
          <img id="photo-preview" style="display:none" alt="preview" />
        </div>
        <div class="photo-actions" style="margin-top:8px">
          <button type="button" class="btn small secondary" id="btn-camera">📷 Camera</button>
          <button type="button" class="btn small secondary" id="btn-gallery">🖼️ Gallery</button>
          <button type="button" class="btn small secondary" id="btn-remove-photo" style="display:none">🗑️</button>
        </div>
        <input type="file" id="photo-input" accept="image/*" style="display:none" />
      </div>

      <div class="field">
        <label>Name / nickname</label>
        <input type="text" id="f-name" placeholder="e.g. Sparkly chunk from the beach" autocomplete="off" />
      </div>

      <div class="field">
        <label>Date found</label>
        <input type="date" id="f-date" value="${todayISO()}" />
      </div>

      <div class="field">
        <label>Where you found it</label>
        <input type="text" id="f-place" placeholder="e.g. Narragansett beach, RI" autocomplete="off" />
        <div class="row" style="margin-top:8px">
          <button type="button" class="btn small secondary" id="btn-locate">📍 Use my location</button>
          <span class="muted small" id="loc-status"></span>
        </div>
      </div>

      <div class="field">
        <label>Notes</label>
        <textarea id="f-notes" placeholder="Size, texture, smell, who found it, what made it special…"></textarea>
      </div>

      <div class="field">
        <label>Tags (comma separated)</label>
        <input type="text" id="f-tags" placeholder="beach, shiny, favorite" autocomplete="off" />
      </div>

      <button type="submit" class="btn">💾 Save rock</button>
      <button type="button" class="btn secondary" id="btn-cancel">Cancel</button>
    </form>
  `;

  function fillForm(e: RockEntry): void {
    const nameEl = root.querySelector<HTMLInputElement>("#f-name");
    const dateEl = root.querySelector<HTMLInputElement>("#f-date");
    const placeEl = root.querySelector<HTMLInputElement>("#f-place");
    const notesEl = root.querySelector<HTMLTextAreaElement>("#f-notes");
    const tagsEl = root.querySelector<HTMLInputElement>("#f-tags");
    if (nameEl) nameEl.value = e.name || "";
    if (dateEl && e.foundAt) dateEl.value = e.foundAt;
    if (placeEl && e.place) placeEl.value = e.place;
    if (notesEl && e.notes) notesEl.value = e.notes;
    if (tagsEl && e.tags?.length) tagsEl.value = e.tags.join(", ");
    renderPhoto();
    void updateLocStatus();
  }

  function renderPhoto(): void {
    const drop = root.querySelector<HTMLElement>("#photo-drop");
    const placeholder = root.querySelector<HTMLElement>("#photo-placeholder");
    const img = root.querySelector<HTMLImageElement>("#photo-preview");
    const rm = root.querySelector<HTMLElement>("#btn-remove-photo");
    if (!drop || !placeholder || !img || !rm) return;
    if (state.photo) {
      img.src = state.photo;
      img.style.display = "block";
      placeholder.style.display = "none";
      drop.classList.add("has-photo");
      rm.style.display = "inline-flex";
    } else {
      img.style.display = "none";
      placeholder.style.display = "flex";
      drop.classList.remove("has-photo");
      rm.style.display = "none";
    }
  }

  async function updateLocStatus(): Promise<void> {
    const el = root.querySelector<HTMLElement>("#loc-status");
    if (!el) return;
    if (state.lat !== undefined && state.lng !== undefined) {
      el.textContent = `📍 ${state.lat.toFixed(4)}, ${state.lng.toFixed(4)}`;
    } else {
      el.textContent = "";
    }
  }

  root.querySelector("#btn-camera")?.addEventListener("click", () => {
    const input = root.querySelector<HTMLInputElement>("#photo-input");
    if (input) {
      input.removeAttribute("capture");
      input.setAttribute("capture", "environment");
      input.value = "";
      input.click();
    }
  });

  root.querySelector("#btn-gallery")?.addEventListener("click", () => {
    const input = root.querySelector<HTMLInputElement>("#photo-input");
    if (input) {
      input.removeAttribute("capture");
      input.value = "";
      input.click();
    }
  });

  root.querySelector("#btn-remove-photo")?.addEventListener("click", () => {
    state.photo = undefined;
    renderPhoto();
  });

  root.querySelector("#photo-drop")?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("img")) return;
    const input = root.querySelector<HTMLInputElement>("#photo-input");
    if (input) {
      input.removeAttribute("capture");
      input.value = "";
      input.click();
    }
  });

  root.querySelector("#photo-input")?.addEventListener("change", async (e) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      toast("Processing photo…");
      state.photo = await compressImage(file);
      renderPhoto();
    } catch {
      toast("Couldn't read that photo");
    }
  });

  root.querySelector("#btn-locate")?.addEventListener("click", async () => {
    const el = root.querySelector<HTMLElement>("#loc-status");
    if (el) el.textContent = "Locating…";
    const pos = await getLocation();
    if (pos) {
      state.lat = pos.lat;
      state.lng = pos.lng;
      await updateLocStatus();
      toast("Location captured");
    } else {
      if (el) el.textContent = "Location unavailable";
    }
  });

  root.querySelector("#btn-cancel")?.addEventListener("click", () => {
    history.back();
  });

  root.querySelector<HTMLFormElement>("#rock-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = (root.querySelector<HTMLInputElement>("#f-name")?.value ?? "").trim();
    if (!name) {
      toast("Give your rock a name first");
      return;
    }
    const date = root.querySelector<HTMLInputElement>("#f-date")?.value || todayISO();
    const place = (root.querySelector<HTMLInputElement>("#f-place")?.value ?? "").trim();
    const notes = (root.querySelector<HTMLTextAreaElement>("#f-notes")?.value ?? "").trim();
    const tags = (root.querySelector<HTMLInputElement>("#f-tags")?.value ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const now = Date.now();
    const entry: RockEntry = {
      id: state.id ?? uid(),
      name,
      typeId: state.typeId,
      photo: state.photo,
      lat: state.lat,
      lng: state.lng,
      place: place || state.place,
      foundAt: date,
      notes: notes || undefined,
      tags: tags.length ? tags : undefined,
      createdAt: state.id ? (await db.getRock(state.id))?.createdAt ?? now : now,
      updatedAt: now,
    };

    await db.putRock(entry);
    toast(isEdit ? "Rock updated" : "Rock saved 🪨");
    location.hash = `#/rock/${entry.id}`;
  });

  renderPhoto();
  return root;
}
