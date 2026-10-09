const ORIGINAL_TEXT = new WeakMap();
const ORIGINAL_ATTRS = new WeakMap();
let activeLanguage = "FR";
let languageNames = new Map([["FR", "Français"]]);

export async function initTranslation() {
  const lang = document.querySelector(".lang");
  if (!lang) return;
  const toggle = lang.querySelector(".lang-toggle");
  const search = lang.querySelector(".lang-search");
  const list = lang.querySelector(".lang-list");
  try {
    const response = await fetch("/api/deepl-languages");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const languages = Array.isArray(data.languages) ? data.languages : [];
    for (const item of languages) languageNames.set(item.language.toUpperCase(), item.name);
    renderLanguages(list, languages, search);
  } catch (error) {
    console.error("Impossible de charger les langues DeepL", error);
    list.innerHTML = '<div class="lang-empty">Langues indisponibles. Vérifie la configuration DeepL sur Vercel.</div>';
  }

  toggle.addEventListener("click", () => {
    toggle.setAttribute("aria-expanded", lang.classList.toggle("open"));
    if (lang.classList.contains("open")) search.focus();
  });
  search.addEventListener("input", () => {
    const query = search.value.trim().toLocaleLowerCase();
    list.querySelectorAll(".lang-option").forEach((button) => {
      button.hidden = !button.dataset.search.includes(query);
    });
    const any = [...list.querySelectorAll(".lang-option")].some((button) => !button.hidden);
    let empty = list.querySelector(".lang-empty");
    if (!any) {
      if (!empty) {
        empty = document.createElement("div");
        empty.className = "lang-empty";
        list.append(empty);
      }
      empty.textContent = "Aucune langue trouvée.";
    } else if (empty) empty.remove();
  });
  list.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-lang]");
    if (!button) return;
    const target = button.dataset.lang;
    if (target === activeLanguage) {
      lang.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      return;
    }
    await translatePage(target, toggle, list);
    lang.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  });
  document.addEventListener("click", (event) => {
    if (!lang.contains(event.target)) {
      lang.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}

function renderLanguages(list, languages, search) {
  list.innerHTML = "";
  const all = [{language: "FR", name: "Français"}, ...languages];
  for (const item of all) {
    const code = item.language.toUpperCase();
    if (code === "EN") continue;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "lang-option";
    button.dataset.lang = code;
    button.dataset.search = `${code} ${item.name}`.toLocaleLowerCase();
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(code === activeLanguage));
    const short = document.createElement("b");
    short.textContent = code;
    const name = document.createElement("span");
    name.textContent = item.name;
    button.append(short, name);
    list.append(button);
  }
  if (!list.children.length) list.innerHTML = '<div class="lang-empty">Aucune langue disponible.</div>';
}

function collectTranslatable() {
  const textNodes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent || parent.closest('script,style,noscript,code,pre,kbd,[translate="no"],.lang')) return NodeFilter.FILTER_REJECT;
      if (!ORIGINAL_TEXT.has(node)) ORIGINAL_TEXT.set(node, node.nodeValue);
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  const attrs = [];
  document.querySelectorAll("title,[placeholder],[aria-label],[title],img[alt],input[value]").forEach((el) => {
    if (el.closest('.lang,[translate="no"]')) return;
    for (const attr of ["placeholder", "aria-label", "title", "alt", "value"]) {
      if (!el.hasAttribute(attr)) continue;
      const key = `${attr}`;
      let saved = ORIGINAL_ATTRS.get(el);
      if (!saved) { saved = {}; ORIGINAL_ATTRS.set(el, saved); }
      if (!(key in saved)) saved[key] = el.getAttribute(attr);
      if (saved[key] && /[^\W\d_]/u.test(saved[key])) attrs.push({el, attr, value: saved[key]});
    }
  });
  const title = document.querySelector("title");
  if (title) {
    if (!ORIGINAL_ATTRS.has(title)) ORIGINAL_ATTRS.set(title, {});
    const saved = ORIGINAL_ATTRS.get(title);
    if (!("textContent" in saved)) saved.textContent = title.textContent;
    attrs.push({el: title, attr: "textContent", value: saved.textContent});
  }
  return {textNodes, attrs};
}

async function translatePage(target, toggle, list) {
  const oldText = toggle.textContent;
  toggle.textContent = "…";
  toggle.disabled = true;
  document.documentElement.classList.add("translating");
  let toast = document.querySelector(".translate-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "translate-toast";
    toast.setAttribute("role", "status");
    document.body.append(toast);
  }
  toast.textContent = "Traduction en cours…";
  try {
    const {textNodes, attrs} = collectTranslatable();
    const values = [...textNodes.map((node) => ORIGINAL_TEXT.get(node)), ...attrs.map((x) => x.value)];
    const translated = [];
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
    textNodes.forEach((node, i) => { node.nodeValue = translated[i] ?? ORIGINAL_TEXT.get(node); });
    attrs.forEach((item, i) => {
      const value = translated[textNodes.length + i] ?? item.value;
      if (item.attr === "textContent") item.el.textContent = value;
      else item.el.setAttribute(item.attr, value);
    });
    activeLanguage = target;
    toggle.textContent = target === "FR" ? "FR" : target;
    list.querySelectorAll("[data-lang]").forEach((button) => button.setAttribute("aria-selected", String(button.dataset.lang === target)));
    document.documentElement.lang = target.toLowerCase();
    toast.textContent = `Langue : ${languageNames.get(target) || target}`;
  } catch (error) {
    console.error("Erreur de traduction DeepL", error);
    toast.textContent = "Traduction impossible. Vérifie la clé API DeepL sur Vercel.";
  } finally {
    toggle.disabled = false;
    if (activeLanguage === "FR") toggle.textContent = "FR";
    else if (toggle.textContent === "…") toggle.textContent = oldText;
    document.documentElement.classList.remove("translating");
    setTimeout(() => toast.remove(), 3500);
  }
}
