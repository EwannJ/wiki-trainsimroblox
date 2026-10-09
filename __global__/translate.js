const ORIGINAL_TEXT = new WeakMap();
const ORIGINAL_ATTRS = new WeakMap();
let activeLanguage = "FR";
let languageNames = new Map([["FR", "Français"]]);
let targetLanguages = [];
let manuallyChosen = false;

const LANG_ALIASES = {
  "EN": "EN-US", "EN-GB": "EN-GB", "EN-US": "EN-US",
  "PT": "PT-PT", "PT-BR": "PT-BR", "ZH": "ZH-HANS",
  "ZH-CN": "ZH-HANS", "ZH-SG": "ZH-HANS", "ZH-TW": "ZH-HANT",
  "ZH-HK": "ZH-HANT", "ZH-MO": "ZH-HANT", "NO": "NB", "NN": "NB"
};

function normalizeLanguage(raw) {
  if (!raw) return "";
  const value = raw.trim().toUpperCase();
  if (value === "FR" || value === "FR-FR") return "FR";
  return LANG_ALIASES[value] || value;
}

function languageFromBrowser() {
  const prefs = [...(navigator.languages || []), navigator.language || ""];
  for (const preference of prefs) {
    const normalized = normalizeLanguage(preference);
    if (normalized === "FR") return "FR";
    const base = normalized.split("-")[0];
    const found = targetLanguages.find((item) => {
      const code = item.language.toUpperCase();
      return code === normalized || code === base;
    });
    if (found) return found.language.toUpperCase();
  }
  return "FR";
}

function languageFromUrl() {
  const params = new URLSearchParams(location.search);
  return params.has("lang") ? normalizeLanguage(params.get("lang")) : "";
}

function setUrlLanguage(code, replace = false) {
  const url = new URL(location.href);
  if (normalizeLanguage(code) === "FR") url.searchParams.delete("lang");
  else url.searchParams.set("lang", code.toLowerCase());
  const state = { ...(history.state || {}), lang: normalizeLanguage(code) || "FR" };
  if (replace) history.replaceState(state, "", url);
  else history.pushState(state, "", url);
}

export async function initTranslation() {
  const lang = document.querySelector(".lang");
  if (!lang) return;
  const toggle = lang.querySelector(".lang-toggle");
  const search = lang.querySelector(".lang-search");
  const list = lang.querySelector(".lang-list");
  if (!toggle || !search || !list) return;

  // Un seul gestionnaire d'ouverture
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

  try {
    const response = await fetch("/api/deepl-languages");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    targetLanguages = Array.isArray(data.languages) ? data.languages : [];
    for (const item of targetLanguages) languageNames.set(item.language.toUpperCase(), item.name);
    renderLanguages(list, targetLanguages);
  } catch (error) {
    console.error("Impossible de charger les langues DeepL", error);
    list.innerHTML = '<div class="lang-empty">Langues indisponibles. Vérifie la configuration DeepL sur Vercel.</div>';
    // Le français reste disponible même si DeepL ne répond pas.
    renderLanguages(list, []);
  }

  const queryLanguage = languageFromUrl();
  const savedLanguage = localStorage.getItem("tsr-manual-language");
  const initialLanguage = queryLanguage || (savedLanguage ? normalizeLanguage(savedLanguage) : languageFromBrowser());
  manuallyChosen = Boolean(queryLanguage || savedLanguage);
  const supported = initialLanguage === "FR" || targetLanguages.some((item) => item.language.toUpperCase() === initialLanguage);
  const selected = supported ? initialLanguage : "FR";
  setUrlLanguage(selected, true);
  await applyLanguage(selected, toggle, list, false);
  document.documentElement.classList.remove("translation-pending");

  // Garder la langue sur les liens internes et la réappliquer sur retour/précédent.
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || link.target === "_blank" || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const destination = new URL(link.href, location.href);
    if (destination.origin !== location.origin || destination.pathname.startsWith("/api/")) return;
    const explicit = destination.searchParams.get("lang");
    if (explicit) return;
    if (activeLanguage === "FR") destination.searchParams.delete("lang");
    else destination.searchParams.set("lang", activeLanguage.toLowerCase());
    link.href = destination.pathname + destination.search + destination.hash;
  });
  window.addEventListener("popstate", async () => {
    const requested = languageFromUrl() || (manuallyChosen ? normalizeLanguage(localStorage.getItem("tsr-manual-language") || "FR") : languageFromBrowser());
    await applyLanguage(requested, toggle, list, false);
  });
}

