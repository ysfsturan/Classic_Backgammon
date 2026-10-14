// Tavla Kullanıcı Arayüzü (UI Rendering, Animatör ve Etkileşim Yönetimi)

class TavlaUI {
    constructor() {
        this.selectedOrigin = null; // 'bar' veya 1..24
        this.onMoveCallback = null;
        this.onRollCallback = null;
        this.initTriangles();
    }

    // Tahtadaki üçgenleri (points) SVG olarak oluştur
    initTriangles() {
        // Üst noktalar (13-24): Üçgen aşağı bakar
        // Alt noktalar (1-12): Üçgen yukarı bakar
        for (let pt = 1; pt <= 24; pt++) {
            const col = document.querySelector(`.point-column[data-point="${pt}"]`);
            if (!col) continue;

            const isTop = pt >= 13 && pt <= 24;
            // Alternatif renkler
            const isDark = (pt % 2 === 1);

            col.innerHTML = `
                <svg class="point-triangle ${isDark ? 'dark' : 'light'}" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <polygon points="${isTop ? '0,0 100,0 50,100' : '0,100 100,100 50,0'}" />
                </svg>
                <span class="point-number">${pt}</span>
                <div class="point-checkers"></div>
            `;
        }
    }

    // Tahtayı kurallara ve mevcut duruma göre çiz
    render(rules) {
        // 1. Noktalardaki taşları çiz
        for (let pt = 1; pt <= 24; pt++) {
            const col = document.querySelector(`.point-column[data-point="${pt}"]`);
            if (!col) continue;

            const checkersContainer = col.querySelector('.point-checkers');
            checkersContainer.innerHTML = '';
            col.classList.remove('valid-destination');

            const cell = rules.board[pt];
            if (cell.count > 0 && cell.player) {
                this.renderCheckersStack(checkersContainer, cell.player, cell.count, pt, rules);
            }
        }

        // 2. Bar (Kırık taşlar) çiz
        this.renderBar(rules);

        // 3. Toplanan taşları (Bear-off) çiz
        this.renderBearOff(rules);

        // 4. Skor ve Pip sayılarını güncelle
        this.updateStats(rules);

        // 5. Zarları güncelle
        this.renderDice(rules);

        // 6. Eğer bir taş seçiliyse, geçerli hedef vurgularını yenile
        if (this.selectedOrigin !== null) {
            this.highlightDestinations(rules, this.selectedOrigin);
        }
    }

    // Bir noktadaki taş yığınını çiz (5'ten fazlaysa kompakt ve sayaçlı)
    renderCheckersStack(container, player, count, pointNumber, rules) {
        const isCurrentTurn = rules.turn === player && rules.hasRolled && rules.bar[player] === 0;
        const canSelectPoint = isCurrentTurn && rules.getValidDestinations(pointNumber).length > 0;

        const maxVisible = Math.min(count, 5);

        for (let i = 0; i < maxVisible; i++) {
            const checkerEl = document.createElement('div');
            checkerEl.className = `checker checker-${player}`;

            if (i > 0) {
                checkerEl.classList.add('checker-stacked');
            }

            // En üstteki taş
            if (i === maxVisible - 1) {
                if (canSelectPoint) {
                    checkerEl.classList.add('selectable');
                }
                if (this.selectedOrigin === pointNumber) {
                    checkerEl.classList.add('selected');
                }

                // 5'ten fazla taş varsa sayaç rozeti ekle
                if (count > 5) {
                    const badge = document.createElement('div');
                    badge.className = 'checker-count-badge';
                    badge.textContent = count;
                    checkerEl.appendChild(badge);
                }
            }

            container.appendChild(checkerEl);
        }
    }

