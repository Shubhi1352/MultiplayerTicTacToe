import { Client, Session } from '@heroiclabs/nakama-js';

const NAKAMA_HOST = process.env.NEXT_PUBLIC_NAKAMA_HOST || 'localhost';
const NAKAMA_PORT = process.env.NEXT_PUBLIC_NAKAMA_PORT || '7350';
const SERVER_KEY  = process.env.NEXT_PUBLIC_NAKAMA_SERVER_KEY || 'defaultkey';

const client = new Client(SERVER_KEY, NAKAMA_HOST, NAKAMA_PORT, false);
let session: Session | null = null;
let socket: any = null;
let socketConnected = false;

export async function register(username: string, password: string): Promise<{ username: string }> {
    console.log('Starting registration for:', username);
    try {
        console.log('Getting anonymous session...');
        const anonSession = await client.authenticateDevice('register-temp-' + Date.now(), true);
        console.log('Anonymous session obtained, calling RPC...');
        const resp = await client.rpc(anonSession, 'register', { username, password });
        console.log('RPC response received:', resp);
        const data = resp.payload as { token?: string; userId?: string; username?: string; error?: string };
        if (data.error) throw new Error(data.error);

        console.log('Creating session from token...');
        session = Session.restore(data.token!, '');
        console.log('Session created successfully');
        return { username: data.username ?? username };
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

export async function login(username: string, password: string): Promise<{ username: string }> {
    const anonSession = await client.authenticateDevice('login-temp-' + Date.now(), true);
    const resp = await client.rpc(anonSession, 'login', { username, password });
    const data = resp.payload as { token?: string; userId?: string; username?: string; error?: string };
    if (data.error) throw new Error(data.error);

    session = Session.restore(data.token!, '');
    return { username: data.username ?? username };
}

export async function connectSocket(): Promise<void> {
    console.log('Connecting socket...');
    if (socketConnected) return;
    if (!session) throw new Error('Not authenticated');
    if (socket && socket.isConnected) return;
    console.log('Creating socket with explicit settings...');
    socket = client.createSocket(false, true); // Use SSL=false, autoConnect=true
    console.log('Socket created, connecting...');
    try {
        await socket.connect(session, true);
        console.log('Socket connected successfully!');
        socketConnected = true;
    } catch (error) {
        console.error('Socket connection error:', error);
        throw error;
    }
}

export function getSocket() { return socket; }
export function getSession() { return session; }

export async function findMatch(options: { ai: boolean; difficulty: string; timed: boolean }) {
    if (!session) throw new Error('Not authenticated');
    const resp = await client.rpc(session, 'find_match', options);
    return (resp.payload as any).matchId as string;
}

export async function getLeaderboard() {
    if (!session) throw new Error('Not authenticated');
    const resp = await client.rpc(session, 'get_leaderboard', {});
    return (resp.payload as any).leaderboard;
}

export async function getMyStats() {
    if (!session) throw new Error('Not authenticated');
    const resp = await client.rpc(session, 'get_my_stats', {});
    return resp.payload;
}