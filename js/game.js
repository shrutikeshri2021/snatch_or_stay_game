// ============================================
// ZK SNITCH OR STAY — GAME LOGIC
// ============================================

'use strict';

// ---- DEBUG ORIGIN ----
console.log('🌐 ORIGIN DEBUG:');
console.log('   hostname:', window.location.hostname);
console.log('   origin:', window.location.origin);
console.log('   href:', window.location.href);
console.log('   protocol:', window.location.protocol);

// Global error handler for debugging
window.addEventListener('error', (e) => {
  console.error('❌ ERROR:', e.message, e.stack);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('❌ UNHANDLED REJECTION:', e.reason);
});

// ---- GAME STATE ----
const gameState = {
  player: {
    choice: null,
    persona: { name: 'UNKNOWN', emoji: '👤', loyalty: 50 },
    score: 0,
    wins: 0,
    losses: 0,
    betrayals: 0,
    tauntSent: false
  },
  opponent: {
    choice: null,
    name: 'SCANNING...',
    score: 0,
    threatLevel: Math.floor(Math.random() * 5) + 1
  },
  round: 1,
  timer: 30,
  timerInterval: null,
  phase: 'loading'
};

// ---- SAFE getElementById ----
function el(id) {
  const element = document.getElementById(id);
  if (!element) console.warn('⚠️ Element not found: #' + id);
  return element;
}

// ---- TOAST NOTIFICATION ----
function showToast(message, color) {
  color = color || '#e60000';
  // Remove existing toasts
  document.querySelectorAll('.game-toast')
    .forEach(t => t.remove());
  
  const toast = document.createElement('div');
  toast.className = 'game-toast';
  toast.style.cssText = [
    'position:fixed',
    'top:80px',
    'left:50%',
    'transform:translateX(-50%)',
    'background:#0d0d0d',
    'border:1px solid ' + color,
    'color:' + color,
    'padding:12px 28px',
    'font-family:Bebas Neue,cursive',
    'font-size:18px',
    'letter-spacing:3px',
    'z-index:99999',
    'box-shadow:0 0 20px ' + color,
    'white-space:nowrap',
    'pointer-events:none'
  ].join(';');
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, 2500);
}

// ---- SOUND (Web Audio API) ----
function playSound(type) {
  try {
    const ctx = new (window.AudioContext || 
      window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const sounds = {
      lock:   [200, 'sawtooth', 0.3, 0.3],
      reveal: [300, 'sine',     0.4, 0.5],
      betray: [400, 'square',   0.4, 0.8],
      win:    [300, 'sine',     0.3, 0.4],
      tick:   [800, 'square',   0.1, 0.1],
      found:  [200, 'sine',     0.3, 0.4]
    };

    const s = sounds[type] || sounds.lock;
    osc.frequency.value = s[0];
    osc.type = s[1];
    gain.gain.setValueAtTime(s[2], ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001, ctx.currentTime + s[3]);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + s[3] + 0.1);
  } catch(e) {
    // Sound failed silently
  }
}

// ---- BOTTOM BAR UPDATE ----
function updateBottomBar(text) {
  const e = el('proofStatus');
  if (e) e.textContent = text;
}

// ---- SCORE DISPLAY UPDATE ----
function updateScoreDisplays() {
  const map = {
    playerScore:    gameState.player.score,
    opponentScore:  gameState.opponent.score,
    statWins:       gameState.player.wins,
    playerWins:     gameState.player.wins,
    statLosses:     gameState.player.losses,
    playerLosses:   gameState.player.losses,
    statBetrayals:  gameState.player.betrayals,
    playerBetrayals:gameState.player.betrayals
  };
  Object.entries(map).forEach(([id, val]) => {
    const e = el(id);
    if (e) e.textContent = val;
  });
}

// ---- ORIGIN-SAFE STORAGE ----
const OriginSafeStorage = {
  getItem(key) {
    try {
      const value = localStorage.getItem(key);
      console.log(`📦 Retrieved from storage: ${key} =`, value);
      return value;
    } catch (e) {
      console.warn(`⚠️ Storage read error for ${key}:`, e.message);
      return null;
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
      console.log(`💾 Saved to storage: ${key} =`, value);
    } catch (e) {
      console.warn(`⚠️ Storage write error for ${key}:`, e.message);
    }
  }
};