    // Bar bölgesini çiz
    renderBar(rules) {
        const barWhite = document.getElementById('barWhite');
        const barBlack = document.getElementById('barBlack');

        barWhite.innerHTML = '<span class="bar-label">BAR</span>';
        barBlack.innerHTML = '<span class="bar-label">BAR</span>';
        barWhite.classList.remove('selectable', 'selected');
        barBlack.classList.remove('selectable', 'selected');

        // Beyaz kırık taşlar
        if (rules.bar.white > 0) {
            const count = rules.bar.white;
            const canSelect = rules.turn === 'white' && rules.hasRolled && rules.getValidDestinations('bar').length > 0;

            const checkerEl = document.createElement('div');
            checkerEl.className = 'checker checker-white';
            if (canSelect) {
                barWhite.classList.add('selectable');
                checkerEl.classList.add('selectable');
            }
            if (this.selectedOrigin === 'bar' && rules.turn === 'white') {
                checkerEl.classList.add('selected');
            }
            if (count > 1) {
                const badge = document.createElement('div');
                badge.className = 'checker-count-badge';
                badge.textContent = count;
                checkerEl.appendChild(badge);
            }
            barWhite.appendChild(checkerEl);
        }

        // Siyah kırık taşlar
        if (rules.bar.black > 0) {
            const count = rules.bar.black;
            const canSelect = rules.turn === 'black' && rules.hasRolled && rules.getValidDestinations('bar').length > 0;

            const checkerEl = document.createElement('div');
            checkerEl.className = 'checker checker-black';
            if (canSelect) {
                barBlack.classList.add('selectable');
                checkerEl.classList.add('selectable');
            }
            if (this.selectedOrigin === 'bar' && rules.turn === 'black') {
                checkerEl.classList.add('selected');
            }
            if (count > 1) {
                const badge = document.createElement('div');
                badge.className = 'checker-count-badge';
                badge.textContent = count;
                checkerEl.appendChild(badge);
            }
            barBlack.appendChild(checkerEl);
        }
    }

    // Toplanan taşları çiz
    renderBearOff(rules) {
        const trayWhite = document.getElementById('trayWhite');
        const trayBlack = document.getElementById('trayBlack');

        trayWhite.innerHTML = '<span class="tray-label">BEYAZ</span>';
        trayBlack.innerHTML = '<span class="tray-label">SİYAH</span>';
        trayWhite.classList.remove('valid-bear-off');
        trayBlack.classList.remove('valid-bear-off');

        for (let i = 0; i < rules.off.white; i++) {
            const bar = document.createElement('div');
            bar.className = 'borne-checker white';
            trayWhite.appendChild(bar);
        }

        for (let i = 0; i < rules.off.black; i++) {
            const bar = document.createElement('div');
            bar.className = 'borne-checker black';
            trayBlack.appendChild(bar);
        }

        document.getElementById('offWhiteCount').textContent = rules.off.white;
        document.getElementById('offBlackCount').textContent = rules.off.black;
    }

    // Zarları çiz
    renderDice(rules) {
        const trayRight = document.getElementById('diceTrayRight');
        const trayLeft = document.getElementById('diceTrayLeft');

        // Beyaz sağda, Siyah solda veya sıraya göre
        const activeTray = rules.turn === 'white' ? trayRight : trayLeft;
        const inactiveTray = rules.turn === 'white' ? trayLeft : trayRight;

        inactiveTray.style.display = 'none';
        inactiveTray.innerHTML = '';

        if (!rules.hasRolled || rules.rolledDice.length === 0) {
            activeTray.style.display = 'none';
            activeTray.innerHTML = '';
            return;
        }

        activeTray.style.display = 'flex';
        activeTray.innerHTML = '';

        // Çift zar durumunda 4 adet, normalde 2 adet zar göster
        const isDouble = rules.rolledDice[0] === rules.rolledDice[1];
        const totalDice = isDouble ? 4 : 2;
        const dieVal = rules.rolledDice[0];

        // Kalan zarların frekansı
        const remainingCounts = {};
        for (const d of rules.remainingDice) {
            remainingCounts[d] = (remainingCounts[d] || 0) + 1;
        }

        if (isDouble) {
            const remCount = remainingCounts[dieVal] || 0;
            for (let i = 0; i < 4; i++) {
                const isUsed = i >= remCount;
                const dieEl = this.createDieElement(dieVal, isUsed);
                activeTray.appendChild(dieEl);
            }
        } else {
            const d1 = rules.rolledDice[0];
            const d2 = rules.rolledDice[1];

            // 1. zar kullanıldı mı?
            let d1Used = true;
            if (remainingCounts[d1] > 0) {
                d1Used = false;
                remainingCounts[d1]--;
            }

            // 2. zar kullanıldı mı?
            let d2Used = true;
            if (remainingCounts[d2] > 0) {
                d2Used = false;
                remainingCounts[d2]--;
            }

            activeTray.appendChild(this.createDieElement(d1, d1Used));
            activeTray.appendChild(this.createDieElement(d2, d2Used));
        }
    }

