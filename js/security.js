/**
 * security.js — Baterías a Domicilio Medellín
 * © 2026 Baterías a Domicilio Medellín. Todos los derechos reservados.
 * Uso, copia o distribución no autorizada está prohibida.
 * -------------------------------------------------------------------
 * Capas de protección:
 *  1. Verificación de dominio autorizado (detecta clones)
 *  2. Protección de imágenes (anti-copia visual)
 *  3. Aviso legal en consola del navegador
 *  4. Bloqueo de herramientas de copia automática (HTTrack, etc.)
 */

(function () {
  'use strict';

  /* ── 1. VERIFICACIÓN DE DOMINIO ─────────────────────────────────
     Si el código se carga en un dominio no autorizado (clon),
     reemplaza el contenido con un aviso y redirige.
  ──────────────────────────────────────────────────────────────── */
  var DOMINIOS_OK = [
    'bateriasdomiciliomedellin.com',
    'www.bateriasdomiciliomedellin.com',
    'bateriasadomiciliomedellin.onrender.com',
    'localhost',
    '127.0.0.1'
  ];

  var dominioActual = window.location.hostname.toLowerCase();

  if (DOMINIOS_OK.indexOf(dominioActual) === -1) {
    /* Dominio no autorizado: limpiar página y redirigir */
    document.documentElement.innerHTML =
      '<head><meta charset="UTF-8"><title>Contenido no autorizado</title></head>' +
      '<body style="font-family:sans-serif;padding:60px;text-align:center;">' +
      '<h1>⛔ Contenido no autorizado</h1>' +
      '<p>Este sitio solo puede cargarse en <strong>bateriasdomiciliomedellin.com</strong></p>' +
      '<p><a href="https://www.bateriasdomiciliomedellin.com">Ir al sitio oficial &rarr;</a></p>' +
      '</body>';
    window.location.replace('https://www.bateriasdomiciliomedellin.com');
    return;
  }

  /* ── 2. PROTECCIÓN DE IMÁGENES ──────────────────────────────────
     Desactiva clic derecho y arrastre en todas las imágenes.
  ──────────────────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    var imgs = document.querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) {
      imgs[i].addEventListener('contextmenu', function (e) { e.preventDefault(); });
      imgs[i].setAttribute('draggable', 'false');
      imgs[i].addEventListener('dragstart', function (e) { e.preventDefault(); });
    }
  });

  /* ── 3. AVISO LEGAL EN CONSOLA ──────────────────────────────────
     Mensaje visible cuando alguien abre DevTools para copiar código.
  ──────────────────────────────────────────────────────────────── */
  if (window.console) {
    console.log(
      '%c⛔ AVISO LEGAL',
      'color:#FF3B3B; font-size:22px; font-weight:bold; padding:6px 0;'
    );
    console.log(
      '%cEste código está protegido por derechos de autor.\n© 2026 Baterías a Domicilio Medellín.\nQueda prohibida su copia, reproducción o uso sin autorización escrita.',
      'color:#333; font-size:13px; line-height:1.6;'
    );
    console.log(
      '%cSi eres desarrollador y necesitas algo, escríbenos: selora1988@gmail.com',
      'color:#888; font-size:11px;'
    );
  }

  /* ── 4. DETECCIÓN BÁSICA DE DEVTOOLS ABIERTO ────────────────────
     Cuando el panel lateral es muy ancho = DevTools abierto.
     No es infalible, pero disuade y registra el intento.
  ──────────────────────────────────────────────────────────────── */
  var _devOpen = false;
  setInterval(function () {
    var umbral = 160;
    var abierto = (window.outerWidth  - window.innerWidth  > umbral) ||
                  (window.outerHeight - window.innerHeight > umbral);
    if (abierto && !_devOpen) {
      _devOpen = true;
      console.clear();
      console.log(
        '%c🔒 Contenido protegido — © 2026 Baterías a Domicilio Medellín',
        'color:#C9A800; font-size:16px; font-weight:bold;'
      );
    }
    if (!abierto) { _devOpen = false; }
  }, 1000);

})();
