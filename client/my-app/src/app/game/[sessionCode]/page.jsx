'use client';
import React from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Container, Typography, Box, Button, List, ListItem, ListItemText, Paper, Grid } from '@mui/material';
import { socket } from '../../../services/socket';

export default function GameRoom() {
    const router = useRouter();
    const params = useParams();
    const sessionCode = params.sessionCode;
    const [players, setPlayers] = useState([{id: '', name: ''}]);
    const [gameStatus, setGameStatus] = useState('waiting');
    const [isHost, setIsHost] = useState(false);
    const [error, setError] = useState('');
    const [currentQuestion, setCurrentQuestion] = useState({
        text: '',
        options: []
    });
    const [timeLeft, setTimeLeft] = useState(10);
    const [hasAnswered, setHasAnswered] = useState(false);
    const [timer, setTimer] = useState(null);
    const [questionResults, setQuestionResults] = useState({
        correctAnswer: null,
        scores: [{
            name: '',
            score: 0,
            id: ''
        }]
    });
    const [finalScores, setFinalScores] = useState([{
        name: '',
        score: 0,
        id: ''
    }]);

    useEffect(() => {
        if (!sessionCode) return;

        socket.emit('joinRoom', { sessionCode });

        socket.on('gameCreated', ({ isHost }) => {
            setIsHost(isHost);
            console.log('Host status:', isHost);
        });

        socket.on('playersList', ({ players }) => {
            console.log('Players updated:', players);
            setPlayers(players);
        });

        socket.on('gameStarted', ({ question, timeLimit }) => {
            console.log('Question reçue:', question);
            setGameStatus('playing');
            setCurrentQuestion(question);
            setHasAnswered(false);
            if (timer) clearInterval(timer);
            startTimer(timeLimit);
        });

        socket.on('nextQuestion', ({ question, timeLimit }) => {
            setCurrentQuestion(question);
            setHasAnswered(false);
            if (timer) clearInterval(timer);
            startTimer(timeLimit);
        });

        socket.on('error', ({ message }) => {
            setError(message);
            setTimeout(() => setError(''), 3000);
        });

        socket.on('gameEnded', ({ reason }) => {
            if (reason === 'Host disconnected') {
                setError('L\'hôte s\'est déconnecté');
                setTimeout(() => router.push('/'), 2000);
            }
        });

        socket.on('questionResults', (results) => {
            setQuestionResults(results);
            setTimeout(() => setQuestionResults({ correctAnswer: null, scores: [] }), 3000);
        });

        socket.on('gameFinished', ({ finalScores }) => {
            setGameStatus('finished');
            setFinalScores(finalScores);
        });

        return () => {
            if (timer) clearInterval(timer);
            socket.off('joinRoom');
            socket.off('gameCreated');
            socket.off('playersList');
            socket.off('gameStarted');
            socket.off('nextQuestion');
            socket.off('error');
            socket.off('gameEnded');
            socket.off('questionResults');
            socket.off('gameFinished');
        };
    }, [sessionCode, router, timer]);

    useEffect(() => {
        console.log('État actuel:', {
            gameStatus,
            currentQuestion,
            questionResults
        });
    }, [gameStatus, currentQuestion, questionResults]);

    const startGame = () => {
        if (players.length < 2) {
            setError('Il faut au moins 2 joueurs pour démarrer');
            return;
        }
        socket.emit('startGame', { sessionCode });
    };

    const startTimer = (duration) => {
        setTimeLeft(duration);
        if (timer) clearInterval(timer);
        
        const newTimer = setInterval(() => {
            setTimeLeft((prevTime) => {
                if (prevTime <= 1) {
                    clearInterval(newTimer);
                    if (!hasAnswered) {
                        submitAnswer(-1);
                    }
                    return 0;
                }
                return prevTime - 1;
            });
        }, 1000);
        
        // @ts-ignore
        setTimer(newTimer);
    };

    const submitAnswer = (answerIndex) => {
        if (hasAnswered) return;
        setHasAnswered(true);
        socket.emit('submitAnswer', {
            sessionCode,
            answer: answerIndex + 1
        });
    };

    const renderGame = () => {
        if (!currentQuestion || !currentQuestion.text) {
            console.log('Pas de question à afficher');
            return null;
        }

        console.log('Rendu du jeu, question:', currentQuestion);
        return (
            <Box sx={{ mt: 4 }}>
                <Typography variant="h5" gutterBottom align="center">
                    {currentQuestion.text}
                </Typography>

                <Typography variant="h6" align="center" color="primary">
                    Temps restant: {timeLeft}s
                </Typography>

                <Grid container spacing={2} sx={{ mt: 2 }}>
                    {currentQuestion.options && currentQuestion.options.map((option, index) => (
                        <Grid item xs={12} sm={6} key={index}>
                            <Button
                                fullWidth
                                variant="contained"
                                onClick={() => submitAnswer(index)}
                                disabled={hasAnswered}
                                sx={{ height: '60px' }}
                            >
                                {option}
                            </Button>
                        </Grid>
                    ))}
                </Grid>
            </Box>
        );
    };

    const renderResults = () => {
        if (!questionResults.correctAnswer) return null;

        return (
            <Box sx={{ mt: 4, textAlign: 'center' }}>
                <Typography variant="h5" gutterBottom color="primary">
                    Résultats de la question
                </Typography>
                <Typography variant="h6" gutterBottom color={hasAnswered ? 'success' : 'error'}>
                    La bonne réponse était : {currentQuestion.options[questionResults.correctAnswer - 1]}
                </Typography>
                <Paper elevation={3} sx={{ p: 3, mt: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        Scores actuels :
                    </Typography>
                    <List>
                        {questionResults.scores.map((score, index) => (
                            <ListItem key={index}>
                                <ListItemText 
                                    primary={`${score.name}: ${score.score} points`}
                                    secondary={score.id === socket.id ? '(Vous)' : ''}
                                />
                            </ListItem>
                        ))}
                    </List>
                </Paper>
            </Box>
        );
    };

    const renderFinalScores = () => {
        return (
            <Container maxWidth="sm">
                <Box sx={{ mt: 8, textAlign: 'center' }}>
                    <Typography variant="h4" gutterBottom color="primary">
                        Fin de la partie !
                    </Typography>
                    <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
                        <Typography variant="h5" gutterBottom>
                            Classement final
                        </Typography>
                        <List>
                            {finalScores.map((score, index) => (
                                <ListItem key={index}>
                                    <ListItemText 
                                        primary={`${index + 1}. ${score.name}: ${score.score} points`}
                                        secondary={score.id === socket.id ? '(Vous)' : ''}
                                        sx={{
                                            '& .MuiListItemText-primary': {
                                                fontWeight: index < 3 ? 'bold' : 'normal',
                                                color: index === 0 ? 'gold' : 
                                                      index === 1 ? 'silver' : 
                                                      index === 2 ? 'bronze' : 'inherit'
                                            }
                                        }}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                    <Button 
                        variant="contained" 
                        onClick={() => router.push('/')}
                        sx={{ mt: 4 }}
                    >
                        Retour à l&apos;accueil
                    </Button>
                </Box>
            </Container>
        );
    };

    if (!sessionCode) {
        return <div>Chargement...</div>;
    }

    return (
        <Container maxWidth="md">
            {error && (
                <Paper elevation={3} sx={{ p: 2, mb: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
                    <Typography>{error}</Typography>
                </Paper>
            )}

            {gameStatus === 'waiting' ? (
                <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {error && (
                        <Paper elevation={3} sx={{ p: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
                            <Typography>{error}</Typography>
                        </Paper>
                    )}
                    
                    <Typography variant="h4" align="center">
                        Salle de jeu: {sessionCode}
                    </Typography>
                    
                    <Paper elevation={3} sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Joueurs connectés:
                        </Typography>
                        <List>
                            {players.map((player) => (
                                <ListItem key={player.id}>
                                    <ListItemText 
                                        primary={player.name}
                                        secondary={player.id === socket.id ? '(Vous)' : ''}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Paper>

                    {isHost && gameStatus === 'waiting' && (
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <Button 
                                variant="contained" 
                                color="primary" 
                                size="large"
                                onClick={startGame}
                                disabled={players.length < 2}
                            >
                                Démarrer la partie
                            </Button>
                        </Box>
                    )}

                    {!isHost && gameStatus === 'waiting' && (
                        <Typography align="center" color="textSecondary">
                            En attente du démarrage par l&apos;hôte...
                        </Typography>
                    )}
                </Box>
            ) : gameStatus === 'finished' ? (
                renderFinalScores()
            ) : (
                <>
                    {questionResults.correctAnswer ? renderResults() : renderGame()}
                </>
            )}
        </Container>
    );
}