// ---- SAVE TO LOCALSTORAGE ----
function saveProgress() {
  try {
    OriginSafeStorage.setItem('gameData', JSON.stringify({
      wins:      gameState.player.wins,
      losses:    gameState.player.losses,
      betrayals: gameState.player.betrayals,
      score:     gameState.player.score,
      totalGames: gameState.round
    }));
  } catch(e) { 
    console.warn('⚠️ Could not save progress:', e.message);
  }
}

// ============================================
// PHASE: LOADING
// ============================================
function showLoadingOverlay() {
  console.log('Phase: LOADING');
  gameState.phase = 'loading';

  const overlay = document.createElement('div');
  overlay.id = 'loadingOverlay';
  overlay.style.cssText = [
    'position:fixed', 'inset:0',
    'background:#0a0a0a',
    'z-index:99998',
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'justify-content:center',
    'font-family:Courier Prime,monospace',
    'transition:opacity 0.5s'
  ].join(';');

  overlay.innerHTML = `
    <div style="color:#e60000;font-size:13px;
      letter-spacing:5px;margin-bottom:30px;">
      ACCESSING SECURE TERMINAL...
    </div>
    <div style="width:280px;height:2px;
      background:#1a0000;border-radius:2px;">
      <div id="loadBar" style="width:0%;height:100%;
        background:#e60000;border-radius:2px;
        box-shadow:0 0 8px #e60000;
        transition:width 0.03s linear;">
      </div>
    </div>
    <div id="loadPct" style="color:#333;font-size:11px;
      margin-top:12px;letter-spacing:2px;">0%</div>
  `;
  document.body.appendChild(overlay);

  let pct = 0;
  const iv = setInterval(() => {
    pct += Math.random() * 6 + 2;
    if (pct >= 100) {
      pct = 100;
      clearInterval(iv);
      const bar = document.getElementById('loadBar');
      const pctEl = document.getElementById('loadPct');
      if (bar) bar.style.width = '100%';
      if (pctEl) pctEl.textContent = '100%';
      setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => {
          overlay.remove();
          startMatching();
        }, 500);
      }, 300);
    }
    const bar = document.getElementById('loadBar');
    const pctEl = document.getElementById('loadPct');
    if (bar) bar.style.width = pct + '%';
    if (pctEl) pctEl.textContent = Math.floor(pct) + '%';
  }, 40);
}

// ============================================
// PHASE: MATCHING
// ============================================
function startMatching() {
  console.log('Phase: MATCHING');
  gameState.phase = 'matching';

  const names = [
    'Ghost_99','RatKing','SilentBlade','NeonViper',
    'CryptoKid','IronFist','DarkHorse',
    'The_Informant','ZeroTrust','Phantom_X'
  ];
  const name = names[Math.floor(Math.random() * names.length)];
  gameState.opponent.name = name;

  // Show scanning in opponent area
  ['opponentName','topOpponentName'].forEach(id => {
    const e = el(id);
    if (e) e.textContent = 'SCANNING...';
  });

  setTimeout(() => {
    // Reveal opponent name
    ['opponentName','topOpponentName'].forEach(id => {
      const e = el(id);
      if (e) {
        e.textContent = name;
        e.style.color = '#ffffff';
      }
    });

    // Update opponent figure
    const oppFig = el('figureOpponentEmoji');
    if (oppFig) oppFig.textContent = '👤';

    playSound('found');
    showToast('OPPONENT FOUND: ' + name, '#e60000');

    setTimeout(() => startChoosing(), 800);
  }, 2000);
}

// ============================================
// PHASE: CHOOSING
// ============================================
function startChoosing() {
  console.log('Phase: CHOOSING');
  gameState.phase = 'choosing';
  gameState.player.choice = null;
  gameState.player.tauntSent = false;
  gameState.timer = 30;

  // Re-enable and reset buttons
  resetButtons();
  startTimer();

  updateBottomBar('● SESSION MONITORED — zkVerify PROOF PENDING');
}

