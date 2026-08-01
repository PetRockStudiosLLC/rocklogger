// ---------- RockLogger: app shell, router, delegated actions ----------

import "./styles.css";
import * as db from "./db";
import { ROCK_COUNT } from "./knowledge";
import { downloadJson, readJsonFile, toast } from "./utils";
import { renderJournal } from "./views/journal";
import { renderAdd } from "./views/add";
import { renderDetail, confirmType, deleteRock } from "./views/detail";
import { renderIdentify, mountIdentify } from "./views/identify";
import { renderGuide, mountGuide, renderSpec } from "./views/guide";

const app = document.getElementById("app")!;

// ---------- shell ----------
function shell(): void {
  app.innerHTML = `
    <header>
      <span class="logo">🪨</span>
      <div>
        <h1>RockLogger</h1>
        <div class="sub" id="header-sub">your rock journal</div>
      </div>
      <span class="spacer"></span>
      <button class="icon" id="btn-menu" aria-label="Menu">⋯</button>
    </header>
    <main id="main"></main>
    <nav class="tabs">
      <button data-tab="journal" data-href="#/"><span class="ic">🪨</span>Journal</button>
      <button data-tab="identify" data-href="#/identify"><span class="ic">🔍</span>Identify</button>
      <button data-tab="add" data-href="#/add"><span class="ic">➕</span>Add</button>
      <button data-tab="guide" data-href="#/guide"><span class="ic">📖</span>Guide</button>
    </nav>
    <div id="sheet"></div>
  `;

  document.getElementById("btn-menu")!.addEventListener("click", openSheet);
  document.querySelectorAll<HTMLElement>("nav.tabs button").forEach((b) => {
    b.addEventListener("click", () => {
      location.hash = b.dataset.href!;
    });
  });

  void db.getAllRocks().then((rocks) => {
    const sub = document.getElementById("header-sub");
    if (sub) sub.textContent = `${rocks.length} rock${rocks.length === 1 ? "" : "s"} · ${ROCK_COUNT} in guide`;
  });
}

// ---------- router ----------
function parseHash(): { view: string; params: string[]; query: URLSearchParams } {
  const raw = location.hash.replace(/^#\/?/, "");
  const [pathPart, queryPart] = raw.split("?");
  const parts = pathPart.split("/").filter(Boolean);
  return { view: parts[0] || "journal", params: parts.slice(1), query: new URLSearchParams(queryPart ?? "") };
}

function route(): void {
  const { view, params, query } = parseHash();
  const main = document.getElementById("main")!;
  main.innerHTML = "";

  let el: HTMLElement;
  let mount: ((root: HTMLElement) => void) | undefined;

  switch (view) {
    case "journal": {
      el = renderJournal();
      break;
    }
    case "add": {
      const id = params[0];
      const typeId = query.get("type") ?? undefined;
      el = renderAdd(id ? { id } : typeId ? { typeId } : {});
      break;
    }
    case "rock": {
      el = params[0] ? renderDetail(params[0]) : renderJournal();
      break;
    }
    case "identify": {
      const rockId = params[0];
      el = renderIdentify();
      mount = (root) => mountIdentify(root, rockId);
      break;
    }
    case "guide": {
      el = renderGuide();
      mount = mountGuide;
      break;
    }
    case "spec": {
      el = params[0] ? renderSpec(params[0]) : renderGuide();
      break;
    }
    default: {
      el = renderJournal();
    }
  }

  main.appendChild(el);
  mount?.(el);
  setActiveTab(view);

  // scroll to top on navigation
  window.scrollTo({ top: 0 });
}

function setActiveTab(view: string): void {
  const tab = view === "add" || view === "rock" ? "journal" : view;
  document.querySelectorAll<HTMLElement>("nav.tabs button").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });
}

// ---------- delegated actions ----------
document.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;
  const el = target.closest("[data-action]") as HTMLElement | null;
  if (!el) return;
  const action = el.dataset.action;
  if (action === "nav") {
    location.hash = el.dataset.href!;
  } else if (action === "confirm-type") {
    void confirmType(el.dataset.id!);
  } else if (action === "delete-rock") {
    void deleteRock(el.dataset.id!);
  }
});

window.addEventListener("hashchange", route);

// ---------- menu sheet (backup / about) ----------
function openSheet(): void {
  const sheet = document.getElementById("sheet")!;
  sheet.innerHTML = `
    <div class="sheet-backdrop" id="sheet-backdrop"></div>
    <div class="sheet">
      <h3 style="color:var(--text)">RockLogger</h3>
      <p class="muted small">v0.1.0 · ${ROCK_COUNT} rocks & minerals in the field guide</p>
      <button class="btn small secondary" id="btn-export">📦 Export backup (JSON)</button>
      <button class="btn small secondary" id="btn-import">📥 Import backup</button>
      <input type="file" id="import-input" accept="application/json" style="display:none" />
      <div class="divider"></div>
      <p class="muted small">Photos are stored on this device (IndexedDB). Export regularly to back them up. Nothing is uploaded anywhere.</p>
      <button class="btn small danger" id="btn-close-sheet">Close</button>
    </div>
  `;
  sheet.style.display = "block";

  const close = () => {
    sheet.style.display = "none";
    sheet.innerHTML = "";
  };
  document.getElementById("sheet-backdrop")!.addEventListener("click", close);
  document.getElementById("btn-close-sheet")!.addEventListener("click", close);

  document.getElementById("btn-export")!.addEventListener("click", async () => {
    const rocks = await db.exportAll();
    const stamp = new Date().toISOString().slice(0, 10);
    downloadJson(
      { app: "rocklogger", version: 1, exportedAt: new Date().toISOString(), rocks },
      `rocklogger-backup-${stamp}.json`
    );
    toast(`Exported ${rocks.length} rocks`);
  });

  document.getElementById("btn-import")!.addEventListener("click", () => {
    const input = document.getElementById("import-input") as HTMLInputElement;
    input.value = "";
    input.click();
  });

  document.getElementById("import-input")!.addEventListener("change", async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const data = (await readJsonFile(file)) as { rocks?: unknown[]; version?: number };
      const rocks = Array.isArray(data)
        ? (data as unknown[])
        : Array.isArray(data?.rocks)
          ? data.rocks
          : null;
      if (!rocks) throw new Error("bad format");
      const count = await db.importAll(rocks as Parameters<typeof db.importAll>[0]);
      toast(`Imported ${count} rocks`);
      close();
      route();
    } catch {
      toast("That file doesn't look like a RockLogger backup");
    }
  });
}

// ---------- boot ----------
shell();
route();

// service worker (production only)
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register("./sw.js").catch(() => {
    /* offline caching is best-effort */
  });
}
