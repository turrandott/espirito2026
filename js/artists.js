(function () {
  "use strict";

  const SHEET_ID = "1u5imLmlr7mBY9rMV1bsORS9ZjWG_KGBeJRkhRNtv-sA";
  const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&headers=1`;

  const CARD_CLASSES =
    "reveal bg-panel/40 border-faint hover:border-orange/40 hover:bg-panel/70 flex flex-col rounded border overflow-hidden transition-all duration-500";
  const DELAY_CLASSES = ["", "reveal--delay-1", "reveal--delay-2", "reveal--delay-3"];

  function extractDriveFileId(url) {
    if (typeof url !== "string") return null;
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }

  function buildImageUrl(driveUrl) {
    const id = extractDriveFileId(driveUrl);
    return id ? `https://lh3.googleusercontent.com/d/${id}=w800` : null;
  }

  function parseGvizResponse(text) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("Malformed gviz response");
    return JSON.parse(text.substring(start, end + 1));
  }

  function extractRows(parsed) {
    const rows = (parsed && parsed.table && parsed.table.rows) || [];
    const out = [];
    for (const row of rows) {
      const cells = row.c || [];
      const name = cells[0] && cells[0].v ? String(cells[0].v).trim() : "";
      const bio = cells[1] && cells[1].v ? String(cells[1].v).trim() : "";
      const photoUrl = cells[2] && cells[2].v ? buildImageUrl(cells[2].v) : null;
      if (!name || !photoUrl) continue;
      out.push({ name, bio, photoUrl });
    }
    return out;
  }

  function createCard(artist, index) {
    const card = document.createElement("div");
    const delay = DELAY_CLASSES[index % DELAY_CLASSES.length];
    card.className = delay ? `${CARD_CLASSES} ${delay}` : CARD_CLASSES;

    const imgWrap = document.createElement("div");
    imgWrap.className = "aspect-[4/3] bg-bg-warm overflow-hidden";

    const img = document.createElement("img");
    img.src = artist.photoUrl;
    img.alt = artist.name;
    img.loading = "lazy";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    img.className = "w-full h-full object-cover";
    img.onerror = function () {
      imgWrap.style.display = "none";
    };
    imgWrap.appendChild(img);

    const text = document.createElement("div");
    text.className = "flex flex-col gap-1 p-5";

    const nameEl = document.createElement("span");
    nameEl.className = "font-caps text-orange tracking-mid text-[0.92rem] uppercase";
    nameEl.textContent = artist.name;

    const bioEl = document.createElement("span");
    bioEl.className = "font-display text-cream text-[1.15rem] italic";
    bioEl.textContent = artist.bio;

    text.appendChild(nameEl);
    text.appendChild(bioEl);
    card.appendChild(imgWrap);
    card.appendChild(text);
    return card;
  }

  function renderArtists(rows, grid) {
    const frag = document.createDocumentFragment();
    const cards = rows.map((artist, i) => {
      const card = createCard(artist, i);
      frag.appendChild(card);
      return card;
    });
    grid.replaceChildren(frag);
    // The reveal observer in main.js captured its element list before our fetch
    // resolved, so it won't pick these up. Trigger the fade-in ourselves.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        cards.forEach((c) => c.classList.add("is-visible"));
      });
    });
  }

  function hideSection(grid, heading) {
    if (grid) grid.style.display = "none";
    if (heading) heading.style.display = "none";
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const grid = document.querySelector("[data-polifonia-grid]");
    const heading = document.querySelector("[data-polifonia-heading]");
    if (!grid) return;
    try {
      const res = await fetch(GVIZ_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = extractRows(parseGvizResponse(await res.text()));
      if (rows.length === 0) {
        hideSection(grid, heading);
        return;
      }
      renderArtists(rows, grid);
    } catch (err) {
      console.warn("[artists] fetch failed:", err);
      hideSection(grid, heading);
    }
  });
})();
