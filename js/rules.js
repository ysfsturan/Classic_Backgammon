// Tavla Kuralları ve Oyun Motoru (Backgammon Rules & State Engine)

const DICE_NAMES_TR = {
    '1-1': 'Hep Yek',
    '2-2': 'Dü Bara',
    '3-3': 'Dü Se',
    '4-4': 'Dört Cihar',
    '5-5': 'Dü Beş',
    '6-6': 'Dü Şeş',
    '6-5': 'Şeş Beş',
    '6-4': 'Şeş-ü Cihar',
    '6-3': 'Şeş-ü Se',
    '6-2': 'Şeş-i Dü',
    '6-1': 'Şeş-i Yek',
    '5-4': 'Penc-ü Cihar',
    '5-3': 'Penc-ü Se',
    '5-2': 'Penc-i Dü',
    '5-1': 'Penc-i Yek',
    '4-3': 'Cihar-ü Se',
    '4-2': 'Cihar-ı Dü',
    '4-1': 'Cihar-ı Yek',
    '3-2': 'Seba-i Dü',
    '3-1': 'Se Yek',
    '2-1': 'Yek-i Dü (İki Bir)'
};

function getDiceNameTR(d1, d2) {
    const high = Math.max(d1, d2);
    const low = Math.min(d1, d2);
    const key = `${high}-${low}`;
    return DICE_NAMES_TR[key] || `${high} - ${low}`;
}

class TavlaRules {
    constructor() {
        this.resetGame();
    }

    resetGame() {
        // Tahta 1-24 arası noktalar
        // Her nokta: { player: 'white' | 'black' | null, count: number }
        this.board = Array(25).fill(null).map(() => ({ player: null, count: 0 }));

        // Standart Başlangıç Dizilimi:
        // White: 24'te 2, 13'te 5, 8'de 3, 6'da 5 (Toplam 15)
        // Black: 1'de 2, 12'de 5, 17'de 3, 19'da 5 (Toplam 15)
        this.board[1] = { player: 'black', count: 2 };
        this.board[6] = { player: 'white', count: 5 };
        this.board[8] = { player: 'white', count: 3 };
        this.board[12] = { player: 'black', count: 5 };
        this.board[13] = { player: 'white', count: 5 };
        this.board[17] = { player: 'black', count: 3 };
        this.board[19] = { player: 'black', count: 5 };
        this.board[24] = { player: 'white', count: 2 };

        // Kırık taşlar (Bar)
        this.bar = { white: 0, black: 0 };

        // Toplanan taşlar (Off)
        this.off = { white: 0, black: 0 };

        // Sıra kimde
        this.turn = 'white';

        // Mevcut zarlar ve kullanılmamış zarlar
        this.rolledDice = [];      // Örn: [6, 5]
        this.remainingDice = [];   // Oynanabilir zarlar örn: [6, 5] veya çiftte [4,4,4,4]

        // Hamle geçmişi (Mevcut elin geri alınabilmesi için)
        this.turnHistory = [];

        // Oyun durumu
        this.hasRolled = false;
        this.gameOver = false;
        this.winner = null;
        this.winType = null; // 'normal', 'mars', 'katmerli'
    }

    // Clone state for AI search or simulation
    clone() {
        const copy = new TavlaRules();
        copy.board = this.board.map(pt => ({ player: pt.player, count: pt.count }));
        copy.bar = { ...this.bar };
        copy.off = { ...this.off };
        copy.turn = this.turn;
        copy.rolledDice = [...this.rolledDice];
        copy.remainingDice = [...this.remainingDice];
        copy.turnHistory = JSON.parse(JSON.stringify(this.turnHistory));
        copy.hasRolled = this.hasRolled;
        copy.gameOver = this.gameOver;
        copy.winner = this.winner;
        copy.winType = this.winType;
        return copy;
    }

    // Zar at
    rollDice(fixedValues = null) {
        if (this.hasRolled) return null;

        let d1, d2;
        if (fixedValues && fixedValues.length === 2) {
            d1 = fixedValues[0];
            d2 = fixedValues[1];
        } else {
            d1 = Math.floor(Math.random() * 6) + 1;
            d2 = Math.floor(Math.random() * 6) + 1;
        }

        this.rolledDice = [d1, d2];
        if (d1 === d2) {
            this.remainingDice = [d1, d1, d1, d1];
        } else {
            this.remainingDice = [d1, d2];
        }

        this.hasRolled = true;
        this.turnHistory = [];

        return {
            dice: [d1, d2],
            isDouble: d1 === d2,
            nameTR: getDiceNameTR(d1, d2)
        };
    }