// ============================================
// TIMER
// ============================================
function startTimer() {
  if (gameState.timerInterval) {
    clearInterval(gameState.timerInterval);
    gameState.timerInterval = null;
  }

  updateTimerDisplay(30);

  gameState.timerInterval = setInterval(() => {
    if (gameState.phase !== 'choosing') {
      clearInterval(gameState.timerInterval);
      return;
    }

    gameState.timer--;
    updateTimerDisplay(gameState.timer);
    console.log('Timer:', gameState.timer);

    if (gameState.timer <= 0) {
      clearInterval(gameState.timerInterval);
      showToast('TOO SLOW — DEFAULTED TO LOYAL 😤','#ff6600');
      makeChoice('STAY');
    }
  }, 1000);
}

function updateTimerDisplay(t) {
  const numEl = el('timerNumber');
  if (numEl) numEl.textContent = t;

  const arc = el('timerArc');
  if (arc) {
    // Calculate circumference from actual radius
    const r = parseFloat(arc.getAttribute('r') || 85);
    const circ = 2 * Math.PI * r;
    arc.style.strokeDasharray = circ;
    arc.style.strokeDashoffset = circ * (1 - t / 30);

    if (t <= 5)       arc.style.stroke = '#ff0000';
    else if (t <= 10) arc.style.stroke = '#ff6600';
    else              arc.style.stroke = '#e60000';
  }

  const parEl = el('paranoiaText');
  if (parEl) {
    if (t <= 5)       parEl.textContent = 'DECIDE NOW!!!';
    else if (t <= 10) parEl.textContent = 'RUNNING OUT...';
    else              parEl.textContent = 'CHOOSE NOW';
  }

  // Screen pulse at low time
  if (t <= 5 && t > 0) {
    document.body.style.boxShadow =
      'inset 0 0 80px rgba(255,0,0,0.3)';
    setTimeout(() => {
      document.body.style.boxShadow = 'none';
    }, 400);
  }
}

// ============================================
// CHOICES
// ============================================
function chooseStay() {
  if (gameState.phase !== 'choosing') return;
  console.log('Player chose: STAY');
  makeChoice('STAY');
}

function chooseSnitch() {
  if (gameState.phase !== 'choosing') return;
  console.log('Player chose: SNITCH');
  makeChoice('SNITCH');
}

function makeChoice(choice) {
  if (gameState.phase !== 'choosing') return;

  clearInterval(gameState.timerInterval);
  gameState.phase = 'locked';
  gameState.player.choice = choice;
  console.log('Choice locked:', choice);
  playSound('lock');

  const stayBtn   = el('stayBtn');
  const snitchBtn = el('snitchBtn');

  if (choice === 'STAY') {
    if (stayBtn) {
      stayBtn.style.boxShadow = '0 0 50px rgba(0,170,255,0.9)';
      stayBtn.style.borderColor = '#00aaff';
      stayBtn.style.background =
        'linear-gradient(135deg,#001a33,#002244)';
    }
    if (snitchBtn) {
      snitchBtn.style.opacity = '0.25';
      snitchBtn.style.filter = 'blur(2px)';
      snitchBtn.disabled = true;
    }
  } else {
    if (snitchBtn) {
      snitchBtn.style.boxShadow = '0 0 50px rgba(255,0,0,0.9)';
      snitchBtn.style.borderColor = '#ff0000';
      snitchBtn.style.background =
        'linear-gradient(135deg,#1a0000,#2a0000)';
    }
    if (stayBtn) {
      stayBtn.style.opacity = '0.25';
      stayBtn.style.filter = 'blur(2px)';
      stayBtn.disabled = true;
    }
  }

  showToast('CHOICE LOCKED 🔒 WAITING FOR OPPONENT...','#e60000');

  // Fake ZK proof
  updateBottomBar('🔐 ENCRYPTING YOUR CHOICE...');
  setTimeout(() => {
    const hash = Array.from({length:16}, () =>
      '0123456789abcdef'[Math.floor(Math.random()*16)]
    ).join('');
    updateBottomBar('✅ PROOF HASH: 0x' + hash);
  }, 900);

  // Opponent decides after delay
  const delay = Math.random() * 1500 + 1500;
  setTimeout(opponentDecide, delay);
}

function opponentDecide() {
  const r = gameState.round;
  const snitchChance = r <= 2 ? 0.35 : r <= 5 ? 0.50 : 0.65;
  gameState.opponent.choice =
    Math.random() < snitchChance ? 'SNITCH' : 'STAY';
  console.log('Opponent chose:', gameState.opponent.choice);
  startReveal();
}

