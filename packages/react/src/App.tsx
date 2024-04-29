import React, { useCallback, useMemo, useState } from 'react';

import Board from './board';

const Game = React.memo(() => {
  const [history, setHistory] = useState<string[][]>([Array(9).fill('')]);
  const [currentMove, setCurrentMove] = useState(0);
  const xIsNext = currentMove % 2 === 0;
  const currentSquares = history[currentMove];

  const handlePlay = useCallback(
    (nextSquares: string[]) => {
      const nextHistory = [...history.slice(0, currentMove + 1), nextSquares];
      setHistory(nextHistory);
      setCurrentMove(nextHistory.length - 1);
    },
    [currentMove, history]
  );

  const historyMoves = useMemo(
    () =>
      history.map((_, index) => {
        let description: string;

        if (index > 0) {
          description = 'Go to move #' + index;
        } else {
          description = 'Go to game start';
        }

        return (
          <li key={index}>
            <button onClick={() => setCurrentMove(index)}>{description}</button>
          </li>
        );
      }),
    [history]
  );

  return (
    <div className="game">
      <div className="game-board">
        <Board xIsNext={xIsNext} squares={currentSquares} onPlay={handlePlay} />
      </div>
      <div className="game-info">
        <ol>{historyMoves}</ol>
      </div>
    </div>
  );
});

export default Game;
