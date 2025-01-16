import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import GameRoom from './pages/GameRoom';
import JoinGame from './pages/JoinGame';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/game/:sessionCode" element={<GameRoom />} />
          <Route path="/join" element={<JoinGame />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;