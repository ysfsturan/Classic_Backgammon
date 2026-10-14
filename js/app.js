// Tavla Ana Oyun Yöneticisi (App Controller & Game Loop)

class TavlaApp {
    constructor() {
        this.rules = new TavlaRules();
        this.ai = new TavlaAI('medium');
        this.ui = new TavlaUI();
        this.sound = window.soundEngine;

        // Oyun Ayarları
        this.gameMode = 'ai'; // 'ai' | 'pvp'
        this.matchTarget = 5;
        this.matchScore = { white: 0, black: 0 };
        this.isAiThinking = false;

        this.initEvents();
        this.startNewRound();
    }

    // Yeni el başlat (skorları korur)
    startNewRound() {
        this.rules.resetGame();
        this.ui.clearSelection();
        this.isAiThinking = false;
        this.updatePlayerNames();
        this.ui.render(this.rules);
        this.ui.setStatus('Zar atarak oyuna başlayın.');
        this.logMessage('Yeni el başladı. Zarlar bekleniyor.');
    }

    // Sıfırdan yeni maç başlat (skorları sıfırlar)
    startNewMatch() {
        this.matchScore = { white: 0, black: 0 };
        this.updateScoreboard();
        this.startNewRound();
    }

    // Oyuncu isimlerini moda göre ayarla
    updatePlayerNames() {
        const nameWhite = document.getElementById('nameWhite');
        const nameBlack = document.getElementById('nameBlack');

        if (this.gameMode === 'ai') {
            const diffText = {
                'easy': 'Acemi',
                'medium': 'Orta',
                'hard': 'Usta'
            }[this.ai.difficulty] || 'Orta';

            nameWhite.textContent = 'Beyaz (Siz)';
            nameBlack.textContent = `Siyah (AI - ${diffText})`;
        } else {
            nameWhite.textContent = 'Beyaz (1. Oyuncu)';
            nameBlack.textContent = 'Siyah (2. Oyuncu)';
        }
    }

    // Skor göstergesini güncelle
    updateScoreboard() {
        document.getElementById('scoreWhite').textContent = this.matchScore.white;
        document.getElementById('scoreBlack').textContent = this.matchScore.black;
        document.getElementById('targetScoreDisplay').textContent = `Hedef: ${this.matchTarget} Puan`;
    }

    // Kullanıcı etkileşimlerini dinle
    initEvents() {
        // 1. Zar At Düğmesi
        const btnRoll = document.getElementById('btnRollDice');
        btnRoll.addEventListener('click', () => {
            if (this.isHumanTurn() && !this.rules.hasRolled && !this.rules.gameOver) {
                this.handleRoll();
            }
        });

        // 2. Geri Al Düğmesi
        const btnUndo = document.getElementById('btnUndo');
        btnUndo.addEventListener('click', () => {
            if (this.isHumanTurn() && this.rules.hasRolled && !this.rules.gameOver) {
                if (this.rules.undoMove()) {
                    this.sound.playClick();
                    this.ui.clearSelection();
                    this.ui.render(this.rules);
                    this.ui.setStatus('Son hamle geri alındı.');
                    this.logMessage(`${this.getTurnName()} hamleyi geri aldı.`);
                }
            }
        });

        // 3. Tahtadaki Noktalara Tıklama
        for (let pt = 1; pt <= 24; pt++) {
            const col = document.querySelector(`.point-column[data-point="${pt}"]`);
            if (col) {
                col.addEventListener('click', () => this.handlePointClick(pt));
            }
        }

        // 4. Bar Bölmelerine Tıklama (Kırık taşı seçme)
        const barWhite = document.getElementById('barWhite');
        const barBlack = document.getElementById('barBlack');

        barWhite.addEventListener('click', () => {
            if (this.isHumanTurn() && this.rules.turn === 'white' && this.rules.bar.white > 0) {
                this.handleOriginSelect('bar');
            }
        });

        barBlack.addEventListener('click', () => {
            if (this.isHumanTurn() && this.rules.turn === 'black' && this.rules.bar.black > 0) {
                this.handleOriginSelect('bar');
            }
        });

        // 5. Taş Toplama Bölmelerine Tıklama (Bear-Off)
        const trayWhite = document.getElementById('trayWhite');
        const trayBlack = document.getElementById('trayBlack');

        trayWhite.addEventListener('click', () => {
            if (this.isHumanTurn() && this.rules.turn === 'white' && this.ui.selectedOrigin !== null) {
                this.tryExecuteMove(this.ui.selectedOrigin, 'off');
            }
        });

        trayBlack.addEventListener('click', () => {
            if (this.isHumanTurn() && this.rules.turn === 'black' && this.ui.selectedOrigin !== null) {
                this.tryExecuteMove(this.ui.selectedOrigin, 'off');
            }
        });

        // 6. Modal Kontrolleri
        this.initModalControls();
    }

