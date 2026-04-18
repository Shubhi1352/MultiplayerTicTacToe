// ── Game logic ──────────────────────────────────────────────

var WINNING_COMBOS = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
];

function tttCheckWinner(board: any[]): number[] | null {
    for (var i = 0; i < WINNING_COMBOS.length; i++) {
        var c = WINNING_COMBOS[i];
        if (board[c[0]] !== null && board[c[0]] === board[c[1]] && board[c[0]] === board[c[2]]) {
            return c;
        }
    }
    return null;
}

function tttAiMove(board: any[]): number {
    for (var i = 0; i < WINNING_COMBOS.length; i++) {
        var c = WINNING_COMBOS[i];
        var v = [board[c[0]], board[c[1]], board[c[2]]];
        if (v.filter(function(x: any){ return x === 'O'; }).length === 2 && v.indexOf(null) !== -1)
            return c[v.indexOf(null)];
    }
    for (var i = 0; i < WINNING_COMBOS.length; i++) {
        var c = WINNING_COMBOS[i];
        var v = [board[c[0]], board[c[1]], board[c[2]]];
        if (v.filter(function(x: any){ return x === 'X'; }).length === 2 && v.indexOf(null) !== -1)
            return c[v.indexOf(null)];
    }
    if (board[4] === null) return 4;
    for (var i = 0; i < [0,2,6,8].length; i++) { var idx = [0,2,6,8][i]; if (board[idx] === null) return idx; }
    for (var i = 0; i < [1,3,5,7].length; i++) { var idx = [1,3,5,7][i]; if (board[idx] === null) return idx; }
    return -1;
}

// ── Match handler functions (must be named globals) ──────────

function matchInit(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, params: {[key:string]:string}) {
    var aiMode = params && params['ai'] === 'true';
    logger.info('matchInit ai=' + aiMode);
    return {
        state: { board: [null,null,null,null,null,null,null,null,null], marks: {}, turn: null, winner: null, winningPos: null, aiMode: aiMode },
        tickRate: 1,
        label: aiMode ? 'ai' : 'pvp',
    };
}

function matchJoinAttempt(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, presence: nkruntime.Presence, metadata: {[key:string]:any}) {
    var s = state as any;
    if (Object.keys(s.marks).length >= 2) return { state: s, accept: false, rejectMessage: 'Match is full' };
    return { state: s, accept: true };
}

function matchJoin(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, presences: nkruntime.Presence[]) {
    var s = state as any;
    for (var i = 0; i < presences.length; i++) {
        var p = presences[i];
        if (!s.marks[p.userId]) {
            s.marks[p.userId] = Object.keys(s.marks).length === 0 ? 'X' : 'O';
            logger.info('joined: ' + p.userId + ' as ' + s.marks[p.userId]);
        }
    }
    if (s.aiMode && !s.marks['ai-bot']) s.marks['ai-bot'] = 'O';
    if (Object.keys(s.marks).length === 2 && !s.turn) {
        var keys = Object.keys(s.marks);
        for (var i = 0; i < keys.length; i++) { if (s.marks[keys[i]] === 'X') { s.turn = keys[i]; break; } }
        dispatcher.broadcastMessage(1, JSON.stringify({ type:'game_start', board:s.board, marks:s.marks, turn:s.turn }), null, null, true);
    }
    return { state: s };
}

