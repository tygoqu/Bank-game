// ==========================================
// 1. ASSET LOADER (WITH PRELOADER)
// ==========================================
const assets = {
    bankInterior: new Image()
};

// We grab the start button so we can control it
const startBtn = document.querySelector('.start-btn');
startBtn.textContent = "Уншиж байна... (Loading...)";
startBtn.disabled = true; // Disable it initially
startBtn.style.opacity = "0.5";

// When the massive image finally finishes loading, unlock the button!
assets.bankInterior.onload = function() {
    startBtn.textContent = "Тоглоом Эхлэх (Start Game)";
    startBtn.disabled = false;
    startBtn.style.opacity = "1";
};

// Now we tell it what image to load
assets.bankInterior.src = 'assets/maps/bank_interior.png'; 

// ==========================================
// 2. CORE ENGINE & STATE
// ==========================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let W, H;

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W;
  canvas.height = H;
}
resize();
window.addEventListener('resize', resize);

const GS = {
  balance: 500000,
  points: 0,
  currentLevel: 0,
  phase: 'title', // title, playing, dialog
  dialogQueue: [],
  dialogStep: 0,
};

const player = {
  x: 60, y: 0, w: 32, h: 48,
  vx: 0, vy: 0, speed: 5,
  facing: 1, color: '#6495ED'
};

const cam = { x: 0, y: 0 };

// ==========================================
// 3. LEVEL DEFINITIONS (With your NPC!)
// ==========================================
const LEVELS = [
  {
    id: 1, name: 'Банкны дотор',
    bgImage: assets.bankInterior,
    floorY: 0.85, 
    width: 1920, 
    npcs: [
      { 
        x: 400, emoji: '👩‍💼', name: 'Теллер Болормаа', color: '#4169E1',
        dialog: [
          { speaker: 'Теллер Болормаа', emoji: '👩‍💼', text: 'Сайн байна уу! Төрийн банкинд тавтай морилно уу.' },
          { speaker: 'Теллер Болормаа', emoji: '👩‍💼', text: 'Та гүйлгээ хийх гэж байна уу? Би танд тусалъя.' }
        ]
      }
    ]
  }
];

// ==========================================
// 4. INPUT HANDLING
// ==========================================
const keys = { left: false, right: false };

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
  if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
  if (e.key === ' ' || e.key === 'Enter') handleInteract();
});
document.addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
  if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
});

// Touch controls for mobile UI
document.getElementById('btn-interact').addEventListener('click', handleInteract);
document.getElementById('dialog-top').addEventListener('click', advanceDialog);

document.getElementById('btn-left').addEventListener('touchstart', e => { e.preventDefault(); keys.left = true; });
document.getElementById('btn-left').addEventListener('touchend', e => { e.preventDefault(); keys.left = false; });
document.getElementById('btn-right').addEventListener('touchstart', e => { e.preventDefault(); keys.right = true; });
document.getElementById('btn-right').addEventListener('touchend', e => { e.preventDefault(); keys.right = false; });

// ==========================================
// 5. DIALOG SYSTEM
// ==========================================
function showDialog(messages) {
  if (!messages || messages.length === 0) return;
  GS.phase = 'dialog';
  GS.dialogStep = 0;
  GS.dialogQueue = messages;
  
  // Stop player moving
  keys.left = false; keys.right = false; 
  showDialogStep();
}

function showDialogStep() {
  const msg = GS.dialogQueue[GS.dialogStep];
  if (!msg) { closeDialog(); return; }
  
  document.getElementById('dialog-portrait').textContent = msg.emoji || '🗣️';
  document.getElementById('dialog-speaker').textContent = msg.speaker || '';
  document.getElementById('dialog-text').textContent = msg.text;
  document.getElementById('dialog-tap').style.display = GS.dialogStep < GS.dialogQueue.length - 1 ? 'block' : 'none';
  
  document.getElementById('dialog-box').classList.add('open');
}

function advanceDialog() {
  if (GS.phase !== 'dialog') return;
  GS.dialogStep++;
  if (GS.dialogStep >= GS.dialogQueue.length) {
    closeDialog();
  } else {
    showDialogStep();
  }
}

