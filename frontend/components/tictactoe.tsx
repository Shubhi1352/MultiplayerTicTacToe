'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './tictactoe.module.css';

interface GameState {
  board: (string | number)[];
  game: boolean;
  player1: boolean;
  player2: boolean;
  human: boolean;
  computer: boolean;
  player1val: string | null;
  player2val: string | null;
  humVal: string | null;
  comVal: string | null;
  winner: string;
  showSettings: boolean;
  showChooses: boolean;
  showDestiny: boolean;
  showBoard: boolean;
}

const WINNING_COMBINATIONS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const TicTacToe = () => {
  const [gameState, setGameState] = useState<GameState>({
    board: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    game: false,
    player1: true,
    player2: false,
    human: false,
    computer: false,
    player1val: null,
    player2val: null,
    humVal: null,
    comVal: null,
    winner: '',
    showSettings: true,
    showChooses: false,
    showDestiny: false,
    showBoard: false,
  });

  const [animatingTiles, setAnimatingTiles] = useState<Set<string>>(new Set());
  const [winningLineIndex, setWinningLineIndex] = useState<number | null>(null);
  const gameRef = useRef(gameState);

  useEffect(() => {
    gameRef.current = gameState;
  }, [gameState]);

  const checkWin = (board: (string | number | null)[], player: boolean | string): boolean => {
    let value: string | null = null;

    if (gameRef.current.computer) {
      value = player === gameRef.current.human ? gameRef.current.humVal : gameRef.current.comVal;
    } else if (gameRef.current.human) {
      value = player === gameRef.current.player1 ? gameRef.current.player1val : gameRef.current.player2val;
    }

    for (let x = 0; x < 8; x++) {
      let win = true;
      for (let y = 0; y < 3; y++) {
        if (board[WINNING_COMBINATIONS[x][y]] !== value) {
          win = false;
          break;
        }
      }
      if (win) {
        setWinningLineIndex(x);
        return true;
      }
    }
    return false;
  };

  const checkBoard = (board: (string | number | null)[]): boolean => {
    for (let i = 0; i < board.length; i++) {
      if (board[i] === 0) {
        return false;
      }
    }
    return true;
  };

  const updateScore = (board: (string | number)[], player: boolean | string) => {
    if (gameRef.current.computer) {
      if (player === gameRef.current.computer) {
        if (checkWin(board, player)) {
          setGameState((prev) => ({ ...prev, game: false }));
          setTimeout(() => {
            setGameState((prev) => ({ ...prev, winner: 'You lost!' }));
          }, 1400);
          return;
        }
      } else if (player === gameRef.current.human) {
        if (checkWin(board, player)) {
          setGameState((prev) => ({ ...prev, game: false }));
          setTimeout(() => {
            setGameState((prev) => ({ ...prev, winner: 'You won!' }));
          }, 1000);
          return;
        }
      }
    } else if (gameRef.current.human) {
      if (player === gameRef.current.player1) {
        if (checkWin(board, player)) {
          setGameState((prev) => ({ ...prev, game: false }));
          setTimeout(() => {
            setGameState((prev) => ({ ...prev, winner: 'Player 1 won!' }));
          }, 1000);
          return;
        }
      } else {
        if (checkWin(board, player)) {
          setGameState((prev) => ({ ...prev, game: false }));
          setTimeout(() => {
            setGameState((prev) => ({ ...prev, winner: 'Player 2 won!' }));
          }, 1000);
          return;
        }
      }
    }

    if (checkBoard(board)) {
      setTimeout(() => {
        setGameState((prev) => ({ ...prev, winner: 'Tie!' }));
      }, 1000);
    }
  };

  const setPlayer = (signNumber: number ) => {
    const newBoard = [...gameRef.current.board]; 

    if (gameRef.current.player1) {
      if (gameRef.current.player1val !== null) {
        newBoard[signNumber] = gameRef.current.player1val;
        setAnimatingTiles((prev) => new Set(prev).add(`${gameRef.current.player1val}${signNumber}`));
        updateScore(newBoard, gameRef.current.player1);
        setGameState((prev) => ({
          ...prev,
          board: newBoard,
          player1: false,
          player2: true,
        }));
      }
    } else {
      if (gameRef.current.player2val !== null) {
        newBoard[signNumber] = gameRef.current.player2val;
        setAnimatingTiles((prev) => new Set(prev).add(`${gameRef.current.player2val}${signNumber}`));
        updateScore(newBoard, gameRef.current.player2);
        setGameState((prev) => ({
          ...prev,
          board: newBoard,
          player1: true,
          player2: false,
        }));
      }
    }
  };

  const ai = () => {
    if (gameRef.current.game) {
      minimax(gameRef.current.board, 0, gameRef.current.computer as boolean);
    }
  };

  const set = (index: number, player: boolean | string) => {
    if (gameRef.current.game) {
      if (gameRef.current.board[index] === 0) {
        if (gameRef.current.computer ) {
          if (player === gameRef.current.human && gameRef.current.humVal !== null) {
            const newBoard = [...gameRef.current.board];
            newBoard[index] = gameRef.current.humVal;
            setAnimatingTiles((prev) => new Set(prev).add(`${gameRef.current.humVal}${index}`));
            updateScore(newBoard, player);
            setGameState((prev) => ({ ...prev, board: newBoard }));
            setTimeout(() => ai(), 500);
          } else if (gameRef.current.comVal !== null){
            const newBoard = [...gameRef.current.board];
            newBoard[index] = gameRef.current.comVal;
            setAnimatingTiles((prev) => new Set(prev).add(`${gameRef.current.comVal}${index}`));
            updateScore(newBoard, player);
            setGameState((prev) => ({ ...prev, board: newBoard }));
          }
        }
      }
    }
  };

  const minimax = (
    actualBoard: (string | number)[],
    depth: number,
    player: boolean
  ): number => {
    if (checkWin(actualBoard, gameRef.current.computer)) {
      return 10 - depth;
    } else if (checkWin(actualBoard, gameRef.current.human)) {
      return -10 + depth;
    } else if (checkBoard(actualBoard)) {
      return 0;
    }

    let max = player ? -Infinity : Infinity;
    let bestIndex = 0;

    for (let i = 0; i < actualBoard.length; i++) {
      const copyBoard = [...actualBoard];

      if (copyBoard[i] === 0) {
        const value = player === gameRef.current.computer ? gameRef.current.comVal : gameRef.current.humVal;
        if (value !== null) {
          copyBoard[i] = value;

          const minimaxScore = minimax(copyBoard, depth + 1, !player);

          if (player) {
            if (minimaxScore > max) {
              max = minimaxScore;
              bestIndex = i;
            }
          } else {
            if (minimaxScore < max) {
              max = minimaxScore;
              bestIndex = i;
            }
          }
        }
      }
    }

    if (depth === 0) {
      set(bestIndex, gameRef.current.computer);
    }

    return max;
  };

  const handleTileClick = (index: number) => {
    if (!gameRef.current.game) return;
    if (gameRef.current.board[index] !== 0) return;

    if (gameRef.current.human) {
      setPlayer(index);
    } else if (gameRef.current.computer) {
      set(index, gameRef.current.human);
    }
  };

  const switchScreen = (screen: 'chooses' | 'destiny' | 'board') => {
    if (screen === 'chooses') {
      setGameState((prev) => ({
        ...prev,
        showSettings: false,
        showChooses: true,
      }));
    } else if (screen === 'destiny') {
      setGameState((prev) => ({
        ...prev,
        showChooses: false,
        showDestiny: true,
      }));
    } else if (screen === 'board') {
      setGameState((prev) => ({
        ...prev,
        showSettings: false,
        showDestiny: false,
        showBoard: true,
        game: true,
      }));
    }
  };

  const handleClick = (id: string) => {
    if (id === 'play') {
      switchScreen('chooses');
    } else if (id === 'reset') {
      resetGame();
    } else if (id === 'home') {
      goHome();
    } else if (id === 'human') {
      setGameState((prev) => ({
        ...prev,
        human: true,
        computer: false,
      }));
      setTimeout(() => switchScreen('destiny'), 50);
    } else if (id === 'computer') {
      setGameState((prev) => ({
        ...prev,
        human: false,
        computer: true,
      }));
      setTimeout(() => switchScreen('destiny'), 50);
    } else if (gameRef.current.computer) {
      if (id === 'x' || id === 'o') {
        if (id === 'x') {
          setGameState((prev) => ({
            ...prev,
            humVal: 'x',
            comVal: 'o',
          }));
        } else {
          setGameState((prev) => ({
            ...prev,
            humVal: 'o',
            comVal: 'x',
          }));
        }
        setTimeout(() => switchScreen('board'), 50);
      }
    } else if (gameRef.current.human) {
      if (id === 'x' || id === 'o') {
        if (id === 'x') {
          setGameState((prev) => ({
            ...prev,
            player1val: 'x',
            player2val: 'o',
          }));
        } else {
          setGameState((prev) => ({
            ...prev,
            player1val: 'o',
            player2val: 'x',
          }));
        }
        setTimeout(() => switchScreen('board'), 50);
      }
    }
  };

  const resetGame = () => {
    setGameState((prev) => ({
      ...prev,
      board: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      game: true,
      player1: true,
      player2: false,
      winner: '',
    }));
    setWinningLineIndex(null);
    setAnimatingTiles(new Set());
  };

  const goHome = () => {
    setGameState({
      board: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      game: false,
      player1: true,
      player2: false,
      human: false,
      computer: false,
      player1val: null,
      player2val: null,
      humVal: null,
      comVal: null,
      winner: '',
      showSettings: true,
      showChooses: false,
      showDestiny: false,
      showBoard: false,
    });
    setWinningLineIndex(null);
    setAnimatingTiles(new Set());
  };

  const X_PATHS = [
    { d: 'M183.1,4.6c-3.7,10.4-7.8,20.7-12.5,30.7' },
    { d: 'M159.6,6.8c6.9,9.8,15.4,18.5,24.9,25.8' },
  ];

  const O_PATHS = [
    { d: 'M98.5,17.2c-2.7,0.6-5.2-1.6-7.8-2.5c-5.2-1.7-10.7,1.7-14.1,6c-5.2,6.5-7.1,16.6-1.8,23c1.1,1.3,2.4,2.4,4.1,2.7c2.6,0.5,5.2-1,7.4-2.6c6.7-5,12.6-10.9,17.6-17.6c0.9-1.2,1.7-2.4,2-3.9c0.4-2.3-1-4.6-2.8-6c-1.9-1.4-4.1-2.1-6.4-2.8' },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.rotated}>
        <div className={styles.paper}>
          {gameState.showSettings && (
            <div id="settings" className={styles.settings}>
              <div className={styles.containerDiv}>
                <h1 className={`${styles.sets} ${styles.welcome}`}>THIS IS Tic Tac Toe!</h1>
              </div>
              <div className={styles.containerDiv}>
                <img src="/tictactoe-board.png" alt="Tic Tac Toe Board" className={styles.boardImage} />
              </div>
              <div className={styles.containerDiv}>
                <button
                  className={`${styles.sets} ${styles.btn} ${styles.welcome}`}
                  id="play"
                  onClick={() => handleClick('play')}
                >
                  Let&apos;s play!
                </button>
              </div>
            </div>
          )}

          {gameState.showChooses && (
            <div id="settings" className={styles.settings}>
              <div className={styles.containerDiv}>
                <h1 className={`${styles.sets} ${styles.chooses}`}>CHOOSE YOUR OPPONENT</h1>
              </div>
              <div className={styles.containerDiv}>
                <img src="/tictactoe-board.png" alt="Tic Tac Toe Board" className={styles.boardImage} />
              </div>
              <div className={styles.containerDiv}>
                <div className={`${styles.sets} ${styles.options} ${styles.chooses}`}>
                  <button className={styles.btn} id="human" onClick={() => handleClick('human')}>
                    human
                  </button>
                  <h1 className={styles.vs}>vs</h1>
                  <button className={styles.btn} id="computer" onClick={() => handleClick('computer')}>
                    computer
                  </button>
                </div>
              </div>
            </div>
          )}

          {gameState.showDestiny && (
            <div id="settings" className={styles.settings}>
              <div className={styles.containerDiv}>
                <h1 className={`${styles.sets} ${styles.destiny}`}>Choose your destiny</h1>
              </div>
              <div className={styles.containerDiv}>
                <img src="/tictactoe-board.png" alt="Tic Tac Toe Board" className={styles.boardImage} />
              </div>
              <div className={styles.containerDiv}>
                <div className={`${styles.sets} ${styles.options} ${styles.destiny}`}>
                  <button className={styles.btn} id="x" onClick={() => handleClick('x')}>
                    X
                  </button>
                  <h1 className={styles.vs}>vs</h1>
                  <button className={styles.btn} id="o" onClick={() => handleClick('o')}>
                    O
                  </button>
                </div>
              </div>
            </div>
          )}

          {gameState.showBoard && (
            <>
              <div id="winner" className={styles.winner}>
                <h1>{gameState.winner}</h1>
              </div>
              <div id="board" className={styles.board}>
                <svg
                  version="1.1"
                  id="gameboard"
                  viewBox="0 0 231.9 179.6"
                  className={styles.gameboard}
                >
                  <g id="tictactoe">
                    <path className={styles.drawboard} d="M59.5,0c-3.6,60.8-1.8,122,5.3,182.5" />
                    <path className={styles.drawboard} d="M131.9,1.3c7.5,22.9,6.3,47.5,5,71.5c-1.7,32.6-3.5,65.2-5.2,97.8" />
                    <path className={styles.drawboard} d="M0,75.6c75.3-12.8,151.1-22.8,227.2-30.1" />
                    <path className={styles.drawboard} d="M-0.8,128.8c77.9-0.5,155.7-6.6,232.7-18.4" />
                  </g>
                </svg>

                {gameState.board.map((cell, index) => (
                  <div
                    key={index}
                    className={`${styles.tile} ${
                      animatingTiles.has(`${cell}${index}`) ? styles.animating : ''
                    }`}
                    onClick={() => handleTileClick(index)}
                  >
                    {cell !== 0 && (
                      <svg viewBox="0 0 231.9 179.6" className={styles.svgTile}>
                        {cell === 'x' &&
                          X_PATHS.map((path, i) => (
                            <path key={i} d={path.d} className={styles.strokeX} />
                          ))}
                        {cell === 'o' &&
                          O_PATHS.map((path, i) => (
                            <path key={i} d={path.d} className={styles.strokeO} />
                          ))}
                      </svg>
                    )}
                  </div>
                ))}

                <div className={styles.buttonGroup}>
                  <button id="home" className={`${styles.btn} ${styles.homeBtn}`} onClick={() => handleClick('home')}>
                    <h1>home</h1>
                  </button>
                  <button id="reset" className={`${styles.btn} ${styles.resetBtn}`} onClick={() => handleClick('reset')}>
                    <h1>reset</h1>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicTacToe;