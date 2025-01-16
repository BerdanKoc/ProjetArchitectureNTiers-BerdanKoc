import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import sqlite3 from 'sqlite3';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

const db = new sqlite3.Database('./trivia.db', (err) => {
    if (err) {
        console.error('Erreur de connexion à la base de données:', err);
    } else {
        console.log('Connexion à la base de données établie');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.run(`
        CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT NOT NULL,
            reponse1 TEXT NOT NULL,
            reponse2 TEXT NOT NULL,
            reponse3 TEXT NOT NULL,
            reponse4 TEXT NOT NULL,
            bonne_reponse INTEGER NOT NULL CHECK(bonne_reponse BETWEEN 1 AND 4)
        )
    `);
}

io.on('connection', (socket) => {
    console.log('Nouveau client connecté');

    socket.on('disconnect', () => {
        console.log('Client déconnecté');
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});