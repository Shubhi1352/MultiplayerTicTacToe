export const OP = {
    MOVE: 2,
} as const;

export interface GameStartMsg {
    type: 'game_start';
    board: (string | null)[];
    marks: Record<string, string>;
    usernames: Record<string, string>;
    turn: string;
    timedMode: boolean;
    turnTimeLimit: number;
    difficulty: string;
}

export interface BoardUpdateMsg {
    type: 'board_update';
    board: (string | null)[];
    turn: string;
    usernames: Record<string, string>;
    commentary?: string;
}

export interface GameOverMsg {
    type: 'game_over';
    board: (string | null)[];
    winner: string;
    winningPos?: number[];
    reason?: string;
    usernames: Record<string, string>;
}

export interface TimerTickMsg {
    type: 'timer_tick';
    timeLeft: number;
    turn: string;
}

export interface CommentaryMsg {
    type: 'ai_commentary';
    commentary: string;
}

export interface ErrorMsg {
    type: 'error';
    msg: string;
}

export type ServerMsg =
    | GameStartMsg
    | BoardUpdateMsg
    | GameOverMsg
    | TimerTickMsg
    | CommentaryMsg
    | ErrorMsg
    | { type: 'opponent_left' };