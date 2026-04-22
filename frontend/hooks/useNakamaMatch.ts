import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from '@heroiclabs/nakama-js';
import { getSocket, getSession } from '@/lib/nakama';
import { OP, ServerMsg, GameStartMsg, BoardUpdateMsg, GameOverMsg, TimerTickMsg, CommentaryMsg } from '@/lib/matchEvents';

export interface MatchState {
    board: (string | null)[];
    marks: Record<string, string>;
    usernames: Record<string, string>;
    myUserId: string;
    myMark: string;
    turn: string;
    winner: string | null;
    winningPos: number[] | null;
    gameOver: boolean;
    timedMode: boolean;
    timeLeft: number;
    commentary: string;
    error: string;
    opponentLeft: boolean;
    matchId: string;
    difficulty: string;
    gameStarted: boolean;
}

const INITIAL: MatchState = {
    board: Array(9).fill(null),
    marks: {},
    usernames: {},
    myUserId: '',
    myMark: '',
    turn: '',
    winner: null,
    winningPos: null,
    gameOver: false,
    timedMode: false,
    timeLeft: 30,
    commentary: '',
    error: '',
    opponentLeft: false,
    matchId: '',
    difficulty: 'medium',
    gameStarted: false,
};

export function useNakamaMatch() {
    const [state, setState] = useState<MatchState>(INITIAL);
    const socketRef = useRef<Socket | null>(null);
    const matchIdRef = useRef<string>('');

    const joinMatch = useCallback(async (matchId: string) => {
        const socket = getSocket();
        const session = getSession();
        if (!socket || !session) return;

        socketRef.current = socket;
        matchIdRef.current = matchId;

        setState(prev => ({ ...prev, matchId, myUserId: session.user_id || '' }));

        socket.onmatchdata = (matchData: any) => {
            const raw = new TextDecoder().decode(matchData.data);
            const msg: ServerMsg = JSON.parse(raw);

            switch (msg.type) {
                case 'game_start': {
                    const m = msg as GameStartMsg;
                    const myId = session.user_id || '';
                    setState(prev => ({
                        ...prev,
                        board: m.board,
                        marks: m.marks,
                        usernames: m.usernames,
                        turn: m.turn,
                        myMark: m.marks[myId] || 'X',
                        timedMode: m.timedMode,
                        timeLeft: m.turnTimeLimit,
                        difficulty: m.difficulty,
                        gameOver: false,
                        winner: null,
                        winningPos: null,
                        commentary: '',
                        opponentLeft: false,
                        gameStarted: true,
                    }));
                    break;
                }
                case 'board_update': {
                    const m = msg as BoardUpdateMsg;
                    setState(prev => ({
                        ...prev,
                        board: m.board,
                        turn: m.turn,
                        usernames: m.usernames ?? prev.usernames,
                        commentary: m.commentary ?? prev.commentary,
                    }));
                    break;
                }
                case 'game_over': {
                    const m = msg as GameOverMsg;
                    setState(prev => ({
                        ...prev,
                        board: m.board,
                        winner: m.winner,
                        winningPos: m.winningPos || null,
                        gameOver: true,
                        usernames: m.usernames,
                    }));
                    break;
                }
                case 'timer_tick': {
                    const m = msg as TimerTickMsg;
                    setState(prev => ({ ...prev, timeLeft: m.timeLeft }));
                    break;
                }
                case 'ai_commentary': {
                    const m = msg as CommentaryMsg;
                    setState(prev => ({ ...prev, commentary: m.commentary }));
                    break;
                }
                case 'opponent_left': {
                    setState(prev => ({ ...prev, opponentLeft: true, gameOver: true }));
                    break;
                }
                case 'error': {
                    setState(prev => ({ ...prev, error: (msg as any).msg }));
                    break;
                }
            }
        };

        await socket.joinMatch(matchId);
    }, []);

    const sendMove = useCallback((position: number) => {
        const socket = socketRef.current;
        const matchId = matchIdRef.current;
        if (!socket || !matchId) return;

        const data = new TextEncoder().encode(JSON.stringify({ position }));
        socket.sendMatchState(matchId, OP.MOVE, data);
    }, []);

    const leaveMatch = useCallback(async () => {
        const socket = socketRef.current;
        const matchId = matchIdRef.current;
        if (socket && matchId) {
            await socket.leaveMatch(matchId);
        }
        setState(INITIAL);
        matchIdRef.current = '';
    }, []);

    return { state, joinMatch, sendMove, leaveMatch };
}