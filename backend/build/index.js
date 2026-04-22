'use strict';

/** @type {import('nakama-runtime')} */
const TICK_RATE = 1; // Server loops once per second
const WINNING_COMBINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
    [0, 4, 8], [2, 4, 6] // Diagonals
];
const TicTacToeHandler = {
    matchInit(ctx, logger, nk, params) {
        return {
            state: {
                board: Array(9).fill(null),
                marks: {},
                turn: null,
                winner: null,
                winningPos: null,
            },
            tickRate: TICK_RATE,
            label: JSON.stringify({ game: "tic-tac-toe" }),
        };
    },
    matchJoinAttempt(ctx, logger, nk, dispatcher, tick, state, presence, metadata) {
        const accept = Object.keys(state.marks).length < 2;
        return { state, accept };
    },
    matchJoin(ctx, logger, nk, dispatcher, tick, state, presences) {
        presences.forEach((p) => {
            if (!state.marks[p.userId]) {
                state.marks[p.userId] = Object.keys(state.marks).length === 0 ? 'X' : 'O';
            }
        });
        // Start game when 2 players are in
        if (Object.keys(state.marks).length === 2 && !state.turn) {
            state.turn = Object.keys(state.marks)[0];
        }
        // Broadcast state update to everyone
        dispatcher.broadcastMessage(1, JSON.stringify(state));
        return { state };
    },
    matchLoop(ctx, logger, nk, dispatcher, tick, state, messages) {
        messages.forEach((msg) => {
            const data = JSON.parse(nk.binaryToString(msg.data));
            const playerPos = data.position;
            // VALIDATION: Server-authoritative check 
            if (msg.sender.userId === state.turn && state.board[playerPos] === null && !state.winner) {
                const mark = state.marks[msg.sender.userId];
                state.board[playerPos] = mark;
                // Check for Win
                for (const combo of WINNING_COMBINATIONS) {
                    if (state.board[combo[0]] === mark && state.board[combo[1]] === mark && state.board[combo[2]] === mark) {
                        state.winner = msg.sender.userId;
                        state.winningPos = combo;
                        break;
                    }
                }
                // Check for Tie
                if (!state.winner && !state.board.includes(null)) {
                    state.winner = "draw";
                }
                // Switch turn if no winner
                if (!state.winner) {
                    const players = Object.keys(state.marks);
                    state.turn = players.find(id => id !== state.turn) || null;
                }
                dispatcher.broadcastMessage(2, JSON.stringify(state));
            }
        });
        return { state };
    },
    matchLeave(ctx, logger, nk, dispatcher, tick, state, presences) {
        return { state };
    },
    matchTerminate(ctx, logger, nk, dispatcher, tick, state, graceSeconds) {
        return { state };
    },
    matchSignal(ctx, logger, nk, dispatcher, tick, state, data) {
        return { state, data };
    }
};

const rpcFindMatch = (ctx, logger, nk, payload) => {
    // Basic matchmaking: find an existing match or create a new one
    const limit = 10;
    const authoritative = true;
    const label = ""; // We can filter by label later if we add difficulty
    const minSize = 0;
    const maxSize = 1; // Look for matches with only 1 player (waiting for a second)
    const matches = nk.matchList(limit, authoritative, label, minSize, maxSize);
    if (matches.length > 0) {
        // Return the first available match ID
        return JSON.stringify({ matchId: matches[0].matchId });
    }
    // No matches found, create a new one
    const matchId = nk.matchCreate("tic-tac-toe");
    return JSON.stringify({ matchId });
};

/** @type {import('nakama-runtime')} */
let InitModule = (ctx, logger, nk, initializer) => {
    if (!TicTacToeHandler) {
        logger.error("CRITICAL: TicTacToeHandler is undefined! Check imports.");
        return;
    }
    // Register the game logic
    initializer.registerMatch("tic-tac-toe", { ...TicTacToeHandler });
    // Register RPC
    initializer.registerRpc("find_match", rpcFindMatch);
    logger.info("Lila Backend Initialized ");
};
// @ts-ignore
globalThis.InitModule = InitModule;
