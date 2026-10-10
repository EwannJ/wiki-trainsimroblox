// Normalement le haut de page, le pied de page et le menu de langues sont déjà dans le HTML envoyé par api/translate.py.
// Si la page est servie sans l'API (serveur statique local, par exemple), on les charge ici, en français.
(async () => {
  const parts = [
    ["site-topbar", "/global/topbar.html"],
    ["site-footer", "/global/footer.html"],
  ];

  await Promise.all(
    parts.map(async ([id, url]) => {
      const host = document.getElementById(id);
      if (!host) return;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.status);
        host.innerHTML = (await res.text())
          .replace("%%LANG_CODE%%", "FR")
          .replace("%%LANG_OPTIONS%%", '<button type="button" class="lang-option" data-lang="FR" data-search="fr français french" role="option" aria-selected="true"><b>FR</b><span>Français</span></button>');
      } catch (err) {
        console.error(`Impossible de charger ${url}`, err);
      }
    })
  );

  initMenus();
  markActiveLink();
  try {
    const { initTranslation } = await import("/global/translate.js");
    initTranslation();
  } catch (err) {
    console.error("Menu de langues indisponible", err);
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