// ============================================
// REVEAL
// ============================================
function startReveal() {
  console.log('Phase: REVEALING');
  gameState.phase = 'revealing';

  const p = gameState.player.choice;
  const o = gameState.opponent.choice;

  let pts = 0, oppPts = 0;
  let outcomeText = '';
  let outcomeColor = '#fff';

  if (p === 'STAY' && o === 'STAY') {
    pts = 3; oppPts = 3;
    outcomeText = 'BOTH WALKED FREE 🕊️';
    outcomeColor = '#00cc44';
    playSound('win');
    gameState.player.wins++;
  } else if (p === 'SNITCH' && o === 'STAY') {
    pts = 5; oppPts = -1;
    outcomeText = 'COLD BLOODED. 🧊';
    outcomeColor = '#4da6ff';
    playSound('win');
    gameState.player.wins++;
  } else if (p === 'STAY' && o === 'SNITCH') {
    pts = -1; oppPts = 5;
    outcomeText = 'BETRAYED. 💀';
    outcomeColor = '#ff0000';
    playSound('betray');
    gameState.player.losses++;
    gameState.player.betrayals++;
  } else {
    pts = 0; oppPts = 0;
    outcomeText = 'MUTUAL DESTRUCTION 💥';
    outcomeColor = '#ff6600';
    playSound('reveal');
  }

  gameState.player.score += pts;
  gameState.opponent.score += oppPts;
  updateScoreDisplays();
  saveProgress();

  showRevealOverlay(p, o, outcomeText, outcomeColor, pts);
}

