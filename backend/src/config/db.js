import mysql from "mysql2/promise";

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    timezone: "+00:00",  // DATETIME en MariaDB no tiene zona → tratarlo como UTC puro
    dateStrings: true,      // Devolver fechas como "YYYY-MM-DD HH:MM:SS" en vez de Date objects
    // Evita que JSON.stringify convierta a UTC y desfase la hora en Lima
});

export default pool;