    // Tek bir zar DOM öğesi üret
    createDieElement(value, isUsed = false) {
        const die = document.createElement('div');
        die.className = `die ${isUsed ? 'used' : ''}`;
        die.setAttribute('data-val', value);

        // 7 nokta yuvası
        for (let i = 1; i <= 7; i++) {
            const pip = document.createElement('div');
            pip.className = `pip pip-${i}`;
            die.appendChild(pip);
        }

        return die;
    }

    // Zar atma animasyonunu oynat
    animateDiceRoll(diceValues, isDouble, nameTR, onComplete) {
        const trayRight = document.getElementById('diceTrayRight');
        const trayLeft = document.getElementById('diceTrayLeft');
        const activeTray = trayRight; // default

        activeTray.style.display = 'flex';
        activeTray.innerHTML = '';

        const d1 = diceValues[0];
        const d2 = diceValues[1];

        const die1 = this.createDieElement(d1, false);
        const die2 = this.createDieElement(d2, false);

        die1.classList.add('rolling');
        die2.classList.add('rolling');

        activeTray.appendChild(die1);
        activeTray.appendChild(die2);

        if (isDouble) {
            const die3 = this.createDieElement(d1, false);
            const die4 = this.createDieElement(d1, false);
            die3.classList.add('rolling');
            die4.classList.add('rolling');
            activeTray.appendChild(die3);
            activeTray.appendChild(die4);
        }

        // Geleneksel zar adını göster
        this.showDiceCallout(nameTR);

        setTimeout(() => {
            die1.classList.remove('rolling');
            die2.classList.remove('rolling');
            if (onComplete) onComplete();
        }, 600);
    }

    // Geleneksel Türk Tavlası zar adı afişi
    showDiceCallout(text) {
        const banner = document.getElementById('diceCallout');
        banner.textContent = text;
        banner.style.display = 'block';

        setTimeout(() => {
            banner.style.display = 'none';
        }, 3500);
    }

    // Skor ve pip sayılarını güncelle
    updateStats(rules) {
        document.getElementById('pipWhite').textContent = rules.getPipCount('white');
        document.getElementById('pipBlack').textContent = rules.getPipCount('black');

        const cardWhite = document.getElementById('playerCardWhite');
        const cardBlack = document.getElementById('playerCardBlack');

        if (rules.turn === 'white') {
            cardWhite.classList.add('active');
            cardBlack.classList.remove('active');
        } else {
            cardBlack.classList.add('active');
            cardWhite.classList.remove('active');
        }

        // Geri al düğmesi durumu
        const btnUndo = document.getElementById('btnUndo');
        btnUndo.disabled = rules.turnHistory.length === 0;

        // Zar at düğmesi durumu
        const btnRoll = document.getElementById('btnRollDice');
        btnRoll.disabled = rules.hasRolled || rules.gameOver;
    }

    // Bir taş seçildiğinde gidebileceği geçerli hedefleri vurgula
    highlightDestinations(rules, origin) {
        // Eski vurguları temizle
        document.querySelectorAll('.point-column.valid-destination').forEach(el => {
            el.classList.remove('valid-destination');
        });
        document.querySelectorAll('.tray-section.valid-bear-off').forEach(el => {
            el.classList.remove('valid-bear-off');
        });

        if (origin === null) return;

        const dests = rules.getValidDestinations(origin);

        for (const dest of dests) {
            if (dest.to === 'off') {
                const trayId = rules.turn === 'white' ? 'trayWhite' : 'trayBlack';
                document.getElementById(trayId).classList.add('valid-bear-off');
            } else {
                const col = document.querySelector(`.point-column[data-point="${dest.to}"]`);
                if (col) {
                    col.classList.add('valid-destination');
                }
            }
        }
    }

    // Durum mesajı yaz
    setStatus(msg) {
        document.getElementById('statusMessage').textContent = msg;
    }

    // Seçimi temizle
    clearSelection() {
        this.selectedOrigin = null;
        document.querySelectorAll('.point-column.valid-destination').forEach(el => {
            el.classList.remove('valid-destination');
        });
        document.querySelectorAll('.tray-section.valid-bear-off').forEach(el => {
            el.classList.remove('valid-bear-off');
        });
        document.querySelectorAll('.checker.selected').forEach(el => {
            el.classList.remove('selected');
        });
        document.querySelectorAll('.bar-checkers-zone.selected').forEach(el => {
            el.classList.remove('selected');
        });
    }
}

window.TavlaUI = TavlaUI;
