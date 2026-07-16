/**
 * buscador.js — Baterías a Domicilio Medellín
 * ─────────────────────────────────────────────────────────────────
 * Lógica del buscador automático de baterías.
 *
 * FLUJO:
 *   1. Al cargar la página → fetch catalogo.json → llenar <select> marcas
 *   2. Usuario elige marca  → filtrar modelos → llenar <select> modelos
 *   3. Usuario elige modelo → habilitar botón "Consultar batería"
 *   4. Usuario pulsa botón  → buscar en JSON → mostrar card resultado
 *                           → actualizar link WhatsApp con mensaje pre-cargado
 *
 * IDs del HTML que usa este script:
 *   #sel-marca           → <select> de marcas
 *   #sel-modelo          → <select> de modelos (empieza disabled)
 *   #btn-buscar          → botón "Consultar batería" (empieza disabled)
 *   #resultado-bateria   → <section> del card de resultado (empieza hidden)
 *   #res-referencia      → <h3> donde va la referencia de la batería
 *   #res-precio          → <p> donde va el precio formateado
 *   #btn-whatsapp-buscador → <a> botón ¡Domicilio Ya! con href a WhatsApp
 *
 * Variable global requerida (definida en index.html):
 *   window.WA_NUMERO     → número WhatsApp sin '+' ni espacios, ej: '573001234567'
 */

