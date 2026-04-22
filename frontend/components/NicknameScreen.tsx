'use client';
import { useState } from 'react';
import styles from './tictactoe.module.css';

interface Props {
    onLogin: (username: string, password: string) => Promise<void>;
    onRegister: (username: string, password: string) => Promise<void>;
    loading: boolean;
}

export default function NicknameScreen({ onLogin, onRegister, loading }: Props) {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const handle = async () => {
        setError('');
        if (!username.trim() || !password.trim()) { setError('Fill in both fields'); return; }
        if ( mode === 'register') {
            if (password.length < 8) {
                setError('Password must be at least 8 characters');
                return;
            }
            if (password !== confirmPassword) {
                setError('Passwords do not match');
                return;
            }
        }
        try {
            console.log('Attempting to', mode, 'with username:', username.trim());
            if (mode === 'login') await onLogin(username.trim(), password);
            else await onRegister(username.trim(), password);
            console.log('Success!');
        } catch (e: any) {
            console.error('Error during', mode, ':', e);
            setError(e.message || 'Something went wrong');
        }
    };

    const switchMode = () => {
        setMode(m => m === 'login' ? 'register' : 'login');
        setError('');
        setPassword('');
        setConfirmPassword('');
    };

    return (
        <div className={styles.settings}>
            <div className={styles.containerDiv}>
                <h1 className={`${styles.sets} ${styles.welcome}`}>
                    {mode === 'login' ? 'Welcome back' : 'Create account'}
                </h1>

                <input
                    className={styles.input}
                    placeholder="Username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    disabled={loading}
                    style={{ marginBottom: '12px' }}
                    autoComplete='username'
                />
                <input
                    className={styles.input}
                    type="password"
                    placeholder={mode === "register" ? "Password (min 8 chars)" : "Password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && mode === 'login' && handle()}
                    disabled={loading}
                    style={{ marginBottom: '8px' }}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                />

                {mode === 'register' && (
                    <input
                        className={styles.input}
                        type="password"
                        placeholder="confirm password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handle()}
                        disabled={loading}
                        style={{ marginBottom: '12px' }}
                        autoComplete="new-password"
                    />
                )}

                {error && (
                    <p style={{ color: 'red', fontSize: '13px', textAlign: 'center', marginBottom: '8px' }}>
                        {error}
                    </p>
                )}

                <button className={styles.btn} onClick={handle} disabled={loading}>
                    <h1>{loading ? '...' : mode === 'login' ? 'login' : 'register'}</h1>
                </button>

                <button
                    className={styles.btn}
                    style={{ marginTop: '10px', opacity: 0.7 }}
                    onClick={switchMode}
                    disabled={loading}
                >
                    <h1>{mode === 'login' ? 'new? register' : 'have account? login'}</h1>
                </button>
            </div>
        </div>
    );
}