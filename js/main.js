(function () {
  "use strict";

  /* ---------- Nav: scroll state + mobile toggle ---------- */
  const nav = document.getElementById("nav");
  const navToggle = document.getElementById("navToggle");
  const navMenu = document.getElementById("navMenu");

  const onScroll = () => {
    if (window.scrollY > 24) nav.classList.add("is-scrolled");
    else nav.classList.remove("is-scrolled");
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  if (navToggle && navMenu) {
    const setOpen = (open) => {
      nav.classList.toggle("is-open", open);
      document.body.classList.toggle("menu-open", open);
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      navToggle.setAttribute("aria-label", open ? "Chiudi menu" : "Apri menu");
    };
    navToggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
    navMenu.addEventListener("click", (e) => {
      if (e.target.tagName === "A") setOpen(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("is-open")) setOpen(false);
    });
  }

  /* ---------- Scroll reveal via IntersectionObserver ---------- */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach((el) => io.observe(el));
    // Safety net: if printing or static render fails to trigger the observer,
    // reveal everything after a short delay so content is never permanently hidden.
    setTimeout(() => {
      reveals.forEach((el) => {
        if (!el.classList.contains("is-visible")) el.classList.add("is-visible");
      });
    }, 1200);
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  // Force-show on print so PDF/print rendering never hides content.
  if (window.matchMedia) {
    const mqPrint = window.matchMedia("print");
    const showAll = () => reveals.forEach((el) => el.classList.add("is-visible"));
    if (mqPrint.matches) showAll();
    window.addEventListener("beforeprint", showAll);
  }

  /* ---------- Update copyright year if year ever rolls over ---------- */
  // (kept static at 2026 by request)
})();
