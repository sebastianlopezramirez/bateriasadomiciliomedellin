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
 *   #res-starstop        → badge "vehículo Start-Stop" (hidden si no aplica)
 *   #res-lista-refs      → chips con todas las referencias compatibles
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
  /* Definición de las 4 categorías (reutilizada en varios lugares) */
  var CATEGORIAS = [
    { key: 'mac',     label: 'MAC',      mod: 'mac'     },
    { key: 'gold',    label: 'MAC GOLD', mod: 'gold'    },
    { key: 'agm',     label: 'MAC AGM',  mod: 'agm'     },
    { key: 'coexito', label: 'COEXITO',  mod: 'coexito' }
  ];

  fetch('data/catalogo.json')
    .then(function (res) { return res.json(); })
    .then(function (datos) {
      catalogo = datos;
      llenarMarcas();
      renderChips({});   /* Cajas vacías desde el inicio */
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
     Recoge TODAS las referencias para marca + año + modelo.
  ══════════════════════════════════════════════════════════════ */
  btnBuscar.addEventListener('click', function () {
    var marca      = selMarca.value;
    var añoElegido = parseInt(selAnio.value, 10);
    var modeloSel  = selModelo.value; /* "Spark 1.0L" */

    if (!marca || isNaN(añoElegido) || !modeloSel) return;

    var resultados = [];
    var esStarStop = false;

    for (var i = 0; i < catalogo.length; i++) {
      var r     = catalogo[i];
      var clave = r.modelo + (r.cilindraje ? ' ' + r.cilindraje : '');
      var desde = parseInt(r.anioDesde, 10);
      var hasta = parseInt(r.anioHasta, 10);

      if (r.marca === marca &&
          clave === modeloSel &&
          añoElegido >= desde &&
          añoElegido <= hasta) {
        resultados.push(r);
        if (r.starStop) esStarStop = true;
      }
    }

    if (resultados.length > 0) {
      mostrarResultado(resultados, añoElegido, esStarStop);
    } else {
      mostrarConsultaDirecta(marca, modeloSel, añoElegido);
    }
  });


  /* ══════════════════════════════════════════════════════════════
     MOSTRAR RESULTADO
     Muestra TODAS las referencias del carro sin precio.
     Indica si el vehículo es Star-Stop.
  ══════════════════════════════════════════════════════════════ */
  function mostrarResultado(resultados, añoElegido, esStarStop) {
    var primero = resultados[0];

    /* ── Badge Star-Stop ─────────────────────────────────────── */
    var badgeSS = document.getElementById('res-starstop');
    if (esStarStop) {
      badgeSS.textContent = '⚡ Vehículo Start-Stop — requiere batería AGM';
      badgeSS.hidden = false;
    } else {
      badgeSS.hidden = true;
    }

    /* ── Clasificar referencias ──────────────────────────────── */
    var cats = { mac: '', gold: '', agm: '', coexito: '' };
    for (var i = 0; i < resultados.length; i++) {
      var ref = (resultados[i].referencia || '').trim();
      if (!ref) continue;
      if (!cats.agm     && /^LN[0-9]-M$/i.test(ref))           cats.agm     = ref;
      else if (!cats.gold    && /MG$/i.test(ref))               cats.gold    = ref;
      else if (!cats.coexito && /[XT]XP$|^D\d/i.test(ref))     cats.coexito = ref;
      else if (!cats.mac     && /MC$|ME$/i.test(ref))           cats.mac     = ref;
    }

    /* ── Referencia destacada: mostrar la principal con su color */
    var catPrincipal = cats.mac     ? 'mac'
                     : cats.agm     ? 'agm'
                     : cats.gold    ? 'gold'
                     : cats.coexito ? 'coexito' : '';
    var refPrincipal = cats[catPrincipal] || '';

    var elRef = document.getElementById('res-referencia');
    if (refPrincipal) {
      elRef.textContent = refPrincipal;
      elRef.className   = 'ref-destacada ref-destacada--' + catPrincipal;
      elRef.hidden      = false;
    } else {
      elRef.hidden = true;
    }

    document.getElementById('res-label').textContent = '✅ Referencia para tu carro:';

    /* ── Mensaje WhatsApp ────────────────────────────────────── */
    var refs = [cats.mac, cats.gold, cats.agm, cats.coexito]
      .filter(function(r){ return r; })
      .join(', ');
    var btnWa = document.getElementById('btn-whatsapp-buscador');

    function construirMensaje() {
      var direccion = (document.getElementById('res-direccion').value.trim())
        || '(escribe tu dirección aquí)';
      var lineas = [
        '*Hola, quiero pedir una batería a domicilio en Medellín*',
        '',
        '🚗 Vehículo: ' + primero.marca + ' ' + primero.modelo,
        '📅 Año: ' + añoElegido,
        '⚙️ Motor: ' + (primero.cilindraje || '—'),
        (esStarStop ? '⚡ Start-Stop: SÍ (requiere AGM)' : ''),
        '📦 Referencias compatibles: ' + refs,
        '',
        '📍 Mi dirección: ' + direccion,
        '',
        '¿Pueden venir ahora? ¡Gracias!'
      ].filter(function(l){ return l !== ''; });
      return lineas.join('\n');
    }

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
    var badgeSS = document.getElementById('res-starstop');
    badgeSS.hidden = true;
    renderChips({});
    document.getElementById('res-referencia').hidden = true;
    document.getElementById('res-label').textContent = 'Consulta directa — escríbenos por WhatsApp:';

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
  /* ── Actualizar referencias bajo cada logo ───────────────────
     cats = { mac:'42IST950MC', agm:'LN3-M', gold:'', coexito:'' }
     Pasar {} para estado inicial (muestra — en todos).
  ════════════════════════════════════════════════════════════════ */
  function renderChips(cats) {
    var IDS = ['mac', 'agm', 'gold', 'coexito'];
    for (var i = 0; i < IDS.length; i++) {
      var el  = document.getElementById('ref-' + IDS[i]);
      if (!el) continue;
      var val = (cats && cats[IDS[i]]) || '';
      el.textContent = val;
      el.className   = 'marca-ref' + (val ? '' : ' marca-ref--vacio');
    }
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
    var elRef = document.getElementById('res-referencia');
    if (elRef) elRef.hidden = true;
    document.getElementById('res-label').textContent = 'Marcas disponibles para tu carro:';
  }

})();
