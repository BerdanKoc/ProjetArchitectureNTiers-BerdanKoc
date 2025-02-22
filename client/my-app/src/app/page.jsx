'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Container, TextField, Typography, Box } from '@mui/material';
import { socket } from '../services/socket';

export default function Home() {
    const router = useRouter();
    const [numberOfQuestions, setNumberOfQuestions] = useState(5);
    const [maxPlayers, setMaxPlayers] = useState(4);

    const createGame = () => {
        socket.emit('createGame', { 
            numberOfQuestions,
            maxPlayers
        });
        
        socket.on('gameCreated', ({ sessionCode }) => {
            router.push(`/game/${sessionCode}`);
        });
    };

    return (
        <Container maxWidth="sm">
            <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Typography variant="h4" component="h1" align="center">
                    Trivia Game
                </Typography>
                
                <TextField
                    type="number"
                    label="Nombre de questions"
                    value={numberOfQuestions}
                    onChange={(e) => setNumberOfQuestions(Number(e.target.value))}
                    inputProps={{ min: 1 }}
                />

                <TextField
                    type="number"
                    label="Nombre maximum de joueurs"
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(Number(e.target.value))}
                    inputProps={{ min: 2, max: 10 }}
                    helperText="Entre 2 et 10 joueurs"
                />

                <Button 
                    variant="contained" 
                    onClick={createGame}
                    disabled={maxPlayers < 2 || maxPlayers > 10}
                >
                    Créer une partie
                </Button>

                <Button variant="outlined" onClick={() => router.push('/join')}>
                    Rejoindre une partie
                </Button>
            </Box>
        </Container>
    );
}