function matchLoop(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, messages: nkruntime.MatchMessage[]) {
    var s = state as any;
    if (s.winner) return null;
    for (var i = 0; i < messages.length; i++) {
        var msg = messages[i];
        if (msg.opCode !== 2) continue;
        var data = JSON.parse(nk.binaryToString(msg.data));
        var pos = data.position;
        var uid = msg.sender.userId;
        if (uid !== s.turn) { dispatcher.broadcastMessage(3, JSON.stringify({type:'error',msg:'Not your turn'}), [msg.sender], null, true); continue; }
        if (pos < 0 || pos > 8 || s.board[pos] !== null) { dispatcher.broadcastMessage(3, JSON.stringify({type:'error',msg:'Invalid move'}), [msg.sender], null, true); continue; }
        s.board[pos] = s.marks[uid];
        var win = tttCheckWinner(s.board);
        if (win) { s.winner = uid; s.winningPos = win; dispatcher.broadcastMessage(2, JSON.stringify({type:'game_over',board:s.board,winner:uid,winningPos:win}), null, null, true); return null; }
        if (s.board.indexOf(null) === -1) { s.winner = 'draw'; dispatcher.broadcastMessage(2, JSON.stringify({type:'game_over',board:s.board,winner:'draw'}), null, null, true); return null; }
        var keys2 = Object.keys(s.marks);
        for (var j = 0; j < keys2.length; j++) { if (keys2[j] !== uid) { s.turn = keys2[j]; break; } }
        dispatcher.broadcastMessage(2, JSON.stringify({type:'board_update',board:s.board,turn:s.turn}), null, null, true);
        if (s.aiMode && s.turn === 'ai-bot') {
            var aiPos = tttAiMove(s.board);
            if (aiPos !== -1) {
                s.board[aiPos] = 'O';
                var aiWin = tttCheckWinner(s.board);
                if (aiWin) { s.winner = 'ai-bot'; dispatcher.broadcastMessage(2, JSON.stringify({type:'game_over',board:s.board,winner:'ai-bot',winningPos:aiWin}), null, null, true); return null; }
                if (s.board.indexOf(null) === -1) { s.winner = 'draw'; dispatcher.broadcastMessage(2, JSON.stringify({type:'game_over',board:s.board,winner:'draw'}), null, null, true); return null; }
                s.turn = uid;
                dispatcher.broadcastMessage(2, JSON.stringify({type:'board_update',board:s.board,turn:s.turn}), null, null, true);
            }
        }
    }
    return { state: s };
}

function matchLeave(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, presences: nkruntime.Presence[]) {
    var s = state as any;
    if (!s.winner) dispatcher.broadcastMessage(4, JSON.stringify({type:'opponent_left'}), null, null, true);
    return { state: s };
}

function matchTerminate(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, graceSeconds: number) {
    return { state: state };
}

function matchSignal(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, data: string) {
    return { state: state, data: data };
}

// ── RPC ─────────────────────────────────────────────────────

function rpcFindMatch(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) {
    var data = payload ? JSON.parse(payload) : {};
    var aiMode = data.ai === true;
    if (!aiMode) {
        var matches = nk.matchList(10, true, 'pvp', 1, 1, '');
        if (matches.length > 0) return JSON.stringify({ matchId: matches[0].matchId });
    }
    var matchId = nk.matchCreate('tic-tac-toe', { ai: aiMode ? 'true' : 'false' });
    return JSON.stringify({ matchId: matchId });
}

// ── Expose handlers to global scope so Nakama can find them ──

globalThis.matchInit = matchInit;
globalThis.matchJoinAttempt = matchJoinAttempt;
globalThis.matchJoin = matchJoin;
globalThis.matchLoop = matchLoop;
globalThis.matchLeave = matchLeave;
globalThis.matchTerminate = matchTerminate;
globalThis.matchSignal = matchSignal;

// ── InitModule ───────────────────────────────────────────────

function InitModule(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, initializer: nkruntime.Initializer): void {
    logger.info('Initializing TicTacToe backend...');

    initializer.registerMatch('tic-tac-toe', {
        matchInit: globalThis.matchInit,
        matchJoinAttempt: globalThis.matchJoinAttempt,
        matchJoin: globalThis.matchJoin,
        matchLoop: globalThis.matchLoop,
        matchLeave: globalThis.matchLeave,
        matchTerminate: globalThis.matchTerminate,
        matchSignal: globalThis.matchSignal,
    });

    initializer.registerRpc('find_match', rpcFindMatch);
    logger.info('Backend initialized');
}

globalThis.InitModule = InitModule;