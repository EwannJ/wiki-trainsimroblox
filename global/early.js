// Exécuté de façon synchrone dans le <head>, avant le premier affichage.
// Si la page doit être traduite, on la masque jusqu'à ce que la traduction soit appliquée,
// pour éviter le clignotement « français puis traduit ».
(function () {
  try {
    var root = document.documentElement;
    var param = new URLSearchParams(location.search).get("lang");
    var lang = param;
    if (lang === null) { try { lang = localStorage.getItem("tsr-manual-language"); } catch (e) {} }
    if (lang === null || lang === "") {
      lang = (navigator.languages && navigator.languages[0]) || navigator.language || "fr";
    }
    if (!/^fr(\b|-|_|$)/i.test(lang)) {
      root.classList.add("translation-pending");
      // Sécurité : si la traduction échoue ou tarde trop, on affiche quand même la page.
      setTimeout(function () { root.classList.remove("translation-pending"); }, 8000);
    }
  } catch (e) {}
})();
