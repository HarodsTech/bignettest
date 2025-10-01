const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Servir el archivo HTML principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint para procesar compras (opcional)
app.post('/api/purchase', async (req, res) => {
    try {
        const { product, discordId, price } = req.body;
        
        // Aquí puedes agregar lógica de procesamiento
        console.log('Nueva compra recibida:', { product, discordId, price });
        
        // Simular procesamiento
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        res.json({ 
            success: true, 
            message: 'Compra procesada correctamente',
            orderId: 'ORD-' + Date.now()
        });
    } catch (error) {
        console.error('Error procesando compra:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// Endpoint de salud para Render
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'BigNet Website'
    });
});

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 BigNet server running on port ${PORT}`);
    console.log(`📧 Environment: ${process.env.NODE_ENV || 'development'}`);
});