    // Modal pencereleri kontrolü
    initModalControls() {
        // Yeni Oyun Aç / Kapat
        const btnNewGame = document.getElementById('btnNewGame');
        const modalNewGame = document.getElementById('modalNewGame');
        btnNewGame.addEventListener('click', () => {
            modalNewGame.classList.add('active');
        });

        // Kurallar Aç / Kapat
        const btnRules = document.getElementById('btnRules');
        const modalRules = document.getElementById('modalRules');
        btnRules.addEventListener('click', () => {
            modalRules.classList.add('active');
        });

        // Hamle Günlüğü Aç / Kapat
        const btnToggleHistory = document.getElementById('btnToggleHistory');
        const historyDrawer = document.getElementById('historyDrawer');
        const btnCloseHistory = document.getElementById('btnCloseHistory');

        btnToggleHistory.addEventListener('click', () => {
            historyDrawer.classList.toggle('open');
        });
        btnCloseHistory.addEventListener('click', () => {
            historyDrawer.classList.remove('open');
        });

        // Ses Aç / Kapat
        const btnSound = document.getElementById('btnSound');
        const soundIcon = document.getElementById('soundIcon');
        btnSound.addEventListener('click', () => {
            const enabled = this.sound.toggle();
            soundIcon.textContent = enabled ? '🔊' : '🔇';
        });

        // Kapatma düğmeleri (data-close-modal)
        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal-overlay');
                if (modal) modal.classList.remove('active');
            });
        });

        // Yeni Oyun Modu Seçimi (Radio cards)
        document.querySelectorAll('.radio-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.radio-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');

                const mode = card.getAttribute('data-mode');
                const aiGroup = document.getElementById('aiDifficultyGroup');
                if (mode === 'pvp') {
                    aiGroup.style.display = 'none';
                } else {
                    aiGroup.style.display = 'block';
                }
            });
        });

        // Yeni Oyuna Başla
        const btnStartGame = document.getElementById('btnStartGame');
        btnStartGame.addEventListener('click', () => {
            const selectedCard = document.querySelector('.radio-card.selected');
            this.gameMode = selectedCard.getAttribute('data-mode');
            const diff = document.getElementById('selectDifficulty').value;
            this.ai.setDifficulty(diff);
            this.matchTarget = parseInt(document.getElementById('selectTargetScore').value, 10);

            modalNewGame.classList.remove('active');
            this.startNewMatch();
        });

        // Zafer Modalı Düğmeleri
        const modalWin = document.getElementById('modalWin');
        document.getElementById('btnNextRound').addEventListener('click', () => {
            modalWin.classList.remove('active');
            this.startNewRound();
        });
        document.getElementById('btnMatchNewGame').addEventListener('click', () => {
            modalWin.classList.remove('active');
            this.startNewMatch();
        });
    }

    // İnsan sırası mı kontrol et
    isHumanTurn() {
        if (this.isAiThinking) return false;
        if (this.gameMode === 'pvp') return true;
        return this.rules.turn === 'white';
    }

    // Zar atma işlemi
    handleRoll() {
        this.sound.playDiceRoll();
        const rollResult = this.rules.rollDice();
        if (!rollResult) return;

        this.logMessage(`${this.getTurnName()} zar attı: ${rollResult.dice[0]} - ${rollResult.dice[1]} (${rollResult.nameTR})`);
        
        this.ui.animateDiceRoll(rollResult.dice, rollResult.isDouble, rollResult.nameTR, () => {
            this.ui.render(this.rules);
            this.checkTurnContinuation();
        });
    }

    // Noktaya tıklama (Taş seçimi ya da hedefe hamle)
    handlePointClick(pointNumber) {
        if (!this.isHumanTurn() || !this.rules.hasRolled || this.rules.gameOver) return;

        // 1. Zaten seçili olan taşa tekrar tıklanırsa seçimi kaldır
        if (this.ui.selectedOrigin === pointNumber) {
            this.ui.clearSelection();
            this.sound.playClick();
            this.ui.setStatus('Seçim iptal edildi.');
            return;
        }

        const cell = this.rules.board[pointNumber];
        const isOwnChecker = cell.player === this.rules.turn && cell.count > 0;

        // 2. Eğer bir taş seçiliyse ve bu nokta geçerli bir hedefse hamleyi yap
        if (this.ui.selectedOrigin !== null) {
            const validDests = this.rules.getValidDestinations(this.ui.selectedOrigin);
            const isDestination = validDests.some(d => d.to === pointNumber);

            if (isDestination) {
                this.tryExecuteMove(this.ui.selectedOrigin, pointNumber);
                return;
            }
        }

        // 3. Taş seçimi (Barda taş yoksa tahtadan taş seçilir)
        if (this.rules.bar[this.rules.turn] > 0) {
            this.ui.setStatus('Barda kırık taşınız var! Önce onu oyuna sokmalısınız.');
            return;
        }

        if (isOwnChecker) {
            this.handleOriginSelect(pointNumber);
        } else {
            this.ui.clearSelection();
        }
    }

    // Çıkış noktasını seç
    handleOriginSelect(origin) {
        const dests = this.rules.getValidDestinations(origin);
        if (dests.length === 0) {
            this.ui.setStatus('Bu taş için oynanabilecek geçerli bir yer yok.');
            this.sound.playClick();
            return;
        }

        this.sound.playClick();
        this.ui.selectedOrigin = origin;
        this.ui.render(this.rules);
        this.ui.setStatus('Gidilecek hedefi seçin.');
    }

    // Hamleyi gerçekleştir
    tryExecuteMove(from, to) {
        const dests = this.rules.getValidDestinations(from);
        if (dests.length === 0) return;

        let match = null;
        if (to === 'off') {
            const player = this.rules.turn;
            const exactDie = player === 'white' ? from : (25 - from);
            // Önce tam eşleşen zarı ara
            match = dests.find(d => d.to === 'off' && d.die === exactDie);
            if (!match) {
                // Tam değilse en küçük geçerli zarı tercih et
                const bearOffDests = dests.filter(d => d.to === 'off').sort((a, b) => a.die - b.die);
                if (bearOffDests.length > 0) {
                    match = bearOffDests[0];
                }
            }
        } else {
            match = dests.find(d => d.to === to);
        }

        if (!match) return;

        const die = match.die;
        const res = this.rules.makeMove(from, to, die);

        if (res && res.success) {
            // Ses efekti
            if (res.gameOver) {
                this.sound.playWin();
            } else if (to === 'off') {
                this.sound.playBearOff();
            } else if (res.hit) {
                this.sound.playHit();
            } else {
                this.sound.playCheckerMove();
            }

            // Hamle günlüğü mesajı
            const fromText = from === 'bar' ? 'Bar' : `${from}. nokta`;
            const toText = to === 'off' ? 'Toplandı' : `${to}. nokta`;
            const hitText = res.hit ? ' (Taş Kırıldı!)' : '';
            this.logMessage(`${this.getTurnName()} [${die} ile]: ${fromText} ➔ ${toText}${hitText}`);

            this.ui.clearSelection();
            this.ui.render(this.rules);

            // Oyun bitti mi kontrolü
            if (this.rules.gameOver) {
                this.handleGameOver();
                return;
            }

            // Tur devam ediyor mu?
            this.checkTurnContinuation();
        }
    }

    // Hamle sonrası durum kontrolü (Sıra bitti mi, geçerli hamle kaldı mı?)
    checkTurnContinuation() {
        const validMoves = this.rules.getValidMovesForPlayer(this.rules.turn);

        // Kalan zarlarla yapılabilecek hamle kalmadıysa tur biter
        if (this.rules.remainingDice.length === 0 || validMoves.length === 0) {
            if (this.rules.remainingDice.length > 0 && validMoves.length === 0) {
                this.ui.setStatus('Oynanabilecek geçerli hamle kalmadı.');
                this.logMessage(`${this.getTurnName()} için geçerli hamle kalmadı.`);
            }

            setTimeout(() => {
                this.passTurn();
            }, 800);
        } else {
            this.ui.setStatus(`${this.getTurnName()} hamle bekleniyor. (${this.rules.remainingDice.join(', ')})`);
        }
    }

    // Sırayı diğer oyuncuya geçir
    passTurn() {
        this.rules.passTurn();
        this.ui.clearSelection();
        this.ui.render(this.rules);

        this.ui.setStatus(`Sıra ${this.getTurnName()} oyuncusunda.`);

        // Eğer sıra bilgisayardaysa AI turunu başlat
        if (this.gameMode === 'ai' && this.rules.turn === 'black') {
            this.executeAiTurn();
        }
    }

    // Bilgisayar (AI) Turu
    async executeAiTurn() {
        this.isAiThinking = true;
        this.ui.setStatus('Bilgisayar zar atıyor...');

        await this.sleep(700);

        // 1. Zar At
        this.sound.playDiceRoll();
        const rollResult = this.rules.rollDice();

        this.logMessage(`Bilgisayar zar attı: ${rollResult.dice[0]} - ${rollResult.dice[1]} (${rollResult.nameTR})`);
        
        this.ui.animateDiceRoll(rollResult.dice, rollResult.isDouble, rollResult.nameTR, async () => {
            this.ui.render(this.rules);

            await this.sleep(600);

            // 2. Hamle Dizisini Bul
            const bestMoves = this.ai.findBestTurn(this.rules, 'black');

            if (!bestMoves || bestMoves.length === 0) {
                this.ui.setStatus('Bilgisayarın oynayabileceği hamle yok!');
                this.logMessage('Bilgisayarın geçerli hamlesi yok, sıra geçti.');
                await this.sleep(1000);
                this.isAiThinking = false;
                this.passTurn();
                return;
            }

            // 3. Hamleleri sırayla, doğal animasyon hızıyla oyna
            for (const move of bestMoves) {
                this.ui.setStatus(`Bilgisayar hamle yapıyor: ${move.from === 'bar' ? 'Bar' : move.from} ➔ ${move.to === 'off' ? 'Toplama' : move.to}`);
                
                await this.sleep(600);

                const res = this.rules.makeMove(move.from, move.to, move.die);
                if (res && res.success) {
                    if (res.gameOver) {
                        this.sound.playWin();
                    } else if (move.to === 'off') {
                        this.sound.playBearOff();
                    } else if (res.hit) {
                        this.sound.playHit();
                    } else {
                        this.sound.playCheckerMove();
                    }

                    const fromText = move.from === 'bar' ? 'Bar' : `${move.from}. nokta`;
                    const toText = move.to === 'off' ? 'Toplandı' : `${move.to}. nokta`;
                    const hitText = res.hit ? ' (Taş Kırıldı!)' : '';
                    this.logMessage(`Bilgisayar [${move.die} ile]: ${fromText} ➔ ${toText}${hitText}`);

                    this.ui.render(this.rules);

                    if (this.rules.gameOver) {
                        this.isAiThinking = false;
                        this.handleGameOver();
                        return;
                    }
                }
            }

            await this.sleep(500);
            this.isAiThinking = false;
            this.passTurn();
        });
    }

    // Oyun bittiğinde
    handleGameOver() {
        const winner = this.rules.winner;
        const winType = this.rules.winType; // 'normal', 'mars', 'katmerli'

        let points = 1;
        let typeText = 'Normal Galibiyet (+1 Puan)';

        if (winType === 'katmerli') {
            points = 3;
            typeText = 'Katmerli Mars! 🏆 (+3 Puan)';
        } else if (winType === 'mars') {
            points = 2;
            typeText = 'Mars! 🌟 (+2 Puan)';
        }

        this.matchScore[winner] += points;
        this.updateScoreboard();

        const isWhite = winner === 'white';
        const winnerName = isWhite ? 'Beyaz' : 'Siyah';
        const isHumanWinner = this.gameMode === 'ai' ? isWhite : true;

        this.logMessage(`🎉 ${winnerName} oyunu kazandı! (${typeText})`);

        // Zafer Modalı Bilgileri
        const winTitle = document.getElementById('winTitle');
        const winSubtitle = document.getElementById('winSubtitle');
        const winScoreSummary = document.getElementById('winScoreSummary');

        if (this.gameMode === 'ai') {
            winTitle.textContent = isHumanWinner ? 'Tebrikler, Kazandınız! 🎉' : 'Bilgisayar Kazandı! 🤖';
        } else {
            winTitle.textContent = `${winnerName} Oyuncu Kazandı! 🎉`;
        }

        winSubtitle.textContent = typeText;
        winScoreSummary.textContent = `${this.matchScore.white} - ${this.matchScore.black}`;

        // Maç bitti mi?
        const isMatchOver = this.matchScore.white >= this.matchTarget || this.matchScore.black >= this.matchTarget;
        const btnNextRound = document.getElementById('btnNextRound');

        if (isMatchOver) {
            winSubtitle.textContent = `${typeText} - MAÇI KAZANDI! 🏆`;
            btnNextRound.style.display = 'none';
        } else {
            btnNextRound.style.display = 'inline-block';
        }

        const modalWin = document.getElementById('modalWin');
        setTimeout(() => {
            modalWin.classList.add('active');
        }, 600);
    }

    // Sıradaki oyuncunun görünen adı
    getTurnName() {
        if (this.rules.turn === 'white') {
            return this.gameMode === 'ai' ? 'Siz (Beyaz)' : 'Beyaz';
        } else {
            return this.gameMode === 'ai' ? 'Bilgisayar (Siyah)' : 'Siyah';
        }
    }

    // Hamle günlüğüne yaz
    logMessage(text) {
        const list = document.getElementById('historyList');
        const item = document.createElement('div');
        item.className = `history-item ${this.rules.turn}`;
        item.textContent = text;
        list.appendChild(item);
        list.scrollTop = list.scrollHeight;
    }

    // Asenkron bekleme yardımcısı
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Sayfa yüklendiğinde başlat
window.addEventListener('DOMContentLoaded', () => {
    window.app = new TavlaApp();
});