(function () {
  'use strict';

  /* ── Referencias a los elementos del DOM ─────────────────────── */
  var selMarca  = document.getElementById('sel-marca');
  var selModelo = document.getElementById('sel-modelo');
  var btnBuscar = document.getElementById('btn-buscar');

  /* El catálogo completo, se llena cuando llega el JSON */
  var catalogo = [];

  /* ══════════════════════════════════════════════════════════════
     PASO 1 — CARGAR EL CATÁLOGO
     fetch() descarga el JSON una sola vez al cargar la página.
     .then() espera la respuesta y convierte el texto en objeto JS.
  ══════════════════════════════════════════════════════════════ */
  fetch('data/catalogo.json')
    .then(function (respuesta) {
      return respuesta.json();         /* convierte texto → array de objetos */
    })
    .then(function (datos) {
      catalogo = datos;                /* guardamos los 1800 registros */
      llenarMarcas();                  /* ya podemos poblar el primer select */
    })
    .catch(function (error) {
      console.error('[Buscador] Error cargando catálogo:', error);
    });


  /* ══════════════════════════════════════════════════════════════
     PASO 2 — LLENAR EL SELECT DE MARCAS
     Recorremos el array y recopilamos marcas únicas en orden A–Z.
     Usamos un objeto {marca: true} como "set" para evitar duplicados.
  ══════════════════════════════════════════════════════════════ */
  function llenarMarcas() {
    var vistas = {};
    var marcas  = [];

    for (var i = 0; i < catalogo.length; i++) {
      var m = catalogo[i].marca;
      if (!vistas[m]) {
        vistas[m] = true;
        marcas.push(m);
      }
    }
    marcas.sort(); /* A–Z */

    /* Creamos todas las <option> de una vez con un DocumentFragment
       para no refluir el DOM en cada iteración (más rápido) */
    var fragmento = document.createDocumentFragment();

    var opDefault = document.createElement('option');
    opDefault.value = '';
    opDefault.textContent = '— Selecciona marca —';
    fragmento.appendChild(opDefault);

    for (var j = 0; j < marcas.length; j++) {
      var op = document.createElement('option');
      op.value       = marcas[j];
      op.textContent = marcas[j];
      fragmento.appendChild(op);
    }

    selMarca.innerHTML = '';           /* limpiar opción inicial del HTML */
    selMarca.appendChild(fragmento);
  }


  /* ══════════════════════════════════════════════════════════════
     PASO 3 — AL CAMBIAR MARCA → LLENAR MODELOS
     Escuchamos el evento 'change' del primer select.
     Filtramos el catálogo por la marca elegida y poblamos el segundo.
  ══════════════════════════════════════════════════════════════ */
  selMarca.addEventListener('change', function () {
    var marcaSel = selMarca.value;

    /* Resetear el segundo select y el botón */
    reiniciarModelo();
    ocultarResultado();

    if (!marcaSel) return; /* el usuario eligió la opción vacía */

    /* Filtrar modelos únicos para esa marca */
    var vistos  = {};
    var modelos = [];

    for (var i = 0; i < catalogo.length; i++) {
      if (catalogo[i].marca === marcaSel) {
        var mod = catalogo[i].modelo;
        if (!vistos[mod]) {
          vistos[mod] = true;
          modelos.push(mod);
        }
      }
    }
    modelos.sort(); /* A–Z */

    /* Poblar el select de modelos */
    var fragmento = document.createDocumentFragment();

    var opDefault = document.createElement('option');
    opDefault.value = '';
    opDefault.textContent = '— Selecciona modelo —';
    fragmento.appendChild(opDefault);

    for (var j = 0; j < modelos.length; j++) {
      var op = document.createElement('option');
      op.value       = modelos[j];
      op.textContent = modelos[j];
      fragmento.appendChild(op);
    }

    selModelo.innerHTML = '';
    selModelo.appendChild(fragmento);
    selModelo.disabled = false;        /* ahora el usuario puede elegir modelo */
  });


  /* ══════════════════════════════════════════════════════════════
     PASO 4 — AL CAMBIAR MODELO → HABILITAR BOTÓN
     Solo habilitamos el botón si el usuario eligió un modelo real
     (no la opción vacía "— Selecciona modelo —").
  ══════════════════════════════════════════════════════════════ */
  selModelo.addEventListener('change', function () {
    btnBuscar.disabled = !selModelo.value;
    ocultarResultado();
  });


  /* ══════════════════════════════════════════════════════════════
     PASO 5 — AL HACER CLICK EN "Consultar batería"
     Buscamos la primera coincidencia marca+modelo en el catálogo.
     (Puede haber varios registros con mismo marca+modelo pero diferente
      cilindraje o año — tomamos el primero, que tiene la misma referencia.)
  ══════════════════════════════════════════════════════════════ */
  btnBuscar.addEventListener('click', function () {
    var marca  = selMarca.value;
    var modelo = selModelo.value;

    if (!marca || !modelo) return;

    /* Buscar primera coincidencia */
    var resultado = null;
    for (var i = 0; i < catalogo.length; i++) {
      if (catalogo[i].marca === marca && catalogo[i].modelo === modelo) {
        resultado = catalogo[i];
        break;
      }
    }

    if (resultado) {
      mostrarResultado(resultado);
    } else {
      /* No debería pasar (los selects vienen del mismo JSON),
         pero por si acaso mostramos mensaje de consulta directa */
      mostrarConsultaDirecta(marca, modelo);
    }
  });


  /* ══════════════════════════════════════════════════════════════
     MOSTRAR RESULTADO
     Llena el card con referencia + precio y actualiza el botón
     WhatsApp con un mensaje pre-cargado listo para enviar.
  ══════════════════════════════════════════════════════════════ */
  function mostrarResultado(r) {
    var precioFormateado = formatearPrecio(r.precio);

    /* Rango de años: si son iguales mostramos uno solo */
    var anios = (r.anioDesde === r.anioHasta)
      ? String(r.anioDesde)
      : r.anioDesde + '–' + r.anioHasta;

    /* Llenar referencia y precio en el card */
    document.getElementById('res-referencia').textContent = r.referencia;
    document.getElementById('res-precio').textContent     = precioFormateado;

    /* Construir y asignar mensaje WhatsApp al hacer clic en el botón,
       para que incluya la dirección que el cliente escribe */
    var btnWa = document.getElementById('btn-whatsapp-buscador');

    function construirMensaje() {
      var direccion = (document.getElementById('res-direccion').value.trim())
        || '(escribe tu dirección aquí)';
      var lineas = [
        '*Hola, quiero pedir una batería a domicilio en Medellín*',
        '',
        '🚗 Vehículo: ' + r.marca + ' ' + r.modelo,
        '📅 Año: ' + anios,
        '⚙️ Motor: ' + r.cilindraje,
        '📦 Referencia batería: ' + r.referencia,
        '💰 Precio: ' + precioFormateado,
        '',
        '📍 Mi dirección: ' + direccion,
        '',
        '¿Pueden venir ahora? ¡Gracias!'
      ];
      return lineas.join('\n');
    }

    /* Actualizar href cada vez que se hace clic — captura la dirección escrita */
    btnWa.onclick = function () {
      btnWa.href = 'https://wa.me/' + window.WA_NUMERO +
                   '?text=' + encodeURIComponent(construirMensaje());
    };

    /* Href por defecto en caso de clic inmediato sin dirección */
    btnWa.href = 'https://wa.me/' + window.WA_NUMERO +
                 '?text=' + encodeURIComponent(construirMensaje());

    /* Mostrar el card (estaba hidden) y hacer scroll suave hasta él */
    var seccion = document.getElementById('resultado-bateria');
    seccion.hidden = false;
    seccion.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function mostrarConsultaDirecta(marca, modelo) {
    document.getElementById('res-referencia').textContent = 'Consulta directa';
    document.getElementById('res-precio').textContent     = 'Pregúntanos por WhatsApp';

    var msg = encodeURIComponent(
      'Hola, busco batería para ' + marca + ' ' + modelo + '. ¿Tienen disponibilidad?'
    );
    var btnWa = document.getElementById('btn-whatsapp-buscador');
    btnWa.href = 'https://wa.me/' + window.WA_NUMERO + '?text=' + msg;

    var seccion = document.getElementById('resultado-bateria');
    seccion.hidden = false;
    seccion.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }


  /* ══════════════════════════════════════════════════════════════
     UTILIDADES
  ══════════════════════════════════════════════════════════════ */

  /* Formatea número a moneda colombiana: 250000 → "$250.000 COP" */
  function formatearPrecio(num) {
    if (typeof num !== 'number') return String(num);
    return '$' + num.toLocaleString('es-CO') + ' COP';
  }

  /* Resetea el select de modelos a su estado inicial (disabled) */
  function reiniciarModelo() {
    selModelo.innerHTML  = '<option value="">— Primero elige marca —</option>';
    selModelo.disabled   = true;
    btnBuscar.disabled   = true;
  }

  /* Oculta el card de resultado */
  function ocultarResultado() {
    var sec = document.getElementById('resultado-bateria');
    if (sec) sec.hidden = true;
  }

})();
