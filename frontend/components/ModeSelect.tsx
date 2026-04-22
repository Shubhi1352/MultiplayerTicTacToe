'use client';
import styles from './tictactoe.module.css';

interface Props {
    onSelect: (options: { ai: boolean; difficulty: string; timed: boolean }) => void;
    onLeaderboard: () => void;
}

export default function ModeSelect({ onSelect, onLeaderboard }: Props) {
    return (
        <div className={styles.settings}>
            <div className={styles.containerDiv}>
                <h1 className={`${styles.sets} ${styles.chooses}`}>CHOOSE MODE</h1>
            </div>
            <div className={styles.containerDiv}>
                <div className={`${styles.sets} ${styles.options} ${styles.chooses}`}>
                    <button className={styles.btn} onClick={() =>
                        onSelect({ ai: false, difficulty: 'medium', timed: false })
                    }>
                        👥 PvP Classic
                    </button>
                    <button className={styles.btn} onClick={() =>
                        onSelect({ ai: false, difficulty: 'medium', timed: true })
                    }>
                        ⏱️ PvP Timed
                    </button>
                </div>
            </div>
            <div className={styles.containerDiv}>
                <h2 className={`${styles.sets} ${styles.destiny}`} style={{ margin: '8px 0' }}>
                    vs AI
                </h2>
                <div className={`${styles.sets} ${styles.options}`}>
                    <button className={styles.btn} onClick={() =>
                        onSelect({ ai: true, difficulty: 'easy', timed: false })
                    }>😄 Easy</button>
                    <button className={styles.btn} onClick={() =>
                        onSelect({ ai: true, difficulty: 'medium', timed: false })
                    }>🤔 Medium</button>
                    <button className={styles.btn} onClick={() =>
                        onSelect({ ai: true, difficulty: 'hard', timed: false })
                    }>💀 Hard</button>
                </div>
            </div>
            <div className={styles.containerDiv} style={{ marginTop: '16px' }}>
                <button className={styles.btn} onClick={onLeaderboard}>
                    🏆 Leaderboard
                </button>
            </div>
        </div>
    );
}