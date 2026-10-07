// 1. Injection automatique du conteneur HTML requis par GTranslate
const translateWrapper = document.createElement('div');
translateWrapper.className = 'gtranslate_wrapper';
document.body.appendChild(translateWrapper);

// 2. Vos paramètres exacts GTranslate (avec votre sélection de langues)
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

// 3. Chargement dynamique du script officiel GTranslate (float.js)
const gtScript = document.createElement('script');
gtScript.src = 'https://cdn.gtranslate.net/widgets/latest/float.js';
gtScript.defer = true;
document.head.appendChild(gtScript);

// 4. Système de recherche instinctive au clavier ET mise à jour de l'URL
(function() {
    var searchString = "";
    var timeout;
    
    // Écouteur pour la recherche au clavier (type-to-search)
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

    // Ajout automatique du code langue dans l'URL (?lang=xx) au clic
    document.addEventListener("click", function(e) {
        var langLink = e.target.closest("a[data-gt-lang]");
        if (langLink) {
            var selectedLang = langLink.getAttribute("data-gt-lang");
            var newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            if (selectedLang !== "fr") {
                newUrl += "?lang=" + selectedLang;
            }
            window.history.pushState({ path: newUrl }, '', newUrl);
        }
    });
})();
