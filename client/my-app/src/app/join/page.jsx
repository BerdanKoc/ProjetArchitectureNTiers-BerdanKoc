'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Container, TextField, Typography, Box } from '@mui/material';
import { socket } from '../../services/socket';

export default function JoinGame() {
    const router = useRouter();
    const [sessionCode, setSessionCode] = useState('');
    const [playerName, setPlayerName] = useState('');

    const handleJoinGame = () => {
        if (!sessionCode || !playerName) return;

        socket.emit('joinGame', { sessionCode, playerName });
        
        socket.on('gameJoined', ({ sessionCode }) => {
            router.push(`/game/${sessionCode}`);
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

                <Button variant="outlined" onClick={() => router.push('/')}>
                    Retour
                </Button>
            </Box>
        </Container>
    );
}