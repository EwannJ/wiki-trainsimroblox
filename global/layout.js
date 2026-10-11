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
        const html = (await res.text())
          .replace("%%LANG_CODE%%", "FR")
          .replace("%%LANG_OPTIONS%%", '<button type="button" class="lang-option" data-lang="FR" data-search="fr français french" role="option" aria-selected="true"><b>FR</b><span>Français</span></button>');
        // le conteneur est remplacé, comme le fait api/translate.py
        host.outerHTML = html;
      } catch (err) {
        console.error(`Impossible de charger ${url}`, err);
      }
    })
  );

  initMenus();
  markActiveLink();
  initLightbox();
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

/** Surligne l'entrée du menu de la page ou de sa rubrique (seulement si une seule entrée correspond). */
function markActiveLink() {
  const clean = (p) => p.replace(/index\.html$/, "").replace(/\/+$/, "") || "/";
  const pathOf = (a) => clean(new URL(a.href, location.origin).pathname);
  const here = clean(location.pathname);
  const isInternal = (a) => !a.target;

  document.querySelectorAll(".dropdown-menu a").forEach((a) => {
    if (isInternal(a) && pathOf(a) === here) a.setAttribute("aria-current", "page");
  });

  const links = [...document.querySelectorAll(".nav > .nav-link, .nav > .dropdown > .nav-link")].filter(isInternal);
  let matches = links.filter((a) => pathOf(a) === here);
  // sous-page (ex. /nos-trains/bb60000) : on surligne sa rubrique
  if (!matches.length) matches = links.filter((a) => pathOf(a) !== "/" && here.startsWith(pathOf(a) + "/"));
  if (matches.length === 1) matches[0].classList.add("active");
}

/** Les images dans un élément .zoom s'ouvrent en grand au clic (ou avec Entrée au clavier). */
function initLightbox() {
  const images = document.querySelectorAll(".zoom img");
  if (!images.length) return;

  const dialog = document.createElement("dialog");
  dialog.className = "lightbox";
  const full = document.createElement("img");
  full.alt = "";
  dialog.append(full);
  document.body.append(dialog);
  dialog.addEventListener("click", () => dialog.close());

  const open = (img) => {
    full.src = img.currentSrc || img.src;
    full.alt = img.alt;
    dialog.showModal();
  };
  images.forEach((img) => {
    img.tabIndex = 0;
    img.addEventListener("click", () => open(img));
    img.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open(img);
      }
    });
  });
}
