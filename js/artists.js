(function () {
  "use strict";

  const LANG = (document.documentElement.lang || "it").toLowerCase().startsWith("en") ? "en" : "it";
  const T = {
    it: { discover: "scopri", openCard: "apri scheda", close: "Chiudi" },
    en: { discover: "discover", openCard: "open profile", close: "Close" },
  }[LANG];

  const SHEET_ID = "1u5imLmlr7mBY9rMV1bsORS9ZjWG_KGBeJRkhRNtv-sA";
  const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&headers=1`;

  const CARD_CLASSES =
    "group reveal bg-panel/40 border-faint hover:border-orange/60 hover:bg-panel/70 flex flex-col rounded border overflow-hidden transition-all duration-500 cursor-pointer focus-visible:outline-none focus-visible:border-orange focus-visible:ring-2 focus-visible:ring-orange/40";
  const DELAY_CLASSES = ["", "reveal--delay-1", "reveal--delay-2", "reveal--delay-3"];

  function extractDriveFileId(url) {
    if (typeof url !== "string") return null;
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }

  function buildImageUrl(driveUrl, size = "w800") {
    const id = extractDriveFileId(driveUrl);
    return id ? `https://lh3.googleusercontent.com/d/${id}=${size}` : null;
  }

  function cellText(cells, idx) {
    return cells[idx] && cells[idx].v ? String(cells[idx].v).trim() : "";
  }

  function cellPhoto(cells, idx, size) {
    return cells[idx] && cells[idx].v ? buildImageUrl(cells[idx].v, size) : null;
  }

  function parseGvizResponse(text) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("Malformed gviz response");
    return JSON.parse(text.substring(start, end + 1));
  }

  function localText(cells, itIdx, enIdx) {
    return LANG === "en"
      ? cellText(cells, enIdx) || cellText(cells, itIdx)
      : cellText(cells, itIdx);
  }

  function cleanLinks(raw) {
    return raw
      .split(/[\s,]+/)
      .map((s) => s.replace(/^[\s,.]+|[\s,.]+$/g, ""))
      .filter((s) => /^https?:\/\//i.test(s));
  }

  function extractRows(parsed) {
    const rows = (parsed && parsed.table && parsed.table.rows) || [];
    const out = [];
    for (const row of rows) {
      const cells = row.c || [];
      const name = cellText(cells, 0);
      const photoUrl = cellPhoto(cells, 3);
      if (!name || !photoUrl) continue;
      out.push({
        name,
        bio: localText(cells, 1, 2),
        photoUrl,
        photoUrlLarge: cellPhoto(cells, 3, "w1400"),
        text1: localText(cells, 4, 5),
        photo2Url: cellPhoto(cells, 6, "w1400"),
        text2: localText(cells, 7, 8),
        photo3Url: cellPhoto(cells, 9, "w1400"),
        text3: localText(cells, 10, 11),
        links: cleanLinks(cellText(cells, 12)),
      });
    }
    return out;
  }

  function createCard(artist, index) {
    const card = document.createElement("div");
    const delay = DELAY_CLASSES[index % DELAY_CLASSES.length];
    card.className = delay ? `${CARD_CLASSES} ${delay}` : CARD_CLASSES;
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `${artist.name} — ${T.openCard}`);

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
    text.className = "flex flex-col grow gap-1 p-5";

    const nameEl = document.createElement("span");
    nameEl.className = "font-caps text-orange tracking-mid text-[0.92rem] uppercase";
    nameEl.textContent = artist.name;

    const bioEl = document.createElement("span");
    bioEl.className = "font-display text-cream text-[1.15rem] italic";
    bioEl.textContent = artist.bio;

    const more = document.createElement("span");
    more.className =
      "font-caps text-orange/70 tracking-mid text-[0.72rem] uppercase mt-auto pt-3 inline-flex items-center gap-2 transition-colors duration-300 group-hover:text-orange group-focus-visible:text-orange";
    const moreLabel = document.createElement("span");
    moreLabel.textContent = T.discover;
    const moreArrow = document.createElement("span");
    moreArrow.setAttribute("aria-hidden", "true");
    moreArrow.className =
      "inline-block transition-transform duration-300 group-hover:translate-x-1 group-focus-visible:translate-x-1";
    moreArrow.textContent = "→";
    more.appendChild(moreLabel);
    more.appendChild(moreArrow);

    text.appendChild(nameEl);
    text.appendChild(bioEl);
    text.appendChild(more);
    card.appendChild(imgWrap);
    card.appendChild(text);

    const open = () => openArtistModal(artist, card);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });

    return card;
  }

  /* ---------- Modal ---------- */

  let modalRoot = null;
  let modalBody = null;
  let modalCloseBtn = null;
  let lastFocusedEl = null;

  function ensureModalRoot() {
    if (modalRoot) return modalRoot;

    modalRoot = document.createElement("div");
    modalRoot.className = "artist-modal";
    modalRoot.setAttribute("aria-hidden", "true");
    modalRoot.setAttribute("data-artist-modal", "");

    const backdrop = document.createElement("div");
    backdrop.className = "artist-modal__backdrop";
    backdrop.setAttribute("data-modal-close", "");

    const panel = document.createElement("div");
    panel.className = "artist-modal__panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "artist-modal-name");
    panel.setAttribute("tabindex", "-1");

    modalCloseBtn = document.createElement("button");
    modalCloseBtn.type = "button";
    modalCloseBtn.className = "artist-modal__close";
    modalCloseBtn.setAttribute("data-modal-close", "");
    modalCloseBtn.setAttribute("aria-label", T.close);
    modalCloseBtn.textContent = "×";

    modalBody = document.createElement("div");
    modalBody.className = "artist-modal__body";

    panel.appendChild(modalCloseBtn);
    panel.appendChild(modalBody);
    modalRoot.appendChild(backdrop);
    modalRoot.appendChild(panel);
    document.body.appendChild(modalRoot);

    modalRoot.addEventListener("click", (e) => {
      const target = e.target;
      if (target instanceof Element && target.closest("[data-modal-close]")) {
        closeArtistModal();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modalRoot.classList.contains("is-open")) {
        closeArtistModal();
      }
    });

    return modalRoot;
  }

  function appendSection(frag, photoUrl, text, altLabel) {
    if (!photoUrl && !text) return;
    const section = document.createElement("div");
    section.className = "artist-modal__section";
    if (photoUrl) {
      const img = document.createElement("img");
      img.src = photoUrl;
      img.alt = altLabel || "";
      img.loading = "lazy";
      img.decoding = "async";
      img.referrerPolicy = "no-referrer";
      img.onerror = () => img.remove();
      section.appendChild(img);
    }
    if (text) {
      const p = document.createElement("p");
      p.className = "artist-modal__text";
      p.textContent = text;
      section.appendChild(p);
    }
    frag.appendChild(section);
  }

  function buildModalContent(artist) {
    const frag = document.createDocumentFragment();

    const heroUrl = artist.photoUrlLarge || artist.photoUrl;
    if (heroUrl) {
      const hero = document.createElement("div");
      hero.className = "artist-modal__hero";
      const img = document.createElement("img");
      img.src = heroUrl;
      img.alt = artist.name;
      img.loading = "lazy";
      img.decoding = "async";
      img.referrerPolicy = "no-referrer";
      img.onerror = () => hero.remove();
      hero.appendChild(img);
      frag.appendChild(hero);
    }

    const heading = document.createElement("div");
    heading.className = "artist-modal__heading";
    const nameEl = document.createElement("h3");
    nameEl.id = "artist-modal-name";
    nameEl.className = "artist-modal__name";
    nameEl.textContent = artist.name;
    heading.appendChild(nameEl);
    if (artist.bio) {
      const bioEl = document.createElement("p");
      bioEl.className = "artist-modal__bio";
      bioEl.textContent = artist.bio;
      heading.appendChild(bioEl);
    }
    frag.appendChild(heading);

    if (artist.text1) {
      const p = document.createElement("p");
      p.className = "artist-modal__text";
      p.textContent = artist.text1;
      frag.appendChild(p);
    }

    appendSection(frag, artist.photo2Url, artist.text2, artist.name);
    appendSection(frag, artist.photo3Url, artist.text3, artist.name);

    if (artist.links.length) {
      const linksWrap = document.createElement("div");
      linksWrap.className = "artist-modal__links";
      for (const url of artist.links) {
        const a = document.createElement("a");
        a.className = "artist-modal__link";
        a.href = url;
        a.textContent = url;
        a.target = "_blank";
        a.rel = "noopener";
        linksWrap.appendChild(a);
      }
      frag.appendChild(linksWrap);
    }

    return frag;
  }

  function openArtistModal(artist, originEl) {
    ensureModalRoot();
    modalBody.replaceChildren(buildModalContent(artist));
    const panel = modalRoot.querySelector(".artist-modal__panel");
    if (panel) panel.scrollTop = 0;
    modalRoot.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => {
      modalRoot.classList.add("is-open");
    });
    document.body.classList.add("modal-open");
    lastFocusedEl = originEl || document.activeElement;
    modalCloseBtn.focus();
  }

  function closeArtistModal() {
    if (!modalRoot) return;
    modalRoot.classList.remove("is-open");
    modalRoot.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    if (lastFocusedEl && typeof lastFocusedEl.focus === "function") {
      lastFocusedEl.focus();
    }
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
