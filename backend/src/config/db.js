import mysql from "mysql2/promise";

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    // Sin dateStrings ni timezone: mysql2 devuelve objetos Date que JSON.stringify
    // serializa como ISO UTC ("...Z"), el frontend los parsea correctamente sin conversión
});

export default pool;