function showRevealOverlay(p, o, outcomeText, color, pts) {
  const old = document.getElementById('revealOverlay');
  if (old) old.remove();

  const pEmoji = p === 'STAY' ? '🤫' : '🗣️';
  const oEmoji = o === 'STAY' ? '🤫' : '🗣️';
  const pColor = p === 'STAY' ? '#4da6ff' : '#ff4444';
  const oColor = o === 'STAY' ? '#4da6ff' : '#ff4444';
  const ptsColor = pts > 0 ? '#00cc44' : pts < 0 ? '#ff4444':'#888';
  const ptsText = (pts > 0 ? '+' : '') + pts + ' POINTS';

  const overlay = document.createElement('div');
  overlay.id = 'revealOverlay';
  overlay.style.cssText = [
    'position:fixed','inset:0',
    'background:rgba(0,0,0,0.96)',
    'z-index:99997',
    'display:flex','flex-direction:column',
    'align-items:center','justify-content:center',
    'font-family:Bebas Neue,cursive',
    'opacity:0','transition:opacity 0.4s',
    'padding:20px'
  ].join(';');

  overlay.innerHTML = `
    <div style="color:#555;font-size:13px;
      letter-spacing:5px;margin-bottom:35px;
      text-align:center;">
      CASE RESULTS DECODED...
    </div>

    <div style="display:flex;gap:60px;
      align-items:center;margin-bottom:40px;
      flex-wrap:wrap;justify-content:center;">

      <div style="text-align:center;">
        <div style="color:#888;font-size:12px;
          letter-spacing:3px;margin-bottom:12px;">YOU</div>
        <div style="font-size:64px;
          margin-bottom:10px;">${pEmoji}</div>
        <div style="font-size:30px;
          color:${pColor};letter-spacing:2px;">${p}</div>
      </div>

      <div style="font-size:24px;color:#222;">VS</div>

      <div style="text-align:center;">
        <div style="color:#888;font-size:12px;
          letter-spacing:3px;margin-bottom:12px;">
          ${gameState.opponent.name}
        </div>
        <div style="font-size:64px;
          margin-bottom:10px;">${oEmoji}</div>
        <div style="font-size:30px;
          color:${oColor};letter-spacing:2px;">${o}</div>
      </div>
    </div>

    <div style="font-size:46px;color:${color};
      text-shadow:0 0 25px ${color};
      text-align:center;margin-bottom:16px;
      letter-spacing:2px;">
      ${outcomeText}
    </div>

    <div style="display:flex;gap:50px;
      margin-bottom:40px;font-size:20px;">
      <div style="text-align:center;">
        <div style="color:#555;font-size:11px;
          letter-spacing:2px;">YOU</div>
        <div style="color:${ptsColor};">${ptsText}</div>
      </div>
      <div style="text-align:center;">
        <div style="color:#555;font-size:11px;
          letter-spacing:2px;">OPPONENT</div>
        <div style="color:#888;">
          ${gameState.opponent.score} PTS TOTAL
        </div>
      </div>
    </div>

    <button id="nextRoundBtn" style="
      background:transparent;
      border:2px solid #e60000;
      color:#e60000;
      font-family:Bebas Neue,cursive;
      font-size:20px;
      letter-spacing:4px;
      padding:14px 44px;
      cursor:pointer;
      box-shadow:0 0 20px rgba(230,0,0,0.4);
      transition:all 0.2s;
      pointer-events:all;
    ">NEXT ROUND →</button>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => { overlay.style.opacity = '1'; });

  document.getElementById('nextRoundBtn')
    .addEventListener('click', () => {
      overlay.remove();
      nextRound();
    });
}

// ============================================
// NEXT ROUND
// ============================================
function nextRound() {
  gameState.round++;
  
  // Check if game is over after 4 rounds
  if (gameState.round > 4) {
    showGameOverScreen();
    return;
  }
  
  gameState.player.choice = null;
  gameState.opponent.choice = null;
  gameState.phase = 'choosing';

  // Update round display
  ['roundDisplay','roundNumber'].forEach(id => {
    const e = el(id);
    if (e) e.textContent = 'ROUND ' + gameState.round;
  });

  updateScoreDisplays();
  resetButtons();
  startTimer();

  showToast('ROUND ' + gameState.round +
    ' — CHOOSE WISELY', '#e60000');
}

function resetButtons() {
  const stayBtn   = el('stayBtn');
  const snitchBtn = el('snitchBtn');

  [stayBtn, snitchBtn].forEach(btn => {
    if (!btn) return;
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.filter = 'none';
    btn.style.boxShadow = '';
    btn.style.borderColor = '';
    btn.style.background = '';
  });
}

// ============================================
// GAME OVER
// ============================================
function showGameOverScreen() {
  console.log('Game Over - Final Results');
  gameState.phase = 'gameover';

  const finalWinner = gameState.player.score > gameState.opponent.score 
    ? 'YOU WIN! 🏆' 
    : gameState.player.score < gameState.opponent.score
    ? 'YOU LOSE 💀'
    : 'STALEMATE ⚖️';
  
  const winnerColor = gameState.player.score > gameState.opponent.score
    ? '#00cc44'
    : gameState.player.score < gameState.opponent.score
    ? '#ff0000'
    : '#888';

  const overlay = document.createElement('div');
  overlay.id = 'gameOverOverlay';
  overlay.style.cssText = [
    'position:fixed','inset:0',
    'background:rgba(0,0,0,0.98)',
    'z-index:99999',
    'display:flex','flex-direction:column',
    'align-items:center','justify-content:center',
    'font-family:Bebas Neue,cursive',
    'padding:20px',
    'color:#fff'
  ].join(';');

  overlay.innerHTML = `
    <div style="font-size:72px;color:${winnerColor};
      text-shadow:0 0 30px ${winnerColor};
      margin-bottom:40px;letter-spacing:3px;">
      ${finalWinner}
    </div>
    
    <div style="font-size:42px;margin-bottom:60px;
      color:#e60000;letter-spacing:2px;">
      FINAL SCORES
    </div>
    
    <div style="display:flex;gap:80px;
      margin-bottom:60px;font-size:32px;
      align-items:center;">
      <div style="text-align:center;">
        <div style="color:#888;font-size:14px;
          letter-spacing:2px;margin-bottom:20px;">YOU</div>
        <div style="color:#00cc44;font-size:48px;
          font-weight:bold;">${gameState.player.score}</div>
        <div style="color:#666;font-size:12px;
          margin-top:10px;">POINTS</div>
      </div>
      
      <div style="font-size:48px;color:#222;">VS</div>
      
      <div style="text-align:center;">
        <div style="color:#888;font-size:14px;
          letter-spacing:2px;margin-bottom:20px;">OPPONENT</div>
        <div style="color:#ff4444;font-size:48px;
          font-weight:bold;">${gameState.opponent.score}</div>
        <div style="color:#666;font-size:12px;
          margin-top:10px;">POINTS</div>
      </div>
    </div>
    
    <div style="display:flex;gap:60px;
      margin-bottom:50px;font-size:18px;">
      <div style="text-align:center;">
        <div style="color:#666;margin-bottom:10px;">Wins</div>
        <div style="color:#00cc44;font-size:28px;">${gameState.player.wins}</div>
      </div>
      <div style="text-align:center;">
        <div style="color:#666;margin-bottom:10px;">Losses</div>
        <div style="color:#ff4444;font-size:28px;">${gameState.player.losses}</div>
      </div>
      <div style="text-align:center;">
        <div style="color:#666;margin-bottom:10px;">Betrayals</div>
        <div style="color:#ff6600;font-size:28px;">${gameState.player.betrayals}</div>
      </div>
    </div>
    
    <button id="playAgainBtn" style="
      background:transparent;
      border:2px solid #e60000;
      color:#e60000;
      font-family:Bebas Neue,cursive;
      font-size:24px;
      letter-spacing:4px;
      padding:16px 50px;
      cursor:pointer;
      box-shadow:0 0 20px rgba(230,0,0,0.5);
      transition:all 0.2s;
      pointer-events:all;
    ">PLAY AGAIN</button>
  `;

  document.body.appendChild(overlay);

  document.getElementById('playAgainBtn')
    .addEventListener('click', () => {
      overlay.remove();
      location.reload();
    });
}

// ============================================
// TAUNTS
// ============================================
function sendTaunt(taunt) {
  if (gameState.player.tauntSent) return;
  gameState.player.tauntSent = true;

  // Fade out other taunts
  document.querySelectorAll('.taunt-btn').forEach(btn => {
    if (btn.dataset.taunt !== taunt) btn.style.opacity = '0.2';
  });

  showToast('TAUNT SENT: ' + taunt, '#ff6600');
  playSound('lock');
}

// ============================================
// BACKGROUND EFFECTS
// ============================================
function initBackgroundEffects() {
  // Rain
  const rain = el('rainCanvas');
  if (rain) {
    const rc = rain.getContext('2d');
    rain.width  = window.innerWidth;
    rain.height = window.innerHeight;

    const drops = Array.from({length:100}, () => ({
      x: Math.random() * rain.width,
      y: Math.random() * rain.height,
      spd: Math.random() * 3 + 1,
      len: Math.random() * 18 + 8,
      op:  Math.random() * 0.2 + 0.04
    }));

    (function drawRain() {
      rc.clearRect(0, 0, rain.width, rain.height);
      drops.forEach(d => {
        rc.beginPath();
        rc.moveTo(d.x, d.y);
        rc.lineTo(d.x - 1, d.y + d.len);
        rc.strokeStyle = `rgba(180,0,0,${d.op})`;
        rc.lineWidth = 0.7;
        rc.stroke();
        d.y += d.spd;
        if (d.y > rain.height) {
          d.y = -d.len;
          d.x = Math.random() * rain.width;
        }
      });
      requestAnimationFrame(drawRain);
    })();
  }

  // Embers
  const embers = el('emberCanvas');
  if (embers) {
    const ec = embers.getContext('2d');
    embers.width  = window.innerWidth;
    embers.height = window.innerHeight;

    const particles = Array.from({length:40}, () => ({
      x:  Math.random() * embers.width,
      y:  Math.random() * embers.height,
      sz: Math.random() * 2 + 1,
      sy: Math.random() * 1 + 0.3,
      sx: (Math.random() - 0.5) * 0.5,
      fl: Math.random() * Math.PI * 2,
      op: Math.random() * 0.6 + 0.2
    }));

    (function drawEmbers() {
      ec.clearRect(0, 0, embers.width, embers.height);
      particles.forEach(e => {
        e.fl += 0.05;
        const op = e.op * (0.6 + 0.4 * Math.sin(e.fl));
        const g = ec.createRadialGradient(
          e.x,e.y,0, e.x,e.y,e.sz*3);
        g.addColorStop(0, `rgba(255,80,0,${op})`);
        g.addColorStop(1, 'rgba(150,0,0,0)');
        ec.beginPath();
        ec.arc(e.x, e.y, e.sz*3, 0, Math.PI*2);
        ec.fillStyle = g;
        ec.fill();
        e.y -= e.sy;
        e.x += e.sx;
        if (e.y < -10) {
          e.y = embers.height + 10;
          e.x = Math.random() * embers.width;
        }
      });
      requestAnimationFrame(drawEmbers);
    })();
  }

  // Lightning
  (function lightning() {
    const bolt = el('lightning');
    if (!bolt) return;
    const delay = Math.random() * 6000 + 5000;
    setTimeout(() => {
      bolt.style.opacity = '0.12';
      bolt.style.background =
        'radial-gradient(ellipse at 50% 0%,' +
        'rgba(255,50,50,1) 0%,' +
        'rgba(180,0,0,0.3) 40%,transparent 70%)';
      setTimeout(()=>{ bolt.style.opacity='0'; }, 80);
      setTimeout(()=>{ bolt.style.opacity='0.07'; }, 130);
      setTimeout(()=>{ bolt.style.opacity='0'; }, 210);
      lightning();
    }, delay);
  })();

  // Resize handler
  window.addEventListener('resize', () => {
    const rc = el('rainCanvas');
    const ec = el('emberCanvas');
    if (rc) { rc.width=window.innerWidth; rc.height=window.innerHeight; }
    if (ec) { ec.width=window.innerWidth; ec.height=window.innerHeight; }
  });
}

// ============================================
// KEYBOARD
// ============================================
document.addEventListener('keydown', e => {
  if (gameState.phase !== 'choosing') return;
  if (e.key === 's' || e.key === 'S') chooseStay();
  if (e.key === 'n' || e.key === 'N') chooseSnitch();
});

// ============================================
// ATTACH ALL BUTTON LISTENERS
// ============================================
function attachListeners() {
  const stayBtn = el('stayBtn');
  const snitchBtn = el('snitchBtn');

  if (stayBtn) {
    stayBtn.addEventListener('click', e => {
      e.preventDefault();
      console.log('STAY clicked');
      chooseStay();
    });
  }

  if (snitchBtn) {
    snitchBtn.addEventListener('click', e => {
      e.preventDefault();
      console.log('SNITCH clicked');
      chooseSnitch();
    });
  }

  // Taunt buttons
  document.querySelectorAll('.taunt-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      sendTaunt(btn.dataset.taunt || btn.textContent);
    });
  });

  console.log('All listeners attached ✅');
}

// ============================================
// INIT — ENTRY POINT
// ============================================
function initGame() {
  console.log('initGame() ✅');
  console.log('Document ready state:', document.readyState);
  console.log('Body element:', document.body);
  console.log('Body class:', document.body.className);

  // Load persona safely
  try {
    const saved = OriginSafeStorage.getItem('persona');
    if (saved) {
      gameState.player.persona = JSON.parse(saved);
      console.log('✅ Loaded persona from localStorage:', gameState.player.persona);
    } else {
      // Set default persona if none exists
      gameState.player.persona = { 
        name: 'THE MASTERMIND', 
        emoji: '🧠', 
        loyalty: 75 
      };
      OriginSafeStorage.setItem('persona', JSON.stringify(gameState.player.persona));
      console.log('✅ Set default persona and saved to localStorage');
    }
  } catch(e) { 
    // Use default if error
    console.error('⚠️ Error with persona:', e.message);
    gameState.player.persona = { 
      name: 'THE MASTERMIND', 
      emoji: '🧠', 
      loyalty: 75 
    };
  }

  // Update persona in UI — try multiple possible IDs
  const pName = gameState.player.persona.name;
  const pEmoji = gameState.player.persona.emoji || '👤';
  
  console.log('Setting persona to:', pName, pEmoji);

  ['personaName','topPersonaName','playerPersonaName','avatarNameLeft']
    .forEach(id => { 
      const e=el(id); 
      if(e) {
        e.textContent=pName;
        console.log('✅ Updated ' + id);
      }
    });
  ['personaEmoji','topPersonaEmoji','playerPersonaEmoji',
   'figurePlayerEmoji','avatarEmojiLeft']
    .forEach(id => { 
      const e=el(id); 
      if(e) {
        e.textContent=pEmoji;
        console.log('✅ Updated ' + id);
      }
    });

  console.log('Attaching listeners...');
  attachListeners();
  
  console.log('Initializing background effects...');
  initBackgroundEffects();
  
  console.log('Showing loading overlay...');
  showLoadingOverlay();
  
  console.log('GAME FULLY FUNCTIONAL 🎮✅');
}

// Start when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initGame, 100);
  });
} else {
  setTimeout(initGame, 100);
}

console.log('game.js loaded ✅');
