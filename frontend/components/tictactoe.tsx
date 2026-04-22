'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import styles from './tictactoe.module.css';
import NicknameScreen from './NicknameScreen';
import ModeSelect from './ModeSelect';
import Leaderboard from './Leaderboard';
import { login, register, connectSocket, findMatch } from '@/lib/nakama';
import { useNakamaMatch } from '@/hooks/useNakamaMatch';

type Screen = 'nickname' | 'mode' | 'leaderboard' | 'waiting' | 'game';

const WINNING_COMBOS = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
];

const X_PATHS = [
    { d: 'M183.1,4.6c-3.7,10.4-7.8,20.7-12.5,30.7' },
    { d: 'M159.6,6.8c6.9,9.8,15.4,18.5,24.9,25.8' },
];
const O_PATHS = [
    { d: 'M98.5,17.2c-2.7,0.6-5.2-1.6-7.8-2.5c-5.2-1.7-10.7,1.7-14.1,6c-5.2,6.5-7.1,16.6-1.8,23c1.1,1.3,2.4,2.4,4.1,2.7c2.6,0.5,5.2-1,7.4-2.6c6.7-5,12.6-10.9,17.6-17.6c0.9-1.2,1.7-2.4,2-3.9c0.4-2.3-1-4.6-2.8-6c-1.9-1.4-4.1-2.1-6.4-2.8' },
];

