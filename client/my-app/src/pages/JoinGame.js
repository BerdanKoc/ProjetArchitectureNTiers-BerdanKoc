import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Container, TextField, Typography, Box } from '@mui/material';
import { socket } from '../services/socket';

function JoinGame() {
    const navigate = useNavigate();
    const [sessionCode, setSessionCode] = useState('');
    const [playerName, setPlayerName] = useState('');

    const handleJoinGame = () => {
        if (!sessionCode || !playerName) return;

        socket.emit('joinGame', { sessionCode, playerName });
        
        socket.on('gameJoined', ({ sessionCode }) => {
            navigate(`/game/${sessionCode}`);
        });

        socket.on('error', ({ message }) => {
            alert(message);
        });
    };

    return (
        <Container maxWidth="sm">
            <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Typography variant="h4" component="h1" align="center">
                    Rejoindre une partie
                </Typography>

                <TextField
                    label="Code de la partie"
                    value={sessionCode}
                    onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                    placeholder="Ex: ABC123"
                />

                <TextField
                    label="Votre pseudo"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Ex: Player1"
                />

                <Button 
                    variant="contained" 
                    onClick={handleJoinGame}
                    disabled={!sessionCode || !playerName}
                >
                    Rejoindre
                </Button>

                <Button variant="outlined" onClick={() => navigate('/')}>
                    Retour
                </Button>
            </Box>
        </Container>
    );
}

export default JoinGame;