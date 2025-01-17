import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, Box, Button, List, ListItem, ListItemText, Paper } from '@mui/material';
import { socket } from '../services/socket';

function GameRoom() {
    const { sessionCode } = useParams();
    const navigate = useNavigate();
    const [players, setPlayers] = useState([{id: '', name: ''}]);
    const [gameStatus, setGameStatus] = useState('waiting');
    const [isHost, setIsHost] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        socket.on('gameCreated', ({ isHost }) => {
            setIsHost(isHost);
        });

        socket.on('playersList', ({ players }) => {
            setPlayers(players);
        });

        socket.on('gameStarted', () => {
            setGameStatus('playing');
        });

        socket.on('error', ({ message }) => {
            setError(message);
            setTimeout(() => setError(''), 3000);
        });

        socket.on('gameEnded', ({ reason }) => {
            if (reason === 'Host disconnected') {
                setError('L\'hôte s\'est déconnecté');
                setTimeout(() => navigate('/'), 2000);
            }
        });

        return () => {
            socket.off('gameCreated');
            socket.off('playersList');
            socket.off('gameStarted');
            socket.off('error');
            socket.off('gameEnded');
        };
    }, [navigate]);

    const startGame = () => {
        if (players.length < 2) {
            setError('Il faut au moins 2 joueurs pour démarrer');
            return;
        }
        socket.emit('startGame', { sessionCode });
    };

    return (
        <Container maxWidth="md">
            <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {error && (
                    <Paper 
                        elevation={3} 
                        sx={{ 
                            p: 2, 
                            bgcolor: 'error.light',
                            color: 'error.contrastText'
                        }}
                    >
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
        </Container>
    );
}

export default GameRoom;