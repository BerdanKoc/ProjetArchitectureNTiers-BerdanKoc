import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Typography, Box } from '@mui/material';
import { socket } from '../services/socket';

function GameRoom() {
    const { sessionCode } = useParams();
    const [players, setPlayers] = useState([{id: '', name: ''}]);
    const [gameStatus, setGameStatus] = useState('waiting');

    useEffect(() => {
        // Mise à jour de la liste des joueurs
        socket.on('playersList', ({ players }) => {
            setPlayers(players);
        });

        return () => {
            socket.off('playersList');
        };
    }, []);

    return (
        <Container>
            <Box sx={{ mt: 4 }}>
                <Typography variant="h4" align="center">
                    Salle de jeu: {sessionCode}
                </Typography>
                
                <Box sx={{ mt: 3 }}>
                    <Typography variant="h6">Joueurs connectés:</Typography>
                    <ul>
                        {players.map((player) => (
                            <li key={player.id}>{player.name}</li>
                        ))}
                    </ul>
                </Box>
            </Box>
        </Container>
    );
}

export default GameRoom;