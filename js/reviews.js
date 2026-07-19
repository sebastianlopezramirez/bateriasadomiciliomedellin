/**
 * reviews.js — Google My Business Reviews Loader
 * ================================================
 * METODOLOGÍA:
 * 1. ENTENDER: Conecta los reviews reales de Google Mi Negocio a la sección
 *              "Lo que dicen nuestros clientes". Usa la Places API (New) de Google.
 *
 * 2. PENSAR:   Necesitas DOS cosas en Google Cloud Console:
 *              a) API Key con "Places API (New)" habilitada
 *              b) Place ID de tu negocio en Google Mi Negocio
 *
 *              ¿Cómo obtengo el Place ID?
 *              → Ve a https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder
 *              → Busca "Baterías a Domicilio Medellín"
 *              → Copia el ID que empieza con "ChIJ..."
 *
 * 3. ESCRIBIR: El script hace fetch a la Places API, renderiza las tarjetas
 *              con el mismo HTML/CSS que las estáticas y actualiza el contador.
 *              Si falla → los comentarios del HTML quedan intactos (fallback).
 *
 * 4. VERIFICAR: Abre F12 → Consola → verás "[Reviews] X reseñas cargadas"
 *               o un aviso si falta configuración.
 */

(function () {

  /* ================================================================
     CONFIGURACIÓN — solo cambia estos dos valores
  ================================================================ */
  var REVIEWS_CONFIG = {
    apiKey:  'TU_API_KEY_AQUI',    // ← Tu API Key de Google Cloud (Places API habilitada)
    placeId: 'TU_PLACE_ID_AQUI',   // ← Place ID de Google Mi Negocio (comienza con "ChIJ...")
    lang:    'es',                  // Idioma de las reseñas
  };
  /* =============================================================== */


  /* ────────────────────────────────────────────────────────────────
     PASO 1 — buildStars(rating)
     Recibe un número (1–5) y devuelve los SVGs de estrellas
     llenas y vacías para mostrar la calificación exacta del cliente
  ──────────────────────────────────────────────────────────────── */
  function buildStars(rating) {
    var html = '';
    for (var i = 1; i <= 5; i++) {
      var llena = i <= Math.round(rating);
      html += '<svg viewBox="0 0 24 24" class="estrella-gmb' + (llena ? ' estrella-gmb--llena' : ' estrella-gmb--vacia') + '">' +
              '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>' +
              '</svg>';
    }
    return html;
  }


  /* ────────────────────────────────────────────────────────────────
     PASO 2 — buildCard(review)
     Convierte un objeto review de la Places API en el HTML exacto
     de las tarjetas estáticas que ya existen en la página
  ──────────────────────────────────────────────────────────────── */
  function buildCard(review) {
    var author   = (review.authorAttribution && review.authorAttribution.displayName) || 'Cliente';
    var rating   = review.rating || 5;
    var text     = (review.text && review.text.text) ? review.text.text : '';
    var timeDesc = review.relativePublishTimeDescription || '';

    /* Si la reseña no tiene texto, la omitimos */
    if (!text.trim()) return '';

    return '<li>' +
      '<article class="testimonio-card">' +
        '<span class="testimonio-card__estrellas" aria-label="' + rating + ' estrellas de 5">' +
          buildStars(rating) +
        '</span>' +
        '<blockquote class="testimonio-card__texto">“' + text + '”</blockquote>' +
        '<cite class="testimonio-card__autor">— ' + author +
          (timeDesc ? ' <span class="review-tiempo">· ' + timeDesc + '</span>' : '') +
        '</cite>' +
      '</article>' +
    '</li>';
  }


  /* ────────────────────────────────────────────────────────────────
     PASO 3 — updateHeader(rating, total)
     Actualiza el badge de rating con los datos reales del negocio
  ──────────────────────────────────────────────────────────────── */
  function updateHeader(rating, total) {
    var badge = document.getElementById('reviews-rating-badge');
    if (badge && rating && total) {
      badge.textContent = '⭐ ' + parseFloat(rating).toFixed(1) + ' · ' + total + ' reseñas en Google';
    }
  }


  /* ────────────────────────────────────────────────────────────────
     PASO 4 — loadReviews()
     Función principal: valida config → llama a la API → renderiza
     Cualquier error → fallback silencioso a las tarjetas estáticas
  ──────────────────────────────────────────────────────────────── */
  async function loadReviews() {

    /* Guarda de seguridad: si no hay credenciales, sale sin romper nada */
    if (!REVIEWS_CONFIG.apiKey || REVIEWS_CONFIG.apiKey === 'TU_API_KEY_AQUI') {
      console.info('[Reviews] ⚠ Agrega tu API Key en js/reviews.js → REVIEWS_CONFIG.apiKey');
      return;
    }
    if (!REVIEWS_CONFIG.placeId || REVIEWS_CONFIG.placeId === 'TU_PLACE_ID_AQUI') {
      console.info('[Reviews] ⚠ Agrega tu Place ID en js/reviews.js → REVIEWS_CONFIG.placeId');
      return;
    }

    var lista = document.getElementById('reviews-google');
    if (!lista) return;

    /* Muestra un skeleton de carga mientras espera la API */
    lista.setAttribute('aria-busy', 'true');

    try {
      /* Places API (New) — soporta CORS desde el browser con API Key restringida por dominio */
      var url = 'https://places.googleapis.com/v1/places/' + REVIEWS_CONFIG.placeId +
                '?fields=reviews%2Crating%2CuserRatingsTotal' +
                '&languageCode=' + REVIEWS_CONFIG.lang +
                '&key=' + REVIEWS_CONFIG.apiKey;

      var resp = await fetch(url);

      if (!resp.ok) {
        throw new Error('Places API respondió con HTTP ' + resp.status +
                        '. Verifica que la API Key tenga "Places API (New)" habilitada.');
      }

      var data = await resp.json();

      /* Filtra reseñas con texto y las convierte a HTML */
      var reviews  = (data.reviews || []).filter(function(r) { return r.text && r.text.text; });
      var htmlCards = reviews.map(buildCard).join('');

      if (!htmlCards) {
        console.info('[Reviews] El negocio no tiene reseñas con texto disponibles.');
        return;
      }

      /* Reemplaza las tarjetas estáticas con las reales de Google */
      lista.innerHTML = htmlCards;

      /* Actualiza el badge de calificación */
      updateHeader(data.rating, data.userRatingsTotal);

      console.info('[Reviews] ✅ ' + reviews.length + ' reseñas cargadas desde Google Mi Negocio.');

    } catch (err) {
      /* Fallback silencioso — las tarjetas estáticas del HTML quedan intactas */
      console.warn('[Reviews] Error al cargar — manteniendo reseñas estáticas. Detalle:', err.message);
    } finally {
      lista.removeAttribute('aria-busy');
    }
  }


  /* Ejecuta cuando el DOM esté listo (sin bloquear el render de la página) */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadReviews);
  } else {
    loadReviews();
  }

})();
