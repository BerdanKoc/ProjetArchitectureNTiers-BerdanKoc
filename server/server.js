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

// Stockage des sessions de jeu en mémoire
const gameSessions = new Map();

// Génère un code unique pour la session
function generateSessionCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Connexion à la base de données
const db = new sqlite3.Database('./trivia.db', (err) => {
    if (err) {
        console.error('Erreur de connexion à la base de données:', err);
    } else {
        console.log('Connexion à la base de données établie');
        initializeDatabase();
    }
});

// Initialisation de la base de données
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

    // Création d'une nouvelle partie
    socket.on('createGame', ({ numberOfQuestions }) => {
        const sessionCode = generateSessionCode();
        const gameSession = {
            code: sessionCode,
            host: socket.id,
            players: [],
            numberOfQuestions,
            status: 'waiting', // waiting, playing, finished
            questions: []
        };
        
        gameSessions.set(sessionCode, gameSession);
        socket.join(sessionCode);
        
        socket.emit('gameCreated', { 
            sessionCode,
            isHost: true
        });
    });

    // Rejoindre une partie
    socket.on('joinGame', ({ sessionCode, playerName }) => {
        const session = gameSessions.get(sessionCode);
        
        if (!session) {
            socket.emit('error', { message: 'Session non trouvée' });
            return;
        }

        if (session.status !== 'waiting') {
            socket.emit('error', { message: 'La partie a déjà commencé' });
            return;
        }

        const player = {
            id: socket.id,
            name: playerName,
            score: 0
        };

        session.players.push(player);
        socket.join(sessionCode);

        // Informer le joueur qu'il a rejoint la partie
        socket.emit('gameJoined', { 
            sessionCode,
            isHost: false
        });

        // Informer tous les joueurs de la partie du nouveau joueur
        io.to(sessionCode).emit('playersList', {
            players: session.players
        });
    });

    socket.on('disconnect', () => {
        // Gérer la déconnexion et mettre à jour les sessions si nécessaire
        gameSessions.forEach((session, code) => {
            session.players = session.players.filter(player => player.id !== socket.id);
            if (session.host === socket.id) {
                // Si l'hôte se déconnecte, on termine la partie
                io.to(code).emit('gameEnded', { reason: 'Host disconnected' });
                gameSessions.delete(code);
            } else {
                // Mettre à jour la liste des joueurs pour les autres
                io.to(code).emit('playersList', { players: session.players });
            }
        });
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});