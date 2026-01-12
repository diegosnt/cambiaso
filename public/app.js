// Variable global para almacenar las cotizaciones
let cotizacionesData = null;

// Claves para localStorage
const STORAGE_KEYS = {
    COTIZACIONES: 'cotizaciones_bcra',
    THEME: 'theme_preference'
};

/**
 * Guardar cotizaciones en localStorage
 */
function guardarCotizacionesEnStorage(data) {
    try {
        const dataConTimestamp = {
            ...data,
            timestamp: new Date().getTime()
        };
        localStorage.setItem(STORAGE_KEYS.COTIZACIONES, JSON.stringify(dataConTimestamp));
        console.log('Cotizaciones guardadas en localStorage');
    } catch (error) {
        console.error('Error al guardar en localStorage:', error);
    }
}

/**
 * Cargar cotizaciones desde localStorage
 */
function cargarCotizacionesDesdeStorage() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.COTIZACIONES);
        if (data) {
            const parsed = JSON.parse(data);
            console.log('Cotizaciones cargadas desde localStorage');
            return parsed;
        }
    } catch (error) {
        console.error('Error al leer localStorage:', error);
    }
    return null;
}

/**
 * Cargar cotizaciones al inicio
 */
async function cargarCotizaciones() {
    mostrarLoading();

    try {
        const response = await fetch('/api/cotizaciones');
        const data = await response.json();

        ocultarLoading();

        if (data.success) {
            // Agregar ARS como moneda base con cotización 1.0
            const cotizacionesConARS = {
                ...data,
                cotizaciones: [
                    {
                        codigoMoneda: 'ARS',
                        descripcion: 'PESO ARGENTINO',
                        tipoCotizacion: 1.0
                    },
                    ...data.cotizaciones
                ]
            };
            cotizacionesData = cotizacionesConARS;
            // Guardar en localStorage
            guardarCotizacionesEnStorage(cotizacionesConARS);
            console.log('Cotizaciones cargadas exitosamente desde la API');
            // Mostrar las tarjetas de cotizaciones inmediatamente
            mostrarTarjetasCotizaciones();
            // Validar el input para habilitar el botón si ya hay un monto
            validarInput();
        } else {
            throw new Error(data.error || 'Error desconocido');
        }
    } catch (error) {
        console.error('Error al obtener cotizaciones de la API:', error);
        ocultarLoading();

        // Intentar cargar desde localStorage
        const datosGuardados = cargarCotizacionesDesdeStorage();
        if (datosGuardados) {
            cotizacionesData = datosGuardados;
            mostrarTarjetasCotizaciones();
            validarInput();
            mostrarError('No se pudo conectar con la API. Mostrando cotizaciones guardadas.');
        } else {
            mostrarError('Error de conexión y no hay cotizaciones guardadas: ' + error.message);
        }
    }
}

/**
 * Obtiene la moneda de origen seleccionada
 */
function obtenerMonedaOrigen() {
    const select = document.getElementById('moneda-origen');
    const selectDesktop = document.getElementById('moneda-origen-desktop');
    // Retornar el valor del select visible (móvil o desktop)
    return window.innerWidth >= 768 ? selectDesktop.value : select.value;
}

/**
 * Sincroniza los selects móvil y desktop
 */
function sincronizarSelects(source) {
    const selectMobile = document.getElementById('moneda-origen');
    const selectDesktop = document.getElementById('moneda-origen-desktop');

    if (source === 'mobile') {
        selectDesktop.value = selectMobile.value;
    } else {
        selectMobile.value = selectDesktop.value;
    }
}

/**
 * Sincroniza los inputs móvil y desktop
 */
function sincronizarInputs(source) {
    const inputMobile = document.getElementById('monto');
    const inputDesktop = document.getElementById('monto-desktop');

    if (source === 'mobile') {
        inputDesktop.value = inputMobile.value;
    } else {
        inputMobile.value = inputDesktop.value;
    }
}

/**
 * Muestra las tarjetas de cotizaciones sin cálculos
 */
function mostrarTarjetasCotizaciones() {
    if (!cotizacionesData) return;

    const resultsDiv = document.getElementById('results');
    const cotizacionesDiv = document.getElementById('cotizaciones');
    const footerInfo = document.getElementById('footer-info');
    const fechaFooter = document.getElementById('fecha-footer');
    const monedaOrigen = obtenerMonedaOrigen();

    // Mostrar la fecha en el footer
    fechaFooter.textContent = `Cotizaciones del ${formatearFecha(cotizacionesData.fecha)}`;
    footerInfo.style.display = 'block';

    // Limpiar cotizaciones previas
    cotizacionesDiv.innerHTML = '';

    // Crear una tarjeta para cada moneda (excluyendo la moneda de origen)
    cotizacionesData.cotizaciones
        .filter(moneda => moneda.codigoMoneda !== monedaOrigen)
        .forEach(moneda => {
            const card = crearTarjetaMoneda(moneda, null, monedaOrigen);
            cotizacionesDiv.appendChild(card);
        });

    // Mostrar el div de resultados
    resultsDiv.classList.add('show');
}

/**
 * Función para calcular y actualizar las cotizaciones
 */
function calcularCotizaciones() {
    // Obtener el monto ingresado (de móvil o desktop según sea visible)
    const montoInputMobile = document.getElementById('monto');
    const montoInputDesktop = document.getElementById('monto-desktop');
    const montoInput = window.innerWidth >= 768 ? montoInputDesktop : montoInputMobile;
    const monto = parseFloat(montoInput.value);
    const monedaOrigen = obtenerMonedaOrigen();

    // Validar que el monto sea válido
    if (!monto || monto <= 0) {
        mostrarError('Por favor ingresá un monto válido mayor a 0');
        return;
    }

    // Validar que las cotizaciones estén cargadas
    if (!cotizacionesData) {
        mostrarError('Las cotizaciones aún no están disponibles');
        return;
    }

    // Ocultar error
    ocultarError();

    // Actualizar las tarjetas con el cálculo
    actualizarTarjetasConMonto(monto, monedaOrigen);
}

/**
 * Actualiza las tarjetas existentes con el monto calculado
 */
function actualizarTarjetasConMonto(monto, monedaOrigenCodigo) {
    if (!cotizacionesData) return;

    // Obtener la cotización de la moneda origen
    const monedaOrigen = cotizacionesData.cotizaciones.find(
        m => m.codigoMoneda === monedaOrigenCodigo
    );

    if (!monedaOrigen) return;

    // Convertir el monto a pesos argentinos (ARS) primero
    const montoEnARS = monto * monedaOrigen.tipoCotizacion;

    // Convertir de ARS a cada moneda destino
    cotizacionesData.cotizaciones
        .filter(moneda => moneda.codigoMoneda !== monedaOrigenCodigo)
        .forEach(moneda => {
            const montoConvertido = montoEnARS / moneda.tipoCotizacion;
            const valueElement = document.querySelector(`#value-${moneda.codigoMoneda}`);

            if (valueElement) {
                valueElement.textContent = formatearMoneda(montoConvertido, moneda.codigoMoneda);
            }
        });
}

/**
 * Crea una tarjeta para mostrar la conversión de una moneda
 */
function crearTarjetaMoneda(moneda, monto, monedaOrigenCodigo) {
    const card = document.createElement('div');
    card.className = 'currency-card';

    let valorMostrar = '';

    // Si hay un monto, calcular la conversión
    if (monto !== null && monto > 0 && monedaOrigenCodigo) {
        const monedaOrigen = cotizacionesData.cotizaciones.find(
            m => m.codigoMoneda === monedaOrigenCodigo
        );
        if (monedaOrigen) {
            // Convertir: monto en origen -> ARS -> destino
            const montoEnARS = monto * monedaOrigen.tipoCotizacion;
            const montoConvertido = montoEnARS / moneda.tipoCotizacion;
            valorMostrar = formatearMoneda(montoConvertido, moneda.codigoMoneda);
        }
    }

    // Calcular la cotización en relación a la moneda de origen
    const monedaOrigenParaCotizacion = monedaOrigenCodigo || 'ARS';
    const monedaOrigenObj = cotizacionesData.cotizaciones.find(
        m => m.codigoMoneda === monedaOrigenParaCotizacion
    );

    let textoCotizacion = '';
    if (monedaOrigenObj) {
        // Si la moneda origen es ARS, mostrar: 1 [destino] = X ARS
        if (monedaOrigenParaCotizacion === 'ARS') {
            textoCotizacion = `1 ${moneda.codigoMoneda} = ${formatearNumero(moneda.tipoCotizacion)} ${monedaOrigenParaCotizacion}`;
        } else {
            // Si la moneda origen NO es ARS, mostrar: 1 [origen] = X [destino]
            const cotizacionMostrar = monedaOrigenObj.tipoCotizacion / moneda.tipoCotizacion;
            textoCotizacion = `1 ${monedaOrigenParaCotizacion} = ${formatearNumero(cotizacionMostrar)} ${moneda.codigoMoneda}`;
        }
    }

    card.innerHTML = `
        <div class="currency-header-info">
            <div class="currency-code">${moneda.codigoMoneda}</div>
            <div class="currency-name">${moneda.descripcion}</div>
        </div>
        <div class="cotizacion-info">
            ${textoCotizacion}
        </div>
        <div class="currency-value" id="value-${moneda.codigoMoneda}">
            ${valorMostrar}
        </div>
    `;

    return card;
}

/**
 * Formatea un número como moneda
 */
function formatearMoneda(valor, codigoMoneda) {
    // Determinar el número de decimales según la moneda
    let decimales = 2;

    // Para el Guaraní paraguayo, usar 0 decimales (no tiene centavos)
    if (codigoMoneda === 'PYG') {
        decimales = 0;
    }

    return new Intl.NumberFormat('es-AR', {
        style: 'decimal',
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales
    }).format(valor);
}

/**
 * Formatea un número con separadores de miles
 */