function closeDialog() {
  document.getElementById('dialog-box').classList.remove('open');
  GS.phase = 'playing';
}

// ==========================================
// 6. INTERACTION LOGIC
// ==========================================
function handleInteract() {
  if (GS.phase === 'dialog') { advanceDialog(); return; }
  if (GS.phase !== 'playing') return;

  const lv = LEVELS[GS.currentLevel];
  if (!lv) return;

  // Check if player is near an NPC
  for (const npc of lv.npcs) {
    const actualDist = Math.abs((player.x + cam.x) - npc.x);
    if (actualDist < 100) { // If player is within 100 pixels
      showDialog(npc.dialog);
      return;
    }
  }
}

// ==========================================
// 7. RENDERING ENGINE
// ==========================================
function getFloorY(lv) { return H * lv.floorY; }

function drawBackground(lv) {
  if (lv.bgImage && lv.bgImage.complete) {
    const imgHeight = H; 
    const imgWidth = lv.bgImage.width * (H / lv.bgImage.height); 
    ctx.drawImage(lv.bgImage, -cam.x, 0, imgWidth, imgHeight);
    lv.width = imgWidth; 
  } else {
    ctx.fillStyle = '#0a1628';
    ctx.fillRect(0, 0, W, H);
  }
}

function drawPlayer() {
  const lv = LEVELS[GS.currentLevel];
  if (!lv) return;
  const fy = getFloorY(lv);
  const py = fy - player.h;

  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, py, player.w, player.h);
}

function drawNPC(npc, lv) {
  const screenX = npc.x - cam.x;
  // Don't draw if off-screen
  if (screenX < -100 || screenX > W + 100) return; 
  
  const fy = getFloorY(lv);
  
  // Draw NPC Emoji
  ctx.font = '40px serif';
  ctx.textAlign = 'center';
  ctx.fillText(npc.emoji, screenX, fy - 20);

  // Check distance for the Interaction Hint
  const actualDist = Math.abs((player.x + cam.x) - npc.x);
  if (actualDist < 100) {
    ctx.fillStyle = 'rgba(255,215,0,0.9)';
    ctx.font = 'bold 14px system-ui';
    ctx.fillText('🗨️ [Space / Tap]', screenX, fy - 70);
  }
}

// ==========================================
// 8. PHYSICS & CAMERA
// ==========================================
function updatePlayer() {
  if (GS.phase !== 'playing') return;
  const lv = LEVELS[GS.currentLevel];
  if (!lv) return;

  player.vx = 0;
  if (keys.left) { player.vx = -player.speed; player.facing = -1; }
  if (keys.right) { player.vx = player.speed; player.facing = 1; }

  const worldX = player.x + cam.x;
  const newWorldX = Math.max(0, Math.min(lv.width - player.w, worldX + player.vx));

  const deadL = W * 0.4, deadR = W * 0.6;
  const newScreenX = newWorldX - cam.x;
  
  if (newScreenX < deadL) cam.x = Math.max(0, newWorldX - deadL);
  else if (newScreenX > deadR) cam.x = Math.min(lv.width - W, newWorldX - deadR);

  player.x = newWorldX - cam.x;
}

// ==========================================
// 9. MAIN LOOP & START
// ==========================================
function gameLoop() {
  ctx.clearRect(0, 0, W, H);

  if (GS.phase === 'playing' || GS.phase === 'dialog') {
    const lv = LEVELS[GS.currentLevel];
    drawBackground(lv);
    lv.npcs.forEach(n => drawNPC(n, lv));
    updatePlayer();
    drawPlayer();
  }

  requestAnimationFrame(gameLoop);
}

window.beginGame = function() {
  document.getElementById('title-screen').style.display = 'none';
  document.getElementById('touch-controls').style.display = 'flex';
  document.getElementById('hud').style.display = 'flex';
  
  document.getElementById('hud-bal').textContent = `₮ 500,000`;
  document.getElementById('hud-pts').textContent = 0;
  
  GS.phase = 'playing';
  gameLoop();
};
