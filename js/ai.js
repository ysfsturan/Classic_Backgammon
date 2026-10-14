// Tavla Yapay Zeka Motoru (AI Engine: Kolay, Orta, Usta Seviyeleri)

class TavlaAI {
    constructor(difficulty = 'medium') {
        this.difficulty = difficulty; // 'easy' | 'medium' | 'hard'
    }

    setDifficulty(diff) {
        this.difficulty = diff;
    }

    // Mevcut durum için en iyi hamle dizisini (tüm zarlar için) bul
    findBestTurn(rules, player) {
        const sequences = this.generateAllTurnSequences(rules, player);
        if (sequences.length === 0) return null;

        // Tavla kuralı: Oynanabilecek maksimum sayıda zar oynanmak zorundadır!
        const maxMoves = Math.max(...sequences.map(s => s.moves.length));
        let bestSequences = sequences.filter(s => s.moves.length === maxMoves);

        // Eğer 2 zardan sadece biri oynanabiliyorsa ve zarlar farklıysa, büyük olanı oynama kuralı
        if (maxMoves === 1 && rules.rolledDice.length === 2 && rules.rolledDice[0] !== rules.rolledDice[1]) {
            const highDie = Math.max(...rules.rolledDice);
            const highDieSequences = bestSequences.filter(s => s.moves[0].die === highDie);
            if (highDieSequences.length > 0) {
                bestSequences = highDieSequences;
            }
        }

        // Kolay seviye: Rastgele seç veya basit hamle yap
        if (this.difficulty === 'easy') {
            // %35 ihtimalle kırabilecek bir hamle varsa onu seç, yoksa rastgele
            const hitMoves = bestSequences.filter(s => s.moves.some(m => m.hit));
            if (hitMoves.length > 0 && Math.random() < 0.35) {
                return hitMoves[Math.floor(Math.random() * hitMoves.length)].moves;
            }
            return bestSequences[Math.floor(Math.random() * bestSequences.length)].moves;
        }

        // Orta ve Usta seviye: Pozisyon değerlendirme puanı (Heuristic Evaluation)
        let bestScore = -Infinity;
        let chosenMoves = bestSequences[0].moves;

        for (const seq of bestSequences) {
            const score = this.evaluateState(seq.finalState, player, this.difficulty);
            if (score > bestScore) {
                bestScore = score;
                chosenMoves = seq.moves;
            }
        }

        return chosenMoves;
    }

    // Olası tüm hamle zincirlerini dallandırarak üret
    generateAllTurnSequences(rules, player) {
        const allSequences = [];

        function search(currentState, currentMoves) {
            const validMoves = currentState.getValidMovesForPlayer(player);

            if (validMoves.length === 0 || currentState.remainingDice.length === 0) {
                if (currentMoves.length > 0) {
                    allSequences.push({
                        moves: [...currentMoves],
                        finalState: currentState
                    });
                }
                return;
            }

            // Aynı hamleyi tekrar tekrar aratmamak için tekilleştir
            const seen = new Set();

            for (const move of validMoves) {
                const key = `${move.from}->${move.to}:${move.die}`;
                if (seen.has(key)) continue;
                seen.add(key);

                const nextState = currentState.clone();
                const res = nextState.makeMove(move.from, move.to, move.die);

                if (res && res.success) {
                    search(nextState, [...currentMoves, { ...move, hit: res.hit }]);
                }
            }
        }

        search(rules.clone(), []);
        return allSequences;
    }

