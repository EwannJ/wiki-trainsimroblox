// 1. Vos paramètres de configuration (Le paramètre "languages" est retiré pour tout afficher)
window.gtranslateSettings = {
    "default_language": "fr",
    "languages": ["fr", "en", "es", "it", "de", "ru"],
    "native_language_names": true,
    "detect_browser_language": true,
    "wrapper_selector": ".gtranslate_wrapper",
    "switcher_horizontal_position": "right",
    "switcher_vertical_position": "top",
    "float_switcher_open_direction": "bottom"
};

// 2. Détection AUTOMATIQUE de la langue de l'URL (Compatible avec toutes les langues du monde)
(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get('lang');
    const defaultLang = window.gtranslateSettings.default_language;

    // Si un paramètre lang est présent et qu'il fait au moins 2 lettres (ex: en, es, zh-CN)
    if (langParam && langParam.length >= 2 && langParam !== defaultLang) {
        const gtStorageData = {
            "srcLang": defaultLang,
            "tgtLang": langParam
        };
        // Injection immédiate en mémoire locale pour float.js
        localStorage.setItem('__GT_TRANSLATE_LANGS', JSON.stringify(gtStorageData));
    } else if (langParam === defaultLang || !urlParams.has('lang')) {
        // Nettoyage si on revient au français
        localStorage.removeItem('__GT_TRANSLATE_LANGS');
    }
})();

// 3. Injection automatique du conteneur HTML requis par GTranslate
const translateWrapper = document.createElement('div');
translateWrapper.className = 'gtranslate_wrapper';
document.body.appendChild(translateWrapper);

// 4. Chargement dynamique du script officiel GTranslate (float.js)
const gtScript = document.createElement('script');
gtScript.src = 'https://cdn.gtranslate.net/widgets/latest/float.js';
gtScript.defer = true;
document.head.appendChild(gtScript);

// 5. Systèmes complémentaires (Recherche clavier et URLs dynamiques au clic)
(function() {
    var searchString = "";
    var timeout;
    
    // Écouteur pour la recherche au clavier (très utile quand il y a plus de 100 langues !)
    document.addEventListener("keydown", function(e) {
        var optionsPanel = document.querySelector(".gt_options.gt-open");
        if (!optionsPanel || e.key.length !== 1) return;
        e.preventDefault();
        searchString += e.key.toLowerCase();
        clearTimeout(timeout);
        timeout = setTimeout(function() { searchString = ""; }, 1000);

        var links = optionsPanel.getElementsByTagName("a");
        for (var i = 0; i < links.length; i++) {
            var langText = (links[i].textContent || links[i].innerText).trim().toLowerCase();
            if (langText.startsWith(searchString)) {
                links[i].scrollIntoView({ behavior: "smooth", block: "nearest" });
                links[i].style.backgroundColor = "rgba(255, 255, 255, 0.3)";
                (function(el) { setTimeout(function() { el.style.backgroundColor = ""; }, 500); })(links[i]);
                break;
            }
        }
    });

    // Ajout du code langue dans l'URL (?lang=xx) lors d'un clic manuel sur une langue
    document.addEventListener("click", function(e) {
        var langLink = e.target.closest("a[data-gt-lang]");
        if (langLink) {
            var selectedLang = langLink.getAttribute("data-gt-lang");
            var newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            if (selectedLang !== window.gtranslateSettings.default_language) {
                newUrl += "?lang=" + selectedLang;
            } else {
                localStorage.removeItem('__GT_TRANSLATE_LANGS');
            }
            window.history.pushState({ path: newUrl }, '', newUrl);
        }
    });
})();
