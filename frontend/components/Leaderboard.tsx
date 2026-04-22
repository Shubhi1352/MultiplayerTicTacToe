'use client';
import { useEffect, useState } from 'react';
import { getLeaderboard, getMyStats } from '@/lib/nakama';
import styles from './tictactoe.module.css';

interface Props { onBack: () => void; }

export default function Leaderboard({ onBack }: Props) {
    const [rows, setRows] = useState<any[]>([]);
    const [myStats, setMyStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([getLeaderboard(), getMyStats()])
            .then(([lb, stats]) => { setRows(lb); setMyStats(stats); })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className={styles.settings} style={{ overflowY: 'auto' }}>
            <div className={styles.containerDiv}>
                <h1 className={`${styles.sets} ${styles.welcome}`}>🏆 Leaderboard</h1>
            </div>

            {myStats && (
                <div style={{ textAlign: 'center', marginBottom: '12px', fontSize: '0.95rem' }}>
                    <strong>You:</strong> {myStats.wins}W / {myStats.losses}L / {myStats.draws}D
                    &nbsp;| Streak: {myStats.streak} 🔥
                </div>
            )}

            {loading ? (
                <p style={{ textAlign: 'center' }}>Loading...</p>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #333' }}>
                            <th>#</th><th>Player</th><th>W</th><th>L</th><th>D</th><th>🔥</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => (
                            <tr key={i} style={{ textAlign: 'center', borderBottom: '1px solid #eee' }}>
                                <td>{r.rank}</td>
                                <td>{r.username}</td>
                                <td>{r.wins}</td>
                                <td>{r.losses}</td>
                                <td>{r.draws}</td>
                                <td>{r.streak}</td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: '16px' }}>No games yet!</td></tr>
                        )}
                    </tbody>
                </table>
            )}

            <div className={styles.containerDiv} style={{ marginTop: '16px' }}>
                <button className={styles.btn} onClick={onBack}>← Back</button>
            </div>
        </div>
    );
}