const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mysql = require("mysql2");

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3307
});

db.connect((err) => {
    if (err) {
        console.error("❌ Error al conectar MySQL:", err);
        return;
    }
    console.log("✅ Conectado a la base de datos MySQL");
});

module.exports = db;