    // Taş toplama aşamasında mı?
    canBearOff(player) {
        // Barda taş varsa toplayamaz
        if (this.bar[player] > 0) return false;

        let checkersInHome = this.off[player];

        if (player === 'white') {
            // White home: 1-6 arası
            for (let i = 1; i <= 6; i++) {
                if (this.board[i].player === 'white') {
                    checkersInHome += this.board[i].count;
                }
            }
        } else {
            // Black home: 19-24 arası
            for (let i = 19; i <= 24; i++) {
                if (this.board[i].player === 'black') {
                    checkersInHome += this.board[i].count;
                }
            }
        }

        return checkersInHome === 15;
    }

    // Belirli bir taş/nokta için verilen zar ile geçerli hamle var mı?
    // from: 'bar' ya da 1..24
    // Dönüş: target point (1..24), 'off' (toplama), ya da null (geçersiz)
    getTargetForMove(player, from, die) {
        const opponent = player === 'white' ? 'black' : 'white';

        if (from === 'bar') {
            if (this.bar[player] <= 0) return null;
            // White: rakip evi 19-24 arası (25 - die)
            // Black: rakip evi 1-6 arası (die)
            const entryPoint = player === 'white' ? (25 - die) : die;
            const target = this.board[entryPoint];

            // Hedef noktada 2 veya daha fazla rakip taşı varsa kapıdır, girilemez
            if (target.player === opponent && target.count >= 2) {
                return null;
            }
            return entryPoint;
        }

        // Normal tahtadaki taş
        const pt = this.board[from];
        if (pt.player !== player || pt.count <= 0) return null;

        // Eğer barda taş varsa, tahtadaki diğer taşlar oynanamaz!
        if (this.bar[player] > 0) return null;

        if (player === 'white') {
            const dest = from - die;
            if (dest >= 1) {
                const target = this.board[dest];
                if (target.player === opponent && target.count >= 2) {
                    return null; // Kapı
                }
                return dest;
            } else {
                // Taş toplama kontrolü (dest <= 0)
                if (!this.canBearOff('white')) return null;

                if (dest === 0) {
                    // Tam zarla toplama
                    return 'off';
                } else {
                    // Daha büyük zarla toplama: Kendisinden daha geride (daha büyük numaralı) taş olmamalı
                    for (let i = from + 1; i <= 6; i++) {
                        if (this.board[i].player === 'white' && this.board[i].count > 0) {
                            return null; // Daha geride taş var, önce o oynanmalı/toplanmalı
                        }
                    }
                    return 'off';
                }
            }
        } else {
            // Black (1 -> 24)
            const dest = from + die;
            if (dest <= 24) {
                const target = this.board[dest];
                if (target.player === opponent && target.count >= 2) {
                    return null; // Kapı
                }
                return dest;
            } else {
                // Taş toplama kontrolü (dest >= 25)
                if (!this.canBearOff('black')) return null;

                if (dest === 25) {
                    // Tam zarla toplama
                    return 'off';
                } else {
                    // Daha büyük zarla toplama: Kendisinden daha geride (daha küçük numaralı) taş olmamalı
                    for (let i = 19; i < from; i++) {
                        if (this.board[i].player === 'black' && this.board[i].count > 0) {
                            return null;
                        }
                    }
                    return 'off';
                }
            }
        }
    }

    // Belirli bir oyuncu için mevcut zarlarla oynanabilecek TÜM yasal hamleleri bul
    // Dönüş: Array of { from, to, die }
    getValidMovesForPlayer(player) {
        if (!this.hasRolled || this.remainingDice.length === 0) return [];

        const moves = [];
        // Kullanılabilir tekil zarları al (örn [4,4,4,4] için tekil [4], [6,5] için [6,5])
        const uniqueDice = [...new Set(this.remainingDice)];

        if (this.bar[player] > 0) {
            for (const die of uniqueDice) {
                const to = this.getTargetForMove(player, 'bar', die);
                if (to !== null) {
                    moves.push({ from: 'bar', to, die });
                }
            }
            return moves;
        }

        for (let pt = 1; pt <= 24; pt++) {
            if (this.board[pt].player === player && this.board[pt].count > 0) {
                for (const die of uniqueDice) {
                    const to = this.getTargetForMove(player, pt, die);
                    if (to !== null) {
                        moves.push({ from: pt, to, die });
                    }
                }
            }
        }

        return moves;
    }

    // Belirli bir noktadan (from) hangi hedeflere gidilebilir?
    getValidDestinations(from) {
        const moves = this.getValidMovesForPlayer(this.turn);
        const destinations = [];

        for (const m of moves) {
            if (m.from === from) {
                destinations.push({ to: m.to, die: m.die });
            }
        }
        return destinations;
    }