    // Tahta pozisyonu puanlama (Heuristic Score)
    evaluateState(state, player, difficulty) {
        const opponent = player === 'white' ? 'black' : 'white';
        let score = 0;

        // 1. Toplanan Taşlar (Çok yüksek öncelik)
        score += state.off[player] * 45;
        score -= state.off[opponent] * 45;

        // 2. Kırık Taşlar (Rakibi kırmak ödül, kendisi kırılmak büyük ceza)
        score += state.bar[opponent] * 28;
        score -= state.bar[player] * 38;

        // 3. Pip Sayısı Farkı (Yarış üstünlüğü)
        const pipDiff = state.getPipCount(opponent) - state.getPipCount(player);
        score += pipDiff * 1.8;

        // 4. Kapılar ve Açık Taşlar (Anchors and Blots)
        let ownAnchors = 0;
        let ownBlots = 0;
        let consecutiveAnchors = 0;
        let maxConsecutiveAnchors = 0;

        for (let pt = 1; pt <= 24; pt++) {
            const cell = state.board[pt];
            if (cell.player === player) {
                if (cell.count >= 2) {
                    ownAnchors++;
                    consecutiveAnchors++;
                    if (consecutiveAnchors > maxConsecutiveAnchors) {
                        maxConsecutiveAnchors = consecutiveAnchors;
                    }

                    // Kendi evinde kapı yapmak rakibin barda kalma şansını artırır
                    const isHome = player === 'black' ? (pt >= 19 && pt <= 24) : (pt >= 1 && pt <= 6);
                    if (isHome) {
                        score += 9;
                    } else {
                        score += 5;
                    }
                } else if (cell.count === 1) {
                    // Açık taş
                    consecutiveAnchors = 0;
                    ownBlots++;

                    // Açığın vurulma riski var mı?
                    const isExposed = this.isBlotExposed(state, pt, player);
                    if (isExposed) {
                        score -= (difficulty === 'hard' ? 18 : 12);
                    } else {
                        // Arkasında rakip taş yoksa açık taş vurulamaz, ceza minimum
                        score -= 3;
                    }
                }
            } else if (cell.player === opponent) {
                consecutiveAnchors = 0;
            } else {
                consecutiveAnchors = 0;
            }
        }

        // Seri kapılar (Prime - Örn: 4'lü, 5'li, 6'lı kapı duvarı rakibi felç eder)
        if (maxConsecutiveAnchors >= 3) {
            score += maxConsecutiveAnchors * 7;
        }

        // Kaçak taşların (Back runners) ilerlemesi
        if (player === 'black') {
            // Siyahın 1 ve 2 gibi noktalardaki taşları ileri sürülmesi iyidir
            if (state.board[1].player === 'black') score -= state.board[1].count * 4;
            if (state.board[2].player === 'black') score -= state.board[2].count * 2;
        } else {
            if (state.board[24].player === 'white') score -= state.board[24].count * 4;
            if (state.board[23].player === 'white') score -= state.board[23].count * 2;
        }

        // Usta Seviye Ekstraları:
        if (difficulty === 'hard') {
            // Rakibin evinde güvenli kapı (advanced anchor)
            const oppHome = player === 'black' ? [1, 2, 3, 4, 5, 6] : [19, 20, 21, 22, 23, 24];
            for (const pt of oppHome) {
                if (state.board[pt].player === player && state.board[pt].count >= 2) {
                    score += 14; // Rakibin evinde demir atmak çok değerlidir
                }
            }
        }

        return score;
    }

    // Açık taşın gerisinde rakip taş var mı ve vurulabilir mi?
    isBlotExposed(state, point, player) {
        const opponent = player === 'white' ? 'black' : 'white';

        if (state.bar[opponent] > 0) {
            // Rakibin barda taşı varsa:
            // Siyah için rakip evi 1-6'dır, beyaz bardan 19-24'e girer
            // Beyaz için rakip evi 19-24'tür, siyah bardan 1-6'ya girer
            if (player === 'white' && point >= 19 && point <= 24) return true;
            if (player === 'black' && point >= 1 && point <= 6) return true;
        }

        if (player === 'white') {
            // Beyaz 24'ten 1'e gidiyor. Rakip Siyah ise 1'den 24'e gidiyor.
            // Beyazın açığı `point` noktasında.
            // Siyah taşlar bu noktadan küçük numaralarda (point - 1 .. point - 6) ise doğrudan vurabilir.
            for (let i = Math.max(1, point - 6); i < point; i++) {
                if (state.board[i].player === 'black' && state.board[i].count > 0) {
                    return true;
                }
            }
        } else {
            // Siyah 1'den 24'e gidiyor. Rakip Beyaz ise 24'ten 1'e gidiyor.
            // Siyahın açığı `point` noktasında.
            // Beyaz taşlar bu noktadan büyük numaralarda (point + 1 .. point + 6) ise doğrudan vurabilir.
            for (let i = point + 1; i <= Math.min(24, point + 6); i++) {
                if (state.board[i].player === 'white' && state.board[i].count > 0) {
                    return true;
                }
            }
        }

        return false;
    }
}

// Node veya tarayıcı uyumluluğu
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TavlaAI };
} else {
    window.TavlaAI = TavlaAI;
}
