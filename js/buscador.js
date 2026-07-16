/**
 * buscador.js — Baterías a Domicilio Medellín
 * ─────────────────────────────────────────────────────────────────
 * Buscador en cascada de 3 pasos:
 *
 *   PASO 1 → Usuario elige MARCA
 *              → Se calculan los AÑOS disponibles para esa marca
 *   PASO 2 → Usuario elige AÑO
 *              → Se filtran los MODELOS que cubren ese año
 *   PASO 3 → Usuario elige MODELO
 *              → Se habilita el botón "Consultar batería"
 *   PASO 4 → Click en botón → Se muestra la batería recomendada
 *              → Aparece campo dirección + botón ¡DOMICILIO YA!
 *
 * IDs del HTML que usa este script:
 *   #sel-marca     → <select> marcas
 *   #sel-anio      → <select> años  (empieza disabled)
 *   #sel-modelo    → <select> modelos (empieza disabled)
 *   #btn-buscar    → botón "Consultar batería" (empieza disabled)
 *   #resultado-bateria   → sección resultado (empieza hidden)
 *   #res-referencia      → <h3> referencia de la batería
 *   #res-precio          → <p> precio formateado
 *   #btn-whatsapp-buscador → botón ¡Domicilio Ya!
 *   #res-direccion       → input de dirección
 *
 * Variable global requerida (definida en index.html):
 *   window.WA_NUMERO → número WhatsApp sin '+', ej: '573022949358'
 */