function renderLanguages(list, languages) {
  list.innerHTML = "";
  
  // Tri alphabétique des langues cibles selon leur nom
  const sortedLanguages = [...languages].sort((a, b) => 
    a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
  );

  // Le français reste la première langue de la liste
  const all = [{language: "FR", name: "Français"}, ...sortedLanguages];

  for (const item of all) {
    const code = item.language.toUpperCase();
    if (code === "EN" && languageNames.has("EN-US")) continue;
    if (list.querySelector(`[data-lang="${CSS.escape(code)}"]`)) continue;
    
    const button = document.createElement("button");
    button.type = "button";
    button.className = "lang-option";
    button.dataset.lang = code;
    // On stocke le code ET le nom pour la recherche
    button.dataset.search = `${code} ${item.name}`.toLowerCase();
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(code === activeLanguage));
    
    const short = document.createElement("b");
    short.textContent = code;
    const name = document.createElement("span");
    name.textContent = item.name;
    
    button.append(short, name);
    list.append(button);
  }

  // Appliquer le filtre si du texte est déjà présent dans la barre de recherche
  const searchInput = document.querySelector(".lang-search");
  if (searchInput && searchInput.value) {
    filterLanguages(list, searchInput.value);
  }

  if (list.dataset.languageClickBound === "true") return;
  list.dataset.languageClickBound = "true";
  list.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-lang]");
    if (!button) return;
    const target = button.dataset.lang;
    manuallyChosen = true;
    localStorage.setItem("tsr-manual-language", target);
    const toggle = document.querySelector(".lang-toggle");
    await applyLanguage(target, toggle, list, true);
    const wrapper = document.querySelector(".lang");
    wrapper?.classList.remove("open");
    toggle?.setAttribute("aria-expanded", "false");
  });
}

function filterLanguages(list, rawQuery) {
  const query = rawQuery.trim().toLowerCase();
  const options = list.querySelectorAll(".lang-option");
  
  options.forEach((button) => {
    const searchData = button.dataset.search || "";
    // Masquer ou afficher le bouton selon la recherche
    const matches = searchData.includes(query);
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
    empty.textContent = "Aucune langue trouvée.";
  } else if (empty) {
    empty.remove();
  }
}

function collectTranslatable() {
  const textNodes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent || parent.closest('script,style,noscript,code,pre,kbd,[translate="no"],.notranslate,.lang,[data-no-translate]')) return NodeFilter.FILTER_REJECT;
      if (!ORIGINAL_TEXT.has(node)) ORIGINAL_TEXT.set(node, node.nodeValue);
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  const attrs = [];
  document.querySelectorAll("title,[placeholder],[aria-label],[title],img[alt],input[value]").forEach((el) => {
    if (el.closest('.lang,[translate="no"],.notranslate,[data-no-translate]')) return;
    for (const attr of ["placeholder", "aria-label", "title", "alt", "value"]) {
      if (!el.hasAttribute(attr)) continue;
      let saved = ORIGINAL_ATTRS.get(el);
      if (!saved) { saved = {}; ORIGINAL_ATTRS.set(el, saved); }
      if (!(attr in saved)) saved[attr] = el.getAttribute(attr);
      if (saved[attr] && /[^\W\d_]/u.test(saved[attr])) attrs.push({el, attr, value: saved[attr]});
    }
  });
  const title = document.querySelector("title");
  if (title) {
    let saved = ORIGINAL_ATTRS.get(title);
    if (!saved) { saved = {}; ORIGINAL_ATTRS.set(title, saved); }
    if (!("textContent" in saved)) saved.textContent = title.textContent;
    attrs.push({el: title, attr: "textContent", value: saved.textContent});
  }
  return {textNodes, attrs};
}

async function applyLanguage(target, toggle, list, updateUrl) {
  target = normalizeLanguage(target) || "FR";
  const supported = target === "FR" || targetLanguages.some((item) => item.language.toUpperCase() === target);
  if (!supported) target = "FR";
  const oldLabel = toggle?.textContent || "FR";
  if (toggle) { toggle.textContent = "…"; toggle.disabled = true; }
  let toast = document.querySelector(".translate-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "translate-toast";
    toast.setAttribute("role", "status");
    document.body.append(toast);
  }
  try {
    const {textNodes, attrs} = collectTranslatable();
    const values = [...textNodes.map((node) => ORIGINAL_TEXT.get(node)), ...attrs.map((x) => x.value)];
    let translated = values;
    if (target !== "FR" && values.length) {
      translated = [];
      for (let i = 0; i < values.length; i += 50) {
        const response = await fetch("/api/deepl-translate", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({texts: values.slice(i, i + 50), target_lang: target})
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${response.status}`);
        }
        const result = await response.json();
        translated.push(...result.translations);
      }
    }
    textNodes.forEach((node, i) => { node.nodeValue = translated[i] ?? ORIGINAL_TEXT.get(node); });
    attrs.forEach((item, i) => {
      const value = translated[textNodes.length + i] ?? item.value;
      if (item.attr === "textContent") item.el.textContent = value;
      else item.el.setAttribute(item.attr, value);
    });
    activeLanguage = target;
    if (toggle) toggle.textContent = target === "FR" ? "FR" : target;
    list?.querySelectorAll("[data-lang]").forEach((button) => button.setAttribute("aria-selected", String(button.dataset.lang === target)));
    document.documentElement.lang = target.toLowerCase();
    if (updateUrl) setUrlLanguage(target);
    toast.textContent = `Langue : ${languageNames.get(target) || target}`;
  } catch (error) {
    console.error("Erreur de traduction DeepL", error);
    toast.textContent = "Traduction impossible. Vérifie la clé API DeepL sur Vercel.";
    if (toggle) toggle.textContent = oldLabel === "…" ? "FR" : oldLabel;
  } finally {
    if (toggle) toggle.disabled = false;
    document.documentElement.classList.remove("translation-pending");
    setTimeout(() => toast.remove(), 2500);
  }
}