// La traduction est faite par api/translate.py avant l'envoi de la page : ici il ne reste que le menu de langues.
export function initTranslation() {
  const lang = document.querySelector(".lang");
  if (!lang) return;
  const toggle = lang.querySelector(".lang-toggle");
  const search = lang.querySelector(".lang-search");
  const list = lang.querySelector(".lang-list");
  if (!toggle || !search || !list) return;

  toggle.addEventListener("click", () => {
    const open = lang.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
    if (open) search.focus();
  });
  document.addEventListener("click", (event) => {
    if (!lang.contains(event.target)) {
      lang.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
  search.addEventListener("input", () => filterLanguages(list, search.value));
  search.addEventListener("search", () => filterLanguages(list, search.value));

  // Choix de langue : on le retient (cookie lu par le serveur) et on recharge la page, déjà traduite
  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-lang]");
    if (!button) return;
    const code = button.dataset.lang.toLowerCase();
    document.cookie = `lang=${code}; path=/; max-age=31536000; SameSite=Lax`;
    const url = new URL(location.href);
    url.searchParams.set("lang", code);
    location.assign(url);
  });
}

function filterLanguages(list, rawQuery) {
  const query = rawQuery.trim().toLowerCase();
  const options = list.querySelectorAll(".lang-option");

  options.forEach((button) => {
    const matches = (button.dataset.search || "").includes(query);
    button.style.display = matches ? "" : "none";
    button.hidden = !matches;
  });

  const hasResults = [...options].some((button) => !button.hidden);
  let empty = list.querySelector(".lang-empty");

  if (!hasResults) {
    if (!empty) {
      empty = document.createElement("div");
      empty.className = "lang-empty";
      list.append(empty);
    }
    empty.textContent = "No founded language";
  } else if (empty) {
    empty.remove();
  }
}