(function () {
  'use strict';

  /* ── Referencias DOM ───────────────────────────────────────────── */
  var selMarca  = document.getElementById('sel-marca');
  var selAnio   = document.getElementById('sel-anio');
  var selModelo = document.getElementById('sel-modelo');
  var btnBuscar = document.getElementById('btn-buscar');

  /* Catálogo completo cargado desde JSON */
  var catalogo = [];

  /* ══════════════════════════════════════════════════════════════
     PASO 0 — CARGAR EL CATÁLOGO
     fetch() descarga el JSON una sola vez al cargar la página.
  ══════════════════════════════════════════════════════════════ */
  fetch('data/catalogo.json')
    .then(function (res) { return res.json(); })
    .then(function (datos) {
      catalogo = datos;
      llenarMarcas();
    })
    .catch(function (err) {
      console.error('[Buscador] Error cargando catálogo:', err);
    });


  /* ══════════════════════════════════════════════════════════════
     PASO 1 — LLENAR MARCAS (A–Z, únicas)
  ══════════════════════════════════════════════════════════════ */
  function llenarMarcas() {
    var vistas = {};
    var marcas  = [];

    for (var i = 0; i < catalogo.length; i++) {
      var m = catalogo[i].marca;
      if (m && !vistas[m]) {
        vistas[m] = true;
        marcas.push(m);
      }
    }
    marcas.sort();

    var frag = document.createDocumentFragment();
    var opD  = document.createElement('option');
    opD.value = '';
    opD.textContent = '— Selecciona la marca —';
    frag.appendChild(opD);

    for (var j = 0; j < marcas.length; j++) {
      var op = document.createElement('option');
      op.value = op.textContent = marcas[j];
      frag.appendChild(op);
    }

    selMarca.innerHTML = '';
    selMarca.appendChild(frag);
  }


  /* ══════════════════════════════════════════════════════════════
     EVENTO: cambio de MARCA → calcular años disponibles
     Para cada registro de esa marca, expandimos el rango
     [anioDesde … anioHasta] y recopilamos años únicos ordenados.
  ══════════════════════════════════════════════════════════════ */
  selMarca.addEventListener('change', function () {
    resetAnio();
    resetModelo();
    ocultarResultado();

    var marca = selMarca.value;
    if (!marca) return;

    /* Recopilar todos los años únicos de esa marca */
    var añosSet = {};
    for (var i = 0; i < catalogo.length; i++) {
      var r = catalogo[i];
      if (r.marca !== marca) continue;

      var desde = parseInt(r.anioDesde, 10);
      var hasta = parseInt(r.anioHasta, 10);

      if (isNaN(desde) || isNaN(hasta)) continue;

      for (var a = desde; a <= hasta; a++) {
        añosSet[a] = true;
      }
    }

    var años = Object.keys(añosSet)
                     .map(Number)
                     .sort(function (a, b) { return a - b; });

    if (años.length === 0) return;

    var frag = document.createDocumentFragment();
    var opD  = document.createElement('option');
    opD.value = '';
    opD.textContent = '— Selecciona el año —';
    frag.appendChild(opD);

    for (var j = 0; j < años.length; j++) {
      var op = document.createElement('option');
      op.value = op.textContent = String(años[j]);
      frag.appendChild(op);
    }

    selAnio.innerHTML = '';
    selAnio.appendChild(frag);
    selAnio.disabled = false;
  });


  /* ══════════════════════════════════════════════════════════════
     EVENTO: cambio de AÑO → filtrar modelos que cubren ese año
     Un modelo aplica si anioDesde ≤ añoElegido ≤ anioHasta
  ══════════════════════════════════════════════════════════════ */
  selAnio.addEventListener('change', function () {
    resetModelo();
    ocultarResultado();

    var marca = selMarca.value;
    var año   = parseInt(selAnio.value, 10);
    if (!marca || isNaN(año)) return;

    /* Filtrar registros compatibles con marca + año */
    var vistos  = {};
    var modelos = [];

    for (var i = 0; i < catalogo.length; i++) {
      var r = catalogo[i];
      if (r.marca !== marca) continue;

      var desde = parseInt(r.anioDesde, 10);
      var hasta = parseInt(r.anioHasta, 10);
      if (isNaN(desde) || isNaN(hasta)) continue;

      if (año >= desde && año <= hasta) {
        /* La clave para deduplicar es modelo + cilindraje */
        var clave = r.modelo + '|' + r.cilindraje;
        if (!vistos[clave]) {
          vistos[clave] = true;
          modelos.push(r.modelo + (r.cilindraje ? ' ' + r.cilindraje : ''));
        }
      }
    }

    modelos.sort();

    if (modelos.length === 0) return;

    var frag = document.createDocumentFragment();
    var opD  = document.createElement('option');
    opD.value = '';
    opD.textContent = '— Selecciona el modelo —';
    frag.appendChild(opD);

    for (var j = 0; j < modelos.length; j++) {
      var op = document.createElement('option');
      op.value = op.textContent = modelos[j];
      frag.appendChild(op);
    }

    selModelo.innerHTML = '';
    selModelo.appendChild(frag);
    selModelo.disabled = false;
  });


  /* ══════════════════════════════════════════════════════════════
     EVENTO: cambio de MODELO → habilitar botón Consultar
  ══════════════════════════════════════════════════════════════ */
  selModelo.addEventListener('change', function () {
    btnBuscar.disabled = !selModelo.value;
    ocultarResultado();
  });


  /* ══════════════════════════════════════════════════════════════
     EVENTO: click en "Consultar batería"
     Busca la primera coincidencia por marca + año + modelo.
  ══════════════════════════════════════════════════════════════ */
  btnBuscar.addEventListener('click', function () {
    var marca      = selMarca.value;
    var añoElegido = parseInt(selAnio.value, 10);
    var modeloSel  = selModelo.value; /* "Spark 1.0L" */

    if (!marca || isNaN(añoElegido) || !modeloSel) return;

    /* El modelo en el select tiene formato "modelo cilindraje",
       necesitamos separar para comparar con el JSON */
    var resultado = null;

    for (var i = 0; i < catalogo.length; i++) {
      var r      = catalogo[i];
      var clave  = r.modelo + (r.cilindraje ? ' ' + r.cilindraje : '');
      var desde  = parseInt(r.anioDesde, 10);
      var hasta  = parseInt(r.anioHasta, 10);

      if (r.marca === marca &&
          clave === modeloSel &&
          añoElegido >= desde &&
          añoElegido <= hasta) {
        resultado = r;
        break;
      }
    }

    if (resultado) {
      mostrarResultado(resultado, añoElegido);
    } else {
      mostrarConsultaDirecta(marca, modeloSel, añoElegido);
    }
  });


  /* ══════════════════════════════════════════════════════════════
     MOSTRAR RESULTADO
     Llena el card con referencia + precio y construye el link
     de WhatsApp incluyendo el año específico elegido.
  ══════════════════════════════════════════════════════════════ */
  function mostrarResultado(r, añoElegido) {
    var precioFormateado = formatearPrecio(r.precio);

    document.getElementById('res-referencia').textContent = r.referencia;
    document.getElementById('res-precio').textContent     = precioFormateado;

    var btnWa = document.getElementById('btn-whatsapp-buscador');

    function construirMensaje() {
      var direccion = (document.getElementById('res-direccion').value.trim())
        || '(escribe tu dirección aquí)';
      var lineas = [
        '*Hola, quiero pedir una batería a domicilio en Medellín*',
        '',
        '🚗 Vehículo: ' + r.marca + ' ' + r.modelo,
        '📅 Año: ' + añoElegido,
        '⚙️ Motor: ' + (r.cilindraje || '—'),
        '📦 Referencia batería: ' + r.referencia,
        '💰 Precio: ' + precioFormateado,
        '',
        '📍 Mi dirección: ' + direccion,
        '',
        '¿Pueden venir ahora? ¡Gracias!'
      ];
      return lineas.join('\n');
    }

    /* Actualizar href en cada click para capturar la dirección */
    btnWa.onclick = function () {
      btnWa.href = 'https://wa.me/' + window.WA_NUMERO +
                   '?text=' + encodeURIComponent(construirMensaje());
    };
    btnWa.href = 'https://wa.me/' + window.WA_NUMERO +
                 '?text=' + encodeURIComponent(construirMensaje());

    var seccion = document.getElementById('resultado-bateria');
    seccion.hidden = false;
    seccion.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function mostrarConsultaDirecta(marca, modelo, año) {
    document.getElementById('res-referencia').textContent = 'Consulta directa';
    document.getElementById('res-precio').textContent     = 'Pregúntanos por WhatsApp';

    var msg = encodeURIComponent(
      'Hola, busco batería para ' + marca + ' ' + modelo +
      ' año ' + año + '. ¿Tienen disponibilidad?'
    );
    var btnWa = document.getElementById('btn-whatsapp-buscador');
    btnWa.href = 'https://wa.me/' + window.WA_NUMERO + '?text=' + msg;

    var seccion = document.getElementById('resultado-bateria');
    seccion.hidden = false;
    seccion.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }


  /* ══════════════════════════════════════════════════════════════
     UTILIDADES
  ══════════════════════════════════════════════════════════════ */
  function formatearPrecio(num) {
    if (typeof num !== 'number') return String(num);
    return '$' + num.toLocaleString('es-CO') + ' COP';
  }

  function resetAnio() {
    selAnio.innerHTML = '<option value="">— Primero elige la marca —</option>';
    selAnio.disabled  = true;
  }

  function resetModelo() {
    selModelo.innerHTML = '<option value="">— Primero elige el año —</option>';
    selModelo.disabled  = true;
    btnBuscar.disabled  = true;
  }

  function ocultarResultado() {
    var sec = document.getElementById('resultado-bateria');
    if (sec) sec.hidden = true;
  }

})();