export default function TicTacToe() {
    const [screen, setScreen] = useState<Screen>('nickname');
    const [authLoading, setAuthLoading] = useState(false);
    const [nickname, setNickname] = useState('');
    const [animatingTiles, setAnimatingTiles] = useState<Set<number>>(new Set());

    const { state, joinMatch, sendMove, leaveMatch } = useNakamaMatch();
    const [searchElapsed, setSearchElapsed] = useState(0);
    const [searchTimedOut, setSearchTimedOut] = useState(false);
    const searchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [lastOptions, setLastOptions] = useState<{ai: boolean; difficulty: string; timed: boolean} | null>(null);

    // ── Auth ─────────────────────────────────────────────────
    const handleLogin = useCallback(async (username: string, password: string) => {
        setAuthLoading(true);
        try {
            const result = await login(username, password); // login() should return { username }
            await connectSocket();
            setNickname(result.username); // use server-returned username, not raw input
            setScreen('mode');
        } catch (e: any) {
            throw e;
        } finally {
            setAuthLoading(false);
        }
    }, []);
    
    const handleRegister = useCallback(async (username: string, password: string) => {
        setAuthLoading(true);
        try {
            const result = await register(username, password); // register() should return { username }
            await connectSocket();
            setNickname(result.username); // use server-returned username
            setScreen('mode');
        } catch (e: any) {
            throw e;
        } finally {
            setAuthLoading(false);
        }
    }, []);

    // ── Find match ───────────────────────────────────────────
    const handleModeSelect = useCallback(async (options: {
        ai: boolean; difficulty: string; timed: boolean;
    }) => {
        setLastOptions(options);  
        setScreen('waiting');
        try {
            await connectSocket();
            const matchId = await findMatch(options);
            try{
              await joinMatch(matchId);
            } catch (e: any) {
                if (e?.code === 5) {
                    const freshMatchId = await findMatch(options);
                    await joinMatch(freshMatchId);
                } else {
                    throw e;
                }
            }
        } catch (e) {
            console.error('Match error:', e);
            setScreen('mode');
        }
    }, [joinMatch]);

    useEffect(() => {  
        if (screen === 'waiting' && state.gameStarted) {
            setScreen('game');
        }
    }, [state.gameStarted, screen]);

    // ── Move ─────────────────────────────────────────────────
    const handleTileClick = useCallback((index: number) => {
        const { board, turn, myUserId, gameOver } = state;
        if (gameOver) return;
        if (board[index] !== null) return;
        if (turn !== myUserId) return;

        setAnimatingTiles(prev => new Set(prev).add(index));
        sendMove(index);
    }, [state, sendMove]);

    // ── Leave ────────────────────────────────────────────────
    const handleHome = useCallback(async () => {
        await leaveMatch();
        setAnimatingTiles(new Set());
        setScreen('mode');
    }, [leaveMatch]);

    const handlePlayAgain = useCallback(async () => {
        await leaveMatch();
        setAnimatingTiles(new Set());
        setScreen('mode');
    }, [leaveMatch]);

    // ── Search timeout ───────────────────────────────────────
    
    useEffect(() => {
        if (screen === 'waiting') {
            setSearchElapsed(0);
            setSearchTimedOut(false);
            searchTimerRef.current = setInterval(() => {
                setSearchElapsed(prev => {
                    if (prev >= 299) { // 5 minutes = 300 seconds
                        clearInterval(searchTimerRef.current!);
                        setSearchTimedOut(true);
                        return 300;
                    }
                    return prev + 1;
                });
            }, 1000);
        } else {
            if (searchTimerRef.current) {
                clearInterval(searchTimerRef.current);
                searchTimerRef.current = null;
            }
        }
        return () => {
            if (searchTimerRef.current) clearInterval(searchTimerRef.current);
        };
    }, [screen]);

    // ── Winner label ─────────────────────────────────────────
    const getWinnerLabel = () => {
        if (!state.gameOver) return '';
        if (!state.winner) return '';
        if (state.opponentLeft) return 'Opponent left — You win!';
        if (state.winner === 'draw') return "It's a Draw!";
        if (state.winner === 'ai-bot') return '🤖 AI wins!';
        const winnerName = state.usernames[state.winner] || state.winner;
        return state.winner === state.myUserId ? '🎉 You win!' : `${winnerName} wins!`;
    };

    // ── Render screens ────────────────────────────────────────

    if (screen === 'nickname') {
        return (
            <div className={styles.container}>
                <div className={styles.rotated}>
                    <div className={styles.paper}>
                        <NicknameScreen
                            onLogin={handleLogin}
                            onRegister={handleRegister}
                            loading={authLoading}
                        />
                    </div>
                </div>
            </div>
        );
    }

    if (screen === 'mode') {
        return (
            <div className={styles.container}>
                <div className={styles.rotated}>
                    <div className={styles.paper}>
                        <ModeSelect
                            onSelect={handleModeSelect}
                            onLeaderboard={() => setScreen('leaderboard')}
                        />
                    </div>
                </div>  
            </div>
        );
    }

    if (screen === 'leaderboard') {
        return (
            <div className={styles.container}>
                <div className={styles.rotated}>
                    <div className={styles.paper}>
                        <Leaderboard onBack={() => setScreen('mode')} />
                    </div>
                </div>
            </div>
        );
    }

    if (screen === 'waiting') {
        const mins = Math.floor(searchElapsed / 60);
        const secs = searchElapsed % 60;
        const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
        const isPvP = lastOptions && !lastOptions.ai;

        return (
            <div className={styles.container}>
                <div className={styles.rotated}>
                    <div className={styles.paper}>
                        <div className={styles.settings}>
                            <div className={styles.containerDiv}>
                                {!searchTimedOut ? (
                                    <>
                                        <h1 className={`${styles.sets} ${styles.welcome}`}>
                                            {isPvP ? 'Searching for opponent...' : 'Starting game...'}
                                        </h1>
                                        {isPvP && (
                                            <p style={{ textAlign: 'center', marginTop: '8px', fontFamily: "'Waiting for the Sunrise', cursive", fontSize: '24px', color: '#000033' }}>
                                                {timeStr}
                                            </p>
                                        )}
                                        <button className={styles.btn} style={{ marginTop: '20px' }} onClick={() => {
                                            setScreen('mode');
                                        }}>
                                            Cancel
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <h1 className={`${styles.sets} ${styles.welcome}`}>
                                            No opponent found
                                        </h1>
                                        <p style={{ textAlign: 'center', marginTop: '8px', fontFamily: "'Waiting for the Sunrise', cursive", fontSize: '24px', color: '#000033' }}>
                                            Search timed out after 5 minutes
                                        </p>
                                        <div style={{ display: 'flex', gap: '40px', marginTop: '24px' }}>
                                            <button className={styles.btn} onClick={() => {
                                                setScreen('mode');
                                            }}>
                                                home
                                            </button>
                                            <button className={styles.btn} onClick={() => {
                                                if (lastOptions) {
                                                    handleModeSelect(lastOptions);
                                                } else {
                                                    setScreen('mode');
                                                }
                                            }}>
                                                play again
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Game screen ───────────────────────────────────────────
    const { board, marks, usernames, myUserId, turn, timedMode, timeLeft,
            commentary, gameOver, winningPos, difficulty } = state;

    const isMyTurn = turn === myUserId;
    const myMark = marks[myUserId] || '?';
    const turnName = usernames[turn] || (turn === 'ai-bot' ? '🤖 AI' : turn);
    const winnerLabel = getWinnerLabel();

    return (
        <div className={styles.container}>
            <div className={styles.gameWrapper}>
                <div className={styles.rotated}>
                    <div className={styles.paper}>
                        {/* Status bar */}
                        <div style={{ textAlign: 'center', padding: '4px 0', fontSize: '0.85rem' }}>
                            <span>You: <strong>{nickname}</strong> ({myMark.toUpperCase()})</span>
                            {timedMode && !gameOver && (
                                <span style={{
                                    marginLeft: '12px',
                                    color: timeLeft <= 10 ? 'red' : 'inherit',
                                    fontWeight: timeLeft <= 10 ? 'bold' : 'normal'
                                }}>
                                    ⏱️ {timeLeft}s
                                </span>
                            )}
                        </div>

                        {/* Turn indicator */}
                        {!gameOver && (
                            <div style={{ textAlign: 'center', fontSize: '0.85rem', marginBottom: '4px' }}>
                                {isMyTurn ? '✅ Your turn!' : `⏳ ${turnName}'s turn`}
                            </div>
                        )}

                        {/* Winner banner */}
                        <div id="winner" className={styles.winner}>
                            <h1>{winnerLabel}</h1>
                        </div>

                        {/* Board */}
                        <div id="board" className={styles.board}>
                            <svg version="1.1" viewBox="0 0 231.9 179.6" className={styles.gameboard}>
                                <g id="tictactoe">
                                    <path className={styles.drawboard} d="M59.5,0c-3.6,60.8-1.8,122,5.3,182.5" />
                                    <path className={styles.drawboard} d="M131.9,1.3c7.5,22.9,6.3,47.5,5,71.5c-1.7,32.6-3.5,65.2-5.2,97.8" />
                                    <path className={styles.drawboard} d="M0,75.6c75.3-12.8,151.1-22.8,227.2-30.1" />
                                    <path className={styles.drawboard} d="M-0.8,128.8c77.9-0.5,155.7-6.6,232.7-18.4" />
                                </g>
                            </svg>

                            {board.map((cell, index) => {
                                const isWinningCell = winningPos?.includes(index);
                                return (
                                    <div
                                        key={index}
                                        className={`${styles.tile} ${animatingTiles.has(index) ? styles.animating : ''}`}
                                        onClick={() => handleTileClick(index)}
                                        style={{
                                            cursor: (!gameOver && isMyTurn && cell === null) ? 'pointer' : 'default',
                                            opacity: isWinningCell ? 1 : (gameOver && winningPos ? 0.4 : 1),
                                            filter: isWinningCell ? 'drop-shadow(0 0 6px gold)' : 'none',
                                        }}
                                    >
                                        {cell !== null && (
                                            <svg viewBox={cell === 'X' ? "150 -2 50 45" : "72 8 48 48"} className={styles.svgTile}>
                                                {cell === 'X' && X_PATHS.map((path, i) => (
                                                    <path key={i} d={path.d} className={styles.strokeX} />
                                                ))}
                                                {cell === 'O' && O_PATHS.map((path, i) => (
                                                    <path key={i} d={path.d} className={styles.strokeO} />
                                                ))}
                                            </svg>
                                        )}
                                    </div>
                                );
                            })}

                            <div className={styles.buttonGroup}>
                                <button className={`${styles.btn} ${styles.homeBtn}`} onClick={handleHome}>
                                    <h1>home</h1>
                                </button>
                                {gameOver && (
                                    <button className={`${styles.btn} ${styles.resetBtn}`} onClick={handlePlayAgain}>
                                        <h1>play again</h1>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                {/* END of rotated div — sticky note goes RIGHT HERE, still inside gameWrapper */}

                {lastOptions?.ai && (
                    <div className={styles.stickyNote}>
                        <div className={styles.stickyHeader}>🤖 AI says</div>
                        <div className={styles.stickyText}>
                            {commentary
                                ? `"${commentary}"`
                                : gameOver
                                    ? ''
                                    : isMyTurn ? 'your move, human...' : 'thinking...'}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}