    // Hamle uygula
    makeMove(from, to, die) {
        const player = this.turn;
        const opponent = player === 'white' ? 'black' : 'white';
        let hit = false;

        // 1. Zarı düş
        const dieIdx = this.remainingDice.indexOf(die);
        if (dieIdx === -1) return false;
        this.remainingDice.splice(dieIdx, 1);

        // 2. Taşın çıkış noktasını güncelle
        if (from === 'bar') {
            this.bar[player]--;
        } else {
            this.board[from].count--;
            if (this.board[from].count === 0) {
                this.board[from].player = null;
            }
        }

        // 3. Hedefe varış
        if (to === 'off') {
            this.off[player]++;
        } else {
            const dest = this.board[to];
            if (dest.player === opponent && dest.count === 1) {
                // Taş kırma (Hit)
                dest.player = player;
                dest.count = 1;
                this.bar[opponent]++;
                hit = true;
            } else {
                dest.player = player;
                dest.count++;
            }
        }

        // 4. Geri alma geçmişine ekle
        this.turnHistory.push({
            from,
            to,
            die,
            hit,
            player
        });

        // 5. Oyun bitti mi kontrol et
        if (this.off[player] === 15) {
            this.gameOver = true;
            this.winner = player;
            this.calculateWinType(player, opponent);
        }

        return { success: true, hit, gameOver: this.gameOver };
    }

    // Son hamleyi geri al (Undo)
    undoMove() {
        if (this.turnHistory.length === 0) return false;

        const lastMove = this.turnHistory.pop();
        const player = lastMove.player;
        const opponent = player === 'white' ? 'black' : 'white';

        // 1. Zarı geri ver
        this.remainingDice.push(lastMove.die);

        // 2. Hedefi geri al
        if (lastMove.to === 'off') {
            this.off[player]--;
        } else {
            const dest = this.board[lastMove.to];
            if (lastMove.hit) {
                // Kırılan rakip taşını bara geri çekmiştik, şimdi tahtaya geri koy
                dest.player = opponent;
                dest.count = 1;
                this.bar[opponent]--;
            } else {
                dest.count--;
                if (dest.count === 0) {
                    dest.player = null;
                }
            }
        }

        // 3. Çıkış noktasına taşı geri koy
        if (lastMove.from === 'bar') {
            this.bar[player]++;
        } else {
            const origin = this.board[lastMove.from];
            origin.player = player;
            origin.count++;
        }

        this.gameOver = false;
        this.winner = null;
        this.winType = null;

        return true;
    }

    // Galibiyet türünü hesapla (Normal, Mars, Katmerli Mars)
    calculateWinType(winner, loser) {
        if (this.off[loser] > 0) {
            this.winType = 'normal'; // 1 puan
            return;
        }

        // Rakip hiç taş toplayamamış: Mars kesin!
        // Katmerli Mars kontrolü:
        // Kazananın evinde veya barda rakip taşı kalmış mı?
        let hasCheckerInWinnersHomeOrBar = this.bar[loser] > 0;

        if (winner === 'white') {
            // White'ın evi 1-6
            for (let i = 1; i <= 6; i++) {
                if (this.board[i].player === 'black' && this.board[i].count > 0) {
                    hasCheckerInWinnersHomeOrBar = true;
                    break;
                }
            }
        } else {
            // Black'in evi 19-24
            for (let i = 19; i <= 24; i++) {
                if (this.board[i].player === 'white' && this.board[i].count > 0) {
                    hasCheckerInWinnersHomeOrBar = true;
                    break;
                }
            }
        }

        if (hasCheckerInWinnersHomeOrBar) {
            this.winType = 'katmerli'; // 3 puan (Backgammon)
        } else {
            this.winType = 'mars'; // 2 puan (Gammon)
        }
    }

    // Sırayı diğer oyuncuya geçir
    passTurn() {
        this.turn = this.turn === 'white' ? 'black' : 'white';
        this.hasRolled = false;
        this.rolledDice = [];
        this.remainingDice = [];
        this.turnHistory = [];
    }

    // Pip sayısı (Taşların evden uzaklık toplamı)
    getPipCount(player) {
        let pips = 0;
        if (player === 'white') {
            // White moves towards 0
            pips += this.bar['white'] * 25;
            for (let i = 1; i <= 24; i++) {
                if (this.board[i].player === 'white') {
                    pips += this.board[i].count * i;
                }
            }
        } else {
            // Black moves towards 25
            pips += this.bar['black'] * 25;
            for (let i = 1; i <= 24; i++) {
                if (this.board[i].player === 'black') {
                    pips += this.board[i].count * (25 - i);
                }
            }
        }
        return pips;
    }
}

// Node veya tarayıcı uyumluluğu
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TavlaRules, DICE_NAMES_TR, getDiceNameTR };
} else {
    window.TavlaRules = TavlaRules;
    window.DICE_NAMES_TR = DICE_NAMES_TR;
    window.getDiceNameTR = getDiceNameTR;
}
