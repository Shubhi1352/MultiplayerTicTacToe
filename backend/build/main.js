// ── Game logic ───────────────────────────────────────────────
const WINNING_COMBOS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];
var TURN_TIME_LIMIT_SEC = 30;
var LEADERBOARD_ID = 'tictactoe_wins';
function tttCheckWinner(board) {
    for (var i = 0; i < WINNING_COMBOS.length; i++) {
        var c = WINNING_COMBOS[i];
        if (board[c[0]] !== null && board[c[0]] === board[c[1]] && board[c[0]] === board[c[2]])
            return c;
    }
    return null;
}
function tttAiMove(board) {
    for (var i = 0; i < WINNING_COMBOS.length; i++) {
        var c = WINNING_COMBOS[i];
        var v = [board[c[0]], board[c[1]], board[c[2]]];
        if (v.filter(function (x) { return x === 'O'; }).length === 2 && v.indexOf(null) !== -1)
            return c[v.indexOf(null)];
    }
    for (var i = 0; i < WINNING_COMBOS.length; i++) {
        var c = WINNING_COMBOS[i];
        var v = [board[c[0]], board[c[1]], board[c[2]]];
        if (v.filter(function (x) { return x === 'X'; }).length === 2 && v.indexOf(null) !== -1)
            return c[v.indexOf(null)];
    }
    if (board[4] === null)
        return 4;
    var corners = [0, 2, 6, 8];
    for (var i = 0; i < corners.length; i++) {
        if (board[corners[i]] === null)
            return corners[i];
    }
    var sides = [1, 3, 5, 7];
    for (var i = 0; i < sides.length; i++) {
        if (board[sides[i]] === null)
            return sides[i];
    }
    return -1;
}
function tttLlmMove(nk, logger, board, hfToken, hfModel) {
    if (!hfToken) {
        logger.warn('HF_TOKEN not set, using fallback');
        return tttAiMove(board);
    }
    var empty = [];
    for (var i = 0; i < 9; i++) {
        if (board[i] === null)
            empty.push(i);
    }
    try {
        var resp = nk.httpRequest('https://router.huggingface.co/v1/chat/completions', 'post', {
            'Authorization': 'Bearer ' + hfToken,
            'Content-Type': 'application/json',
        }, JSON.stringify({
            model: hfModel,
            temperature: 0.1,
            max_tokens: 5,
            messages: [
                { role: 'system', content: 'You are playing Tic-Tac-Toe as O. Reply with ONLY a single digit 0-8 for your move. No explanation, just one digit.' },
                { role: 'user', content: 'Empty positions: ' + empty.join(', ') + '. Choose one.' }
            ],
        }));
        if (resp.code === 200) {
            var result = JSON.parse(resp.body);
            var text = result.choices[0].message.content.trim();
            var match = text.match(/[0-8]/);
            if (match) {
                var pos = parseInt(match[0]);
                if (board[pos] === null) {
                    logger.info('LLM chose: ' + pos);
                    return pos;
                }
            }
            logger.warn('LLM bad response: "' + text + '", falling back');
        }
        else {
            logger.warn('HF API ' + resp.code + ', falling back');
        }
    }
    catch (e) {
        logger.warn('LLM error, falling back: ' + e);
    }
    return tttAiMove(board);
}
function tttLlmCommentary(nk, logger, board, aiPos, hfToken, hfModel) {
    if (!hfToken)
        return '';
    var boardStr = ['0', '1', '2', '3', '4', '5', '6', '7', '8'].map(function (_, i) {
        return board[i] === null ? String(i) : board[i];
    }).join('');
    try {
        var resp = nk.httpRequest('https://router.huggingface.co/v1/chat/completions', 'post', { 'Authorization': 'Bearer ' + hfToken, 'Content-Type': 'application/json' }, JSON.stringify({
            model: hfModel,
            temperature: 0.9,
            max_tokens: 40,
            messages: [
                { role: 'system', content: 'You are a snarky, very funny, sarcastic and villain AI playing Tic-Tac-Toe. After each of your moves, give ONE short witty/trash-talk comment (max 12 words). No quotes, no emojis, just plain text.' },
                { role: 'user', content: 'Board: ' + boardStr + '. I just played position ' + aiPos + '. Say something funny.' }
            ],
        }));
        if (resp.code === 200) {
            var result = JSON.parse(resp.body);
            var text = result.choices[0].message.content.trim();
            // strip quotes if model wraps in them
            text = text.replace(/^["']|["']$/g, '');
            if (text.length > 0 && text.length < 120) {
                logger.info('Commentary: ' + text);
                return text;
            }
        }
    }
    catch (e) {
        logger.warn('Commentary LLM error: ' + e);
    }
    return '';
}
// ── Stats helpers ─────────────────────────────────────────────
function initLeaderboard(nk, logger) {
    try {
        nk.leaderboardCreate(LEADERBOARD_ID, false, "descending" /* nkruntime.SortOrder.DESCENDING */, "increment" /* nkruntime.Operator.INCREMENTAL */, '', {});
        logger.info('Leaderboard ready');
    }
    catch (e) {
        logger.info('Leaderboard exists: ' + e);
    }
}
function getStats(nk, userId) {
    try {
        var records = nk.storageRead([{ collection: 'player_stats', key: 'stats', userId: userId }]);
        if (records.length > 0) {
            const stats = records[0].value;
            return stats;
        }
    }
    catch (e) { }
    return { wins: 0, losses: 0, draws: 0, streak: 0, totalMatches: 0 };
}
function saveStats(nk, userId, stats) {
    try {
        nk.storageWrite([{
                collection: 'player_stats', key: 'stats', userId: userId,
                value: stats, permissionRead: 2, permissionWrite: 1
            }]);
    }
    catch (e) { }
}
function recordResult(nk, userId, username, result) {
    var stats = getStats(nk, userId);
    stats.totalMatches = (stats.totalMatches || 0) + 1;
    if (result === 'win') {
        stats.wins++;
        stats.streak++;
        try {
            nk.leaderboardRecordWrite(LEADERBOARD_ID, userId, username, 1, 0, {});
        }
        catch (e) { }
    }
    else if (result === 'loss') {
        stats.losses++;
        stats.streak = 0;
    }
    else {
        stats.draws++;
        stats.streak = 0;
    }
    saveStats(nk, userId, stats);
}
function recordGameOver(nk, state, winnerId) {
    var keys = Object.keys(state.marks);
    for (var i = 0; i < keys.length; i++) {
        var uid = keys[i];
        if (uid === 'ai-bot')
            continue;
        var username = state.usernames[uid] || uid;
        if (winnerId === 'draw')
            recordResult(nk, uid, username, 'draw');
        else if (uid === winnerId)
            recordResult(nk, uid, username, 'win');
        else
            recordResult(nk, uid, username, 'loss');
    }
}
// ── Match handlers ────────────────────────────────────────────
function matchInit(ctx, logger, nk, params) {
    var aiMode = params && params['ai'] === 'true';
    var difficulty = (params && params['difficulty']) || 'medium';
    var timedMode = params && params['timed'] === 'true';
    var label = aiMode ? 'ai' : ('pvp_' + difficulty + '_' + (timedMode ? 'timed' : 'free'));
    logger.info('matchInit creating match with label: "' + label + '"');
    logger.info('matchInit ai=' + aiMode + ' difficulty=' + difficulty + ' timed=' + timedMode);
    return {
        state: {
            board: [null, null, null, null, null, null, null, null, null],
            marks: {}, usernames: {}, turn: null, winner: null,
            aiMode: aiMode, difficulty: difficulty, timedMode: timedMode,
            turnStartTick: 0,
            hfToken: ctx.env['HF_TOKEN'] || '',
            hfModel: ctx.env['HF_MODEL'] || 'Qwen/Qwen2.5-7B-Instruct',
        },
        tickRate: 1,
        label: label,
    };
}
function matchJoinAttempt(ctx, logger, nk, dispatcher, tick, state, presence, metadata) {
    var s = state;
    if (Object.keys(s.marks).length >= 2)
        return { state: s, accept: false, rejectMessage: 'Match is full' };
    return { state: s, accept: true };
}
function matchJoin(ctx, logger, nk, dispatcher, tick, state, presences) {
    var s = state;
    for (var i = 0; i < presences.length; i++) {
        var p = presences[i];
        if (!s.marks[p.userId]) {
            s.marks[p.userId] = Object.keys(s.marks).length === 0 ? 'X' : 'O';
            var displayUsername = (p.username || '').replace(/@ttt\.local$/i, '').replace(/@.*$/, '');
            s.usernames[p.userId] = displayUsername || p.userId;
            logger.info('joined: ' + s.usernames[p.userId] + ' as ' + s.marks[p.userId]);
        }
    }
    if (s.aiMode && !s.marks['ai-bot']) {
        s.marks['ai-bot'] = 'O';
        s.usernames['ai-bot'] = 'AI Bot';
    }
    if (Object.keys(s.marks).length === 2 && !s.turn) {
        var keys = Object.keys(s.marks);
        for (var i = 0; i < keys.length; i++) {
            if (s.marks[keys[i]] === 'X') {
                s.turn = keys[i];
                break;
            }
        }
        s.turnStartTick = tick;
        dispatcher.broadcastMessage(1, JSON.stringify({
            type: 'game_start', board: s.board, marks: s.marks,
            usernames: s.usernames, turn: s.turn,
            timedMode: s.timedMode, turnTimeLimit: TURN_TIME_LIMIT_SEC,
            difficulty: s.difficulty,
        }), null, null, true);
    }
    return { state: s };
}
function matchLoop(ctx, logger, nk, dispatcher, tick, state, messages) {
    var s = state;
    if (s.winner)
        return null;
    if (s.timedMode && s.turn && s.turn !== 'ai-bot') {
        var elapsed = tick - s.turnStartTick;
        var timeLeft = TURN_TIME_LIMIT_SEC - elapsed;
        if (timeLeft <= 0) {
            var keys0 = Object.keys(s.marks);
            var winner = null;
            for (var i = 0; i < keys0.length; i++) {
                if (keys0[i] !== s.turn && keys0[i] !== 'ai-bot') {
                    winner = keys0[i];
                    break;
                }
            }
            s.winner = winner || 'draw';
            recordGameOver(nk, s, s.winner);
            dispatcher.broadcastMessage(2, JSON.stringify({
                type: 'game_over', board: s.board, winner: s.winner,
                reason: 'timeout', usernames: s.usernames,
            }), null, null, true);
            return null;
        }
        dispatcher.broadcastMessage(5, JSON.stringify({
            type: 'timer_tick', timeLeft: timeLeft, turn: s.turn,
        }), null, null, true);
    }
    for (var i = 0; i < messages.length; i++) {
        var msg = messages[i];
        if (msg.opCode !== 2)
            continue;
        var data = JSON.parse(nk.binaryToString(msg.data));
        var pos = data.position;
        var uid = msg.sender.userId;
        if (uid !== s.turn) {
            dispatcher.broadcastMessage(3, JSON.stringify({ type: 'error', msg: 'Not your turn' }), [msg.sender], null, true);
            continue;
        }
        if (pos < 0 || pos > 8 || s.board[pos] !== null) {
            dispatcher.broadcastMessage(3, JSON.stringify({ type: 'error', msg: 'Invalid move' }), [msg.sender], null, true);
            continue;
        }
        s.board[pos] = s.marks[uid];
        var win = tttCheckWinner(s.board);
        if (win) {
            s.winner = uid;
            recordGameOver(nk, s, uid);
            dispatcher.broadcastMessage(2, JSON.stringify({ type: 'game_over', board: s.board, winner: uid, winningPos: win, usernames: s.usernames }), null, null, true);
            return null;
        }
        if (s.board.indexOf(null) === -1) {
            s.winner = 'draw';
            recordGameOver(nk, s, 'draw');
            dispatcher.broadcastMessage(2, JSON.stringify({ type: 'game_over', board: s.board, winner: 'draw', usernames: s.usernames }), null, null, true);
            return null;
        }
        var keys = Object.keys(s.marks);
        for (var j = 0; j < keys.length; j++) {
            if (keys[j] !== uid) {
                s.turn = keys[j];
                break;
            }
        }
        s.turnStartTick = tick;
        dispatcher.broadcastMessage(2, JSON.stringify({ type: 'board_update', board: s.board, turn: s.turn, usernames: s.usernames }), null, null, true);
        if (s.aiMode && s.turn === 'ai-bot') {
            var aiPos = tttLlmMove(nk, logger, s.board, s.hfToken, s.hfModel);
            if (aiPos !== -1) {
                s.board[aiPos] = 'O';
                var aiWin = tttCheckWinner(s.board);
                if (aiWin) {
                    s.winner = 'ai-bot';
                    recordGameOver(nk, s, 'ai-bot');
                    dispatcher.broadcastMessage(2, JSON.stringify({ type: 'game_over', board: s.board, winner: 'ai-bot', winningPos: aiWin, usernames: s.usernames }), null, null, true);
                    return null;
                }
                if (s.board.indexOf(null) === -1) {
                    s.winner = 'draw';
                    recordGameOver(nk, s, 'draw');
                    dispatcher.broadcastMessage(2, JSON.stringify({ type: 'game_over', board: s.board, winner: 'draw', usernames: s.usernames }), null, null, true);
                    return null;
                }
                s.turn = uid;
                s.turnStartTick = tick;
                var commentary = tttLlmCommentary(nk, logger, s.board, aiPos, s.hfToken, s.hfModel);
                dispatcher.broadcastMessage(2, JSON.stringify({ type: 'board_update', board: s.board, turn: s.turn, usernames: s.usernames, commentary: commentary }), null, null, true);
            }
        }
    }
    return { state: s };
}
function matchLeave(ctx, logger, nk, dispatcher, tick, state, presences) {
    var s = state;
    if (!s.winner) {
        var left = presences[0] ? presences[0].userId : null;
        if (left && left !== 'ai-bot')
            recordResult(nk, left, s.usernames[left] || left, 'loss');
        dispatcher.broadcastMessage(4, JSON.stringify({ type: 'opponent_left' }), null, null, true);
    }
    return { state: s };
}
function matchTerminate(ctx, logger, nk, dispatcher, tick, state, graceSeconds) {
    return { state: state };
}
function matchSignal(ctx, logger, nk, dispatcher, tick, state, data) {
    return { state: state, data: data };
}
// ── RPCs ──────────────────────────────────────────────────────
function rpcFindMatch(ctx, logger, nk, payload) {
    var data = {};
    try {
        data = payload ? JSON.parse(payload) : {};
        if (typeof data === 'string')
            data = JSON.parse(data);
    }
    catch (e) { }
    var aiMode = data.ai === true || data.ai === 'true';
    var difficulty = data.difficulty || 'medium';
    var timedMode = data.timed === true || data.timed === 'true';
    logger.info('rpcFindMatch ai=' + aiMode + ' difficulty=' + difficulty + ' timed=' + timedMode);
    if (!aiMode) {
        var label = 'pvp_' + difficulty + '_' + (timedMode ? 'timed' : 'free');
        logger.info('rpcFindMatch searching label: "' + label + '" data: ' + JSON.stringify(data));
        var matches = nk.matchList(10, true, label, 1, 1, '');
        for (var i = 0; i < matches.length; i++) {
            if (matches[i].size === 1 && matches[i].label === label) {
                logger.info('Found waiting match: ' + matches[i].matchId + ' label: ' + matches[i].label);
                return JSON.stringify({ matchId: matches[i].matchId });
            }
        }
    }
    var matchId = nk.matchCreate('tic-tac-toe', { ai: aiMode ? 'true' : 'false', difficulty: difficulty, timed: timedMode ? 'true' : 'false' });
    logger.info('Created match: ' + matchId);
    return JSON.stringify({ matchId: matchId });
}
function rpcRegister(ctx, logger, nk, payload) {
    var data = {};
    try {
        data = JSON.parse(payload);
    }
    catch (e) {
        return JSON.stringify({ error: 'Invalid payload' });
    }
    var username = (data.username || '').trim();
    var password = data.password;
    if (!username || !password)
        return JSON.stringify({ error: 'Username and password required' });
    if (password.length < 8)
        return JSON.stringify({ error: 'Password must be at least 8 characters' });
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return JSON.stringify({ error: 'Username must be 3–20 characters (letters, numbers, underscores)' });
    }
    try {
        var authResult = nk.authenticateEmail(username + '@ttt.local', password, username, true);
        nk.accountUpdateId(authResult.userId, username, null, null, null, null, null, null);
        var expiresAt = Math.floor(Date.now() / 1000) + 7200;
        var tokenResult = nk.authenticateTokenGenerate(authResult.userId, authResult.username, expiresAt, {});
        return JSON.stringify({
            token: tokenResult.token,
            userId: authResult.userId,
            username: username,
        });
    }
    catch (e) {
        return JSON.stringify({ error: 'Username already taken' });
    }
}
function rpcLogin(ctx, logger, nk, payload) {
    var data = {};
    try {
        data = JSON.parse(payload);
    }
    catch (e) {
        return JSON.stringify({ error: 'Invalid payload' });
    }
    var username = (data.username || '').trim();
    var password = data.password;
    if (!username || !password)
        return JSON.stringify({ error: 'Username and password required' });
    try {
        var authResult = nk.authenticateEmail(username + '@ttt.local', password, username, false);
        var account = nk.accountGetId(authResult.userId);
        var displayName = account.user.username || username;
        var expiresAt = Math.floor(Date.now() / 1000) + 7200;
        var tokenResult = nk.authenticateTokenGenerate(authResult.userId, authResult.username, expiresAt, {});
        return JSON.stringify({
            token: tokenResult.token,
            userId: authResult.userId,
            username: displayName,
        });
    }
    catch (e) {
        return JSON.stringify({ error: 'Invalid username or password' });
    }
}
function rpcGetLeaderboard(ctx, logger, nk, payload) {
    try {
        var records = nk.leaderboardRecordsList(LEADERBOARD_ID, [], 20, null, 0);
        var result = [];
        for (var i = 0; i < records.records.length; i++) {
            var r = records.records[i];
            var stats = getStats(nk, r.ownerId);
            result.push({
                rank: r.rank,
                username: r.username,
                wins: stats.wins,
                losses: stats.losses,
                draws: stats.draws,
                streak: stats.streak,
                totalMatches: stats.totalMatches || (stats.wins + stats.losses + stats.draws),
            });
        }
        return JSON.stringify({ leaderboard: result });
    }
    catch (e) {
        logger.error('Leaderboard error: ' + e);
        return JSON.stringify({ leaderboard: [] });
    }
}
function rpcGetMyStats(ctx, logger, nk, payload) {
    var stats = getStats(nk, ctx.userId);
    return JSON.stringify(stats);
}
// ── InitModule ───────────────────────────────────────────────
function InitModule(ctx, logger, nk, initializer) {
    logger.info('Initializing TicTacToe backend...');
    logger.info('ctx.env dump: ' + JSON.stringify(ctx.env));
    initLeaderboard(nk, logger);
    initializer.registerMatch('tic-tac-toe', {
        matchInit: matchInit,
        matchJoinAttempt: matchJoinAttempt,
        matchJoin: matchJoin,
        matchLoop: matchLoop,
        matchLeave: matchLeave,
        matchTerminate: matchTerminate,
        matchSignal: matchSignal,
    });
    initializer.registerRpc('find_match', rpcFindMatch);
    initializer.registerRpc('register', rpcRegister);
    initializer.registerRpc('login', rpcLogin);
    initializer.registerRpc('get_leaderboard', rpcGetLeaderboard);
    initializer.registerRpc('get_my_stats', rpcGetMyStats);
    logger.info('Backend initialized');
}
globalThis.InitModule = InitModule;
