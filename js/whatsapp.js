/**
 * whatsapp.js — Baterías a Domicilio Medellín
 * ─────────────────────────────────────────────────────────────────
 * Maneja el formulario de contacto de la sección "Pide tu batería ahora".
 *
 * FLUJO:
 *   1. Usuario llena el formulario (nombre, teléfono, dirección, carro)
 *   2. Hace click en "Solicitar batería ahora"
 *   3. Validamos que nombre y teléfono estén completos
 *   4. Construimos un mensaje WhatsApp con la info del cliente
 *   5. Abrimos WhatsApp en una nueva pestaña con el mensaje pre-cargado
 *
 * Campos del formulario:
 *   #c-nombre  → nombre del cliente (required)
 *   #c-tel     → teléfono del cliente (required)
 *   #c-dir     → dirección o barrio (opcional)
 *   #c-carro   → marca y modelo del carro (opcional)
 *
 * Variable global requerida (definida en index.html):
 *   window.WA_NUMERO → número WhatsApp sin '+' ni espacios
 */

(function () {
  'use strict';

  /* Seleccionar el formulario por su clase */
  var form = document.querySelector('.contacto__form');

  if (!form) return; /* salir si el formulario no existe en esta página */

  /* ══════════════════════════════════════════════════════════════
     ESCUCHAR EL EVENTO 'submit'
     Interceptamos el envío del formulario para redirigir a WhatsApp
     en lugar de hacer POST (el formulario tiene action="#" novalidate).
  ══════════════════════════════════════════════════════════════ */
  form.addEventListener('submit', function (e) {
    e.preventDefault(); /* evitar recarga de la página */

    /* Leer valores de los campos (trim elimina espacios al inicio/final) */
    var nombre    = (document.getElementById('c-nombre').value   || '').trim();
    var telefono  = (document.getElementById('c-tel').value      || '').trim();
    var direccion = (document.getElementById('c-dir').value      || '').trim();
    var carro     = (document.getElementById('c-carro').value    || '').trim();

    /* ── Validación básica ────────────────────────────────────── */
    if (!nombre) {
      mostrarError('c-nombre', 'Por favor ingresa tu nombre');
      return;
    }
    if (!telefono) {
      mostrarError('c-tel', 'Por favor ingresa tu teléfono de contacto');
      return;
    }

    limpiarErrores();

    /* ── Construir mensaje pre-cargado para WhatsApp ─────────── */
    var lineas = [
      '*Hola, quiero solicitar una batería a domicilio en Medellín* 🔋',
      ''
    ];

    lineas.push('👤 Nombre: ' + nombre);
    lineas.push('📱 Teléfono: ' + telefono);

    if (direccion) {
      lineas.push('📍 Dirección: ' + direccion);
    }
    if (carro) {
      lineas.push('🚗 Carro: ' + carro);
    }

    lineas.push('');
    lineas.push('¿Pueden venir ahora? ¡Gracias!');

    var mensaje = lineas.join('\n');

    /* ── Abrir WhatsApp en nueva pestaña ─────────────────────── */
    var url = 'https://wa.me/' + window.WA_NUMERO +
              '?text=' + encodeURIComponent(mensaje);

    window.open(url, '_blank', 'noopener,noreferrer');

    /* ── Feedback visual: cambiar texto del botón temporalmente ─ */
    var btnSubmit = form.querySelector('button[type="submit"]');
    if (btnSubmit) {
      var textoOriginal = btnSubmit.textContent;
      btnSubmit.textContent = '✓ Abriendo WhatsApp...';
      btnSubmit.disabled = true;

      /* Restaurar el botón a los 3 segundos */
      setTimeout(function () {
        btnSubmit.textContent = textoOriginal;
        btnSubmit.disabled = false;
      }, 3000);
    }
  });


  /* ══════════════════════════════════════════════════════════════
     UTILIDADES DE VALIDACIÓN
  ══════════════════════════════════════════════════════════════ */

  /* Muestra un mensaje de error debajo del campo indicado */
  function mostrarError(campoId, mensaje) {
    var campo = document.getElementById(campoId);
    if (!campo) return;

    /* Quitar error previo si existe */
    var errorPrevio = campo.parentNode.querySelector('.form-error');
    if (errorPrevio) errorPrevio.parentNode.removeChild(errorPrevio);

    /* Crear y añadir el mensaje de error */
    var span = document.createElement('span');
    span.className   = 'form-error';
    span.textContent = mensaje;
    span.setAttribute('role', 'alert'); /* accesibilidad: lector de pantalla lo anuncia */
    campo.parentNode.appendChild(span);

    /* Enfocar el campo con error */
    campo.focus();
  }

  /* Elimina todos los mensajes de error del formulario */
  function limpiarErrores() {
    var errores = form.querySelectorAll('.form-error');
    for (var i = 0; i < errores.length; i++) {
      errores[i].parentNode.removeChild(errores[i]);
    }
  }

})();
