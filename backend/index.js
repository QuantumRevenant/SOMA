require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rutas
const authRoutes = require('./routes/auth');
app.use('/api', authRoutes);

// Iniciar servidor
app.listen(3000, () => {
    console.log("Servidor backend corriendo en http://localhost:3000");
});