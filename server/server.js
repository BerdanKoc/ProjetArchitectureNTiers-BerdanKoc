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

    db.get('SELECT COUNT(*) as count FROM questions', [], (err, row) => {
        if (err) {
            console.error('Erreur lors du comptage des questions:', err);
            return;
        }

        if (row.count === 0) {
            const questions = [
                {
                    question: "Quelle est la capitale de la France ?",
                    reponse1: "Paris",
                    reponse2: "Londres",
                    reponse3: "Berlin",
                    reponse4: "Madrid",
                    bonne_reponse: 1
                },
                {
                    question: "Qui a peint la Joconde ?",
                    reponse1: "Van Gogh",
                    reponse2: "Leonard de Vinci",
                    reponse3: "Picasso",
                    reponse4: "Michel-Ange",
                    bonne_reponse: 2
                },
                {
                    question: "Quel est le plus grand océan du monde ?",
                    reponse1: "Atlantique",
                    reponse2: "Indien",
                    reponse3: "Pacifique",
                    reponse4: "Arctique",
                    bonne_reponse: 3
                },
                {
                    question: "En quelle année a eu lieu la Révolution française ?",
                    reponse1: "1759",
                    reponse2: "1769",
                    reponse3: "1779",
                    reponse4: "1789",
                    bonne_reponse: 4
                },
                {
                    question: "Quel est le plus grand pays du monde ?",
                    reponse1: "Russie",
                    reponse2: "Canada",
                    reponse3: "Chine",
                    reponse4: "États-Unis",
                    bonne_reponse: 1
                }
            ];

            const insertQuestion = db.prepare(`
                INSERT INTO questions (question, reponse1, reponse2, reponse3, reponse4, bonne_reponse)
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            questions.forEach(q => {
                insertQuestion.run([
                    q.question,
                    q.reponse1,
                    q.reponse2,
                    q.reponse3,
                    q.reponse4,
                    q.bonne_reponse
                ]);
            });

            insertQuestion.finalize();
            console.log('Questions de test ajoutées à la base de données');
        }
    });
}

function getRandomQuestions(numberOfQuestions) {
    return new Promise((resolve, reject) => {
        db.all(
            'SELECT * FROM questions ORDER BY RANDOM() LIMIT ?',
            [numberOfQuestions],
            (err, questions) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(questions);
            }
        );
    });
}

io.on('connection', (socket) => {
    console.log('Nouveau client connecté');

    // Création d'une nouvelle partie
    socket.on('createGame', ({ numberOfQuestions, maxPlayers }) => {
        const sessionCode = generateSessionCode();
        /** @type {{ code: string, host: string, players: Array<{id: string, name: string, isHost: boolean}>, numberOfQuestions: number, maxPlayers: number, status: string }} */
        const gameSession = {
            code: sessionCode,
            host: socket.id,
            players: [],
            numberOfQuestions,
            maxPlayers: maxPlayers || 4,
            status: 'waiting'
        };
        
        gameSessions.set(sessionCode, gameSession);
        socket.join(sessionCode);
        
        gameSession.players.push({
            id: socket.id,
            name: 'Hôte',
            isHost: true
        });

        socket.emit('gameCreated', { 
            sessionCode,
            isHost: true
        });

        // Émettre la liste mise à jour
        io.to(sessionCode).emit('playersList', {
            players: gameSession.players
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

        if (session.players.length >= session.maxPlayers) {
            socket.emit('error', { message: 'La partie est complète' });
            return;
        }

        const player = {
            id: socket.id,
            name: playerName,
            isHost: false
        };

        session.players.push(player);
        socket.join(sessionCode);

        socket.emit('gameJoined', { 
            sessionCode,
            isHost: false
        });

        io.to(sessionCode).emit('playersList', {
            players: session.players
        });
    });

    socket.on('joinRoom', ({ sessionCode }) => {
        const session = gameSessions.get(sessionCode);
        if (session) {
            socket.join(sessionCode);
            const isHost = session.host === socket.id;
            socket.emit('gameCreated', { isHost });
            io.to(sessionCode).emit('playersList', {
                players: session.players
            });
        }
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

    socket.on('startGame', async ({ sessionCode }) => {
        const session = gameSessions.get(sessionCode);
        if (!session) return;

        try {
            const questions = await getRandomQuestions(session.numberOfQuestions);
            console.log('Questions récupérées:', questions); // Debug

            session.questions = questions;
            session.currentQuestionIndex = 0;
            session.status = 'playing';
            session.questionStartTime = Date.now();

            const firstQuestion = questions[0];
            console.log('Première question:', firstQuestion); // Debug

            io.to(sessionCode).emit('gameStarted', {
                question: {
                    text: firstQuestion.question,
                    options: [
                        firstQuestion.reponse1,
                        firstQuestion.reponse2,
                        firstQuestion.reponse3,
                        firstQuestion.reponse4
                    ]
                },
                timeLimit: 10
            });

        } catch (error) {
            console.error('Erreur lors du démarrage du jeu:', error);
            socket.emit('error', { message: 'Erreur lors du démarrage du jeu' });
        }
    });

    socket.on('submitAnswer', ({ sessionCode, answer }) => {
        const session = gameSessions.get(sessionCode);
        if (!session || session.status !== 'playing') return;

        const currentQuestion = session.questions[session.currentQuestionIndex];
        const player = session.players.find(p => p.id === socket.id);
        
        if (!player) return;

        player.hasAnswered = true;
        
        const timeElapsed = Date.now() - session.questionStartTime;
        let points = 0;

        if (answer === currentQuestion.bonne_reponse) {
            if (timeElapsed <= 5000) points = 10;
            else if (timeElapsed <= 10000) points = 5;
            else points = 2;
        }

        player.score = (player.score || 0) + points;

        const allPlayersAnswered = session.players.every(p => p.hasAnswered);
        
        if (allPlayersAnswered) {
            io.to(sessionCode).emit('questionResults', {
                correctAnswer: currentQuestion.bonne_reponse,
                scores: session.players.map(p => ({
                    name: p.name,
                    score: p.score || 0
                }))
            });

            setTimeout(() => {
                session.currentQuestionIndex++;
                
                if (session.currentQuestionIndex >= session.questions.length) {
                    session.status = 'finished';
                    io.to(sessionCode).emit('gameFinished', {
                        finalScores: session.players
                            .map(p => ({
                                name: p.name,
                                score: p.score || 0
                            }))
                            .sort((a, b) => b.score - a.score)
                    });
                } else {
                    session.players.forEach(p => p.hasAnswered = false);
                    session.questionStartTime = Date.now();

                    const nextQuestion = session.questions[session.currentQuestionIndex];
                    io.to(sessionCode).emit('nextQuestion', {
                        question: {
                            text: nextQuestion.question,
                            options: [
                                nextQuestion.reponse1,
                                nextQuestion.reponse2,
                                nextQuestion.reponse3,
                                nextQuestion.reponse4
                            ]
                        },
                        timeLimit: 10
                    });
                }
            }, 3000);
        }
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});