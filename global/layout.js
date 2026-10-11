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

  // sous-menus (mobile) : déroulement animé ; .open garde le sous-menu affiché pendant la fermeture
  document.querySelectorAll(".dropdown-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const dropdown = button.parentElement;
      const menu = dropdown.querySelector(".dropdown-menu");
      const show = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", show);

      if (!menu || reducedMotion()) {
        dropdown.classList.toggle("open", show);
        return;
      }
      const from = dropdown.classList.contains("open") ? menu.getBoundingClientRect().height : 0;
      menu._anim?.cancel();
      if (show) {
        dropdown.classList.add("open");
        const natural = menu.getBoundingClientRect().height;
        animateHeight(menu, from, natural, { natural, fade: true });
      } else {
        const natural = menu.scrollHeight;
        animateHeight(menu, from, 0, { natural, fade: true, done: () => dropdown.classList.remove("open") });
      }
    });
  });
}

const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Anime la hauteur d'un élément de `from` à `to` (px), puis rend la main au CSS. */
function animateHeight(el, from, to, { natural = Math.max(from, to), fade = false, done } = {}) {
  el._anim?.cancel();
  el.style.overflow = "hidden";
  const keyframes = { height: [`${from}px`, `${to}px`] };
  if (fade && natural) keyframes.opacity = [from / natural, to / natural];
  const anim = el.animate(keyframes, {
    duration: to > from ? 300 : 250,
    easing: "cubic-bezier(0.4, 0, 0.2, 1)",
    fill: "forwards",
  });
  el._anim = anim;
  anim.onfinish = () => {
    if (el._anim !== anim) return;
    el._anim = null;
    done?.();
    anim.cancel();
    el.style.overflow = "";
  };
}

/** Menus déroulants de contenu (<details class="accordion">) : ouverture et fermeture animées.
    Délégation d'évènement : fonctionne aussi si la page est modifiée après coup (traduction). */
document.addEventListener("click", (event) => {
  const summary = event.target.closest("details.accordion > summary");
  if (!summary || reducedMotion()) return;
  event.preventDefault();

  const details = summary.parentElement;
  const chrome = ["paddingTop", "paddingBottom", "borderTopWidth", "borderBottomWidth"]
    .reduce((sum, key) => sum + parseFloat(getComputedStyle(details)[key]), 0);
  const collapsed = summary.getBoundingClientRect().height + chrome;
  const from = details.getBoundingClientRect().height;
  const closing = details.open && !details.classList.contains("is-closing");

  details._anim?.cancel();
  if (closing) {
    details.classList.add("is-closing");
    animateHeight(details, from, collapsed, {
      done: () => {
        details.open = false;
        details.classList.remove("is-closing");
      },
    });
  } else {
    details.classList.remove("is-closing");
    details.open = true;
    const natural = details.getBoundingClientRect().height;
    animateHeight(details, from, natural);
  }
});

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