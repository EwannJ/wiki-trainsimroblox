/**
 * Injecte la topbar et le footer communs dans chaque page, puis démarre la traduction.
 */
(async () => {
  // Détection immédiate de la langue pour éviter le clignotement (anti-FOUT)
  const params = new URLSearchParams(window.location.search);
  const urlLang = params.get('lang');
  const savedLang = localStorage.getItem('tsr-manual-language');
  const target = (urlLang || savedLang || '').toUpperCase();

  if (target && target !== 'FR' && target !== 'FR-FR') {
    document.documentElement.classList.add('translation-pending');
  }

  const parts = [
    ["site-topbar", "/__global__/topbar.html"],
    ["site-footer", "/__global__/footer.html"],
  ];

  await Promise.all(
    parts.map(async ([id, url]) => {
      const host = document.getElementById(id);
      if (!host) return;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.status);
        host.innerHTML = await res.text();
      } catch (err) {
        console.error(`Impossible de charger ${url}`, err);
      }
    })
  );

  initMenus();
  markActiveLink();

  try {
    const { initTranslation } = await import("/__global__/translate.js");
    await initTranslation();
  } catch (err) {
    console.error("Traduction indisponible", err);
    document.documentElement.classList.remove("translation-pending");
  }
})();

function initMenus() {
  const menuToggle = document.querySelector(".menu-toggle");
  const nav = document.getElementById("nav");
  if (menuToggle && nav) {
    menuToggle.addEventListener("click", () => {
      menuToggle.setAttribute("aria-expanded", nav.classList.toggle("open"));
    });
  }

  document.querySelectorAll(".dropdown-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      button.setAttribute("aria-expanded", button.parentElement.classList.toggle("open"));
    });
  });
}

/** Surligne le lien du menu correspondant à la page (seulement si un seul lien correspond). */
function markActiveLink() {
  const clean = (p) => p.replace(/index\.html$/, "").replace(/\/+$/, "") || "/";
  const here = clean(location.pathname);
  const matches = [...document.querySelectorAll(".nav > .nav-link, .nav > .dropdown > .nav-link")].filter(
    (a) => !a.target && clean(new URL(a.href, location.origin).pathname) === here
  );
  if (matches.length === 1) matches[0].classList.add("active");
}