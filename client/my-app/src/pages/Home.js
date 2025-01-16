import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Container, TextField, Typography, Box } from '@mui/material';
import { socket } from '../services/socket';

function Home() {
    const navigate = useNavigate();
    const [numberOfQuestions, setNumberOfQuestions] = useState(5);

    const createGame = () => {
        socket.emit('createGame', { numberOfQuestions });
        
        socket.on('gameCreated', ({ sessionCode }) => {
            navigate(`/game/${sessionCode}`);
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

                <Button variant="contained" onClick={createGame}>
                    Créer une partie
                </Button>

                <Button variant="outlined" onClick={() => navigate('/join')}>
                    Rejoindre une partie
                </Button>
            </Box>
        </Container>
    );
}

export default Home;