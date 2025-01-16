import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import JoinGame from './pages/JoinGame';
// GameRoom sera implémenté ensuite
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/join" element={<JoinGame />} />
        {/* <Route path="/game/:sessionCode" element={<GameRoom />} /> */}
      </Routes>
    </Router>
  );
}

export default App;