const express = require('express');
const path = require('path');
const client = require('./client');

const app = express();
const PORT = 3000;

// Servir archivos estáticos desde la carpeta public
app.use(express.static('public'));

// Ruta principal - servir el HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint API para obtener cotizaciones
app.get('/api/cotizaciones', async (req, res) => {
    try {
        const respuesta = await client.get('/');
        const { status, results } = respuesta.data;

        if (status === 200) {
            // Filtrar solo las monedas que nos interesan: USD, PYG, BRL, UYU
            const monedasInteres = ['USD', 'PYG', 'BRL', 'UYU'];
            const cotizaciones = results.detalle
                .filter(moneda => monedasInteres.includes(moneda.codigoMoneda))
                .map(moneda => ({
                    codigoMoneda: moneda.codigoMoneda,
                    descripcion: moneda.descripcion,
                    tipoCotizacion: moneda.tipoCotizacion
                }));

            res.json({
                success: true,
                fecha: results.fecha,
                cotizaciones
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'La API respondió con un estado inesperado'
            });
        }
    } catch (error) {
        console.error('Error al obtener cotizaciones:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});