function formatearNumero(valor) {
    return new Intl.NumberFormat('es-AR', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(valor);
}

/**
 * Formatea una fecha en formato legible
 */
function formatearFecha(fecha) {
    const [año, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${año}`;
}

/**
 * Muestra un mensaje de error
 */
function mostrarError(mensaje) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = mensaje;
    errorDiv.classList.add('show');
}

/**
 * Oculta el mensaje de error
 */
function ocultarError() {
    const errorDiv = document.getElementById('error');
    errorDiv.classList.remove('show');
}

/**
 * Muestra el indicador de carga
 */
function mostrarLoading() {
    const loadingDiv = document.getElementById('loading');
    loadingDiv.classList.add('show');

    // Deshabilitar ambos botones mientras carga
    document.getElementById('calcular').disabled = true;
    document.getElementById('calcular-desktop').disabled = true;
}

/**
 * Oculta el indicador de carga
 */
function ocultarLoading() {
    const loadingDiv = document.getElementById('loading');
    loadingDiv.classList.remove('show');

    // Los botones se habilitarán mediante validarInput()
}

/**
 * Validar el input y habilitar/deshabilitar el botón
 */
function validarInput(source) {
    // Sincronizar inputs si es necesario
    if (source) {
        sincronizarInputs(source);
    }

    const montoInputMobile = document.getElementById('monto');
    const montoInputDesktop = document.getElementById('monto-desktop');
    const botonMobile = document.getElementById('calcular');
    const botonDesktop = document.getElementById('calcular-desktop');

    const monto = parseFloat(window.innerWidth >= 768 ? montoInputDesktop.value : montoInputMobile.value);

    // Habilitar/deshabilitar ambos botones
    const habilitado = monto && monto > 0 && cotizacionesData;
    botonMobile.disabled = !habilitado;
    botonDesktop.disabled = !habilitado;
}

/**
 * Actualiza el label del input según la moneda seleccionada
 */
function actualizarLabelMonto() {
    const select = window.innerWidth >= 768
        ? document.getElementById('moneda-origen-desktop')
        : document.getElementById('moneda-origen');
    const opcionSeleccionada = select.options[select.selectedIndex];
    const nombreMoneda = opcionSeleccionada.text;

    // Actualizar ambos labels
    const labelElement = document.getElementById('label-monto');
    const labelElementDesktop = document.getElementById('label-monto-desktop');

    labelElement.textContent = `Monto en ${nombreMoneda}`;
    labelElementDesktop.textContent = `Monto en ${nombreMoneda}`;
}

/**
 * Maneja el cambio de moneda de origen
 */
function manejarCambioMoneda(source) {
    // Sincronizar selects
    sincronizarSelects(source);

    // Actualizar el label
    actualizarLabelMonto();

    // Limpiar el valor de ambos inputs
    document.getElementById('monto').value = '';
    document.getElementById('monto-desktop').value = '';

    // Recargar las tarjetas sin valores calculados
    mostrarTarjetasCotizaciones();

    // Validar el input
    validarInput();
}

/**
 * Toggle del tema (claro/oscuro)
 */
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    html.setAttribute('data-theme', newTheme);
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);

    // Actualizar el icono del botón
    const themeIcon = document.getElementById('theme-icon');

    if (newTheme === 'dark') {
        themeIcon.src = 'sun.svg';
        themeIcon.alt = 'Modo Claro';
    } else {
        themeIcon.src = 'moon.svg';
        themeIcon.alt = 'Modo Oscuro';
    }
}

/**
 * Cargar el tema guardado
 */
function cargarTemaGuardado() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    if (savedTheme) {
        const html = document.documentElement;
        html.setAttribute('data-theme', savedTheme);

        // Actualizar el icono del botón
        const themeIcon = document.getElementById('theme-icon');

        if (savedTheme === 'dark') {
            themeIcon.src = 'sun.svg';
            themeIcon.alt = 'Modo Claro';
        } else {
            themeIcon.src = 'moon.svg';
            themeIcon.alt = 'Modo Oscuro';
        }
    }
}

/**
 * Event listeners
 */
document.addEventListener('DOMContentLoaded', function() {
    // Cargar el tema guardado
    cargarTemaGuardado();

    // Cargar cotizaciones al inicio
    cargarCotizaciones();

    // Elementos móviles
    const montoInputMobile = document.getElementById('monto');
    const monedaSelectMobile = document.getElementById('moneda-origen');

    // Elementos desktop
    const montoInputDesktop = document.getElementById('monto-desktop');
    const monedaSelectDesktop = document.getElementById('moneda-origen-desktop');

    // Event listeners móviles
    monedaSelectMobile.addEventListener('change', () => manejarCambioMoneda('mobile'));
    montoInputMobile.addEventListener('input', () => validarInput('mobile'));
    montoInputMobile.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !document.getElementById('calcular').disabled) {
            calcularCotizaciones();
        }
    });

    // Event listeners desktop
    monedaSelectDesktop.addEventListener('change', () => manejarCambioMoneda('desktop'));
    montoInputDesktop.addEventListener('input', () => validarInput('desktop'));
    montoInputDesktop.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !document.getElementById('calcular-desktop').disabled) {
            calcularCotizaciones();
        }
    });
});
