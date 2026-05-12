// ==========================================
// 1. ASSET LOADER & PRELOADER
// ==========================================
const assets = {
    bankInterior: new Image(),
    playerSprite: new Image()
};

let loadedAssets = 0;
const totalAssets = 2;

function assetLoaded() {
    loadedAssets++;
    if (loadedAssets === totalAssets) {
        const startBtn = document.querySelector('.start-btn');
        startBtn.textContent = "Тоглоом Эхлэх (Start Game)";
        startBtn.disabled = false;
    }
}

assets.bankInterior.onload = assetLoaded;
assets.playerSprite.onload = assetLoaded;

assets.bankInterior.src = 'assets/maps/bank_interior.png'; 
assets.playerSprite.src = 'assets/player_walk.png'; 

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
  ctx.imageSmoothingEnabled = false; // Keeps pixel art sharp
}
resize();
window.addEventListener('resize', resize);

const GS = {
  balance: 500000,
  points: 0,
  currentLevel: 0,
  phase: 'title', 
  dialogQueue: [],
  dialogStep: 0,
};

// ==========================================
// 3. PLAYER SETTINGS
// ==========================================
const player = {
  x: 800, y: 500, 
  
  // 1. RENDER SIZE: This is how big the character appears on screen!
  // Try lowering these numbers to shrink the player. 
  w: 24,  // Changed from 48
  h: 48,  // Changed from 96
  
  vx: 0, vy: 0, speed: 5,
  facing: 1, walking: false,
  
  // 2. SOURCE SIZE: This is the actual math used to slice your PNG.
  // We need to calculate this based on your exact file.
  spriteWidth: 64,   // See instructions below!
  spriteHeight: 128, // See instructions below!
  currentFrame: 0,  
  frameTimer: 0     
};
// ==========================================
// 4. LEVEL & NPC DEFINITIONS
// ==========================================
const LEVELS = [
  {
    id: 1, name: 'Банкны дотор',
    bgImage: assets.bankInterior,
    floorY: 0.85, 
    width: 1920, 
    npcs: [
      { 
        x: 400, emoji: '👩‍💼', name: 'Теллер Болормаа', 
        dialog: [
          { speaker: 'Болормаа', emoji: '👩‍💼', text: 'Төрийн банкинд тавтай морилно уу.' },
          { speaker: 'Болормаа', emoji: '👩‍💼', text: 'Цахим банк ашиглах талаар суралцах уу?' }
        ],
        minigame: 'gyalsbank'
      },
      { 
        x: 800, emoji: '👨‍💼', name: 'Менежер', 
        dialog: [
          { speaker: 'Менежер', emoji: '👨‍💼', text: 'Та төсвөө хэрхэн зөв хуваарилахыг мэдэх үү?' }
        ],
        minigame: 'budget'
      }
    ]
  }
];

// ==========================================
// 5. INPUT HANDLING
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

document.getElementById('btn-interact').addEventListener('click', handleInteract);
document.getElementById('dialog-top').addEventListener('click', advanceDialog);
document.getElementById('btn-left').addEventListener('touchstart', e => { e.preventDefault(); keys.left = true; });
document.getElementById('btn-left').addEventListener('touchend', e => { e.preventDefault(); keys.left = false; });
document.getElementById('btn-right').addEventListener('touchstart', e => { e.preventDefault(); keys.right = true; });
document.getElementById('btn-right').addEventListener('touchend', e => { e.preventDefault(); keys.right = false; });

// ==========================================
// 6. UI & HUD
// ==========================================
function updateHUD() {
  document.getElementById('hud-bal').textContent = `₮ ` + GS.balance.toLocaleString();
  document.getElementById('hud-pts').textContent = GS.points;
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2100);
}

// ==========================================
// 7. DIALOG SYSTEM
// ==========================================
let currentNPC = null;

function showDialog(messages, npc) {
  if (!messages || messages.length === 0) return;
  GS.phase = 'dialog';
  GS.dialogStep = 0;
  GS.dialogQueue = messages;
  currentNPC = npc;
  
  keys.left = false; keys.right = false; 
  player.walking = false;
  showDialogStep();
}

function showDialogStep() {
  const msg = GS.dialogQueue[GS.dialogStep];
  if (!msg) { closeDialog(); return; }
  
  document.getElementById('dialog-portrait').textContent = msg.emoji || '🗣️';
  document.getElementById('dialog-speaker').textContent = msg.speaker || '';
  document.getElementById('dialog-text').textContent = msg.text;
  document.getElementById('dialog-box').classList.add('open');
}

function advanceDialog() {
  if (GS.phase !== 'dialog') return;
  GS.dialogStep++;
  if (GS.dialogStep >= GS.dialogQueue.length) {
    closeDialog();
    if (currentNPC && currentNPC.minigame) {
        openMiniGame(currentNPC.minigame);
    }
  } else {
    showDialogStep();
  }
}

function closeDialog() {
  document.getElementById('dialog-box').classList.remove('open');
  GS.phase = 'playing';
  currentNPC = null;
}

// ==========================================
// 8. MINIGAME SYSTEM
// ==========================================
function openMiniGame(id) {
  const body = document.getElementById('minigame-body');
  body.innerHTML = '';
  GS.phase = 'minigame';

  if (id === 'gyalsbank') {
      document.getElementById('minigame-title').textContent = "Гялс Банк";
      body.innerHTML = `
        <div style="background:#0a1528; padding:20px; border-radius:10px; text-align:center;">
          <h3 style="color:#6495ED; margin-bottom: 10px;">Шилжүүлэг хийх</h3>
          <p style="margin-bottom: 20px;">Та 50,000₮ шилжүүлэх үү?</p>
          <button class="choice-btn" onclick="transferMoney()" style="width:100%; justify-content:center;">Шилжүүлэх</button>
        </div>
      `;
  } else if (id === 'budget') {
      document.getElementById('minigame-title').textContent = "Төсөв зохиох";
      body.innerHTML = `
        <div style="background:#0a1528; padding:20px; border-radius:10px;">
            <p>Зөв төсөвлөлт бол амжилтын үндэс!</p>
            <br>
            <button class="choice-btn" onclick="finishMiniGame(50)" style="width:100%; justify-content:center;">Төсвөө батлах (+50 оноо)</button>
        </div>
      `;
  }

  document.getElementById('minigame-overlay').classList.add('open');
}

window.transferMoney = function() {
    GS.balance -= 50000;
    updateHUD();
    finishMiniGame(20);
}

window.finishMiniGame = function(points) {
    GS.points += points;
    updateHUD();
    showToast(`+${points} ⭐ Оноо авлаа!`);
    closeMiniGame();
}

window.closeMiniGame = function() {
  document.getElementById('minigame-overlay').classList.remove('open');
  GS.phase = 'playing';
}

function handleInteract() {
  if (GS.phase === 'dialog') { advanceDialog(); return; }
  if (GS.phase !== 'playing') return;

  const lv = LEVELS[GS.currentLevel];
  for (const npc of lv.npcs) {
    const actualDist = Math.abs((player.x + cam.x) - npc.x);
    if (actualDist < 100) { 
      showDialog(npc.dialog, npc);
      return;
    }
  }
}

// ==========================================
// 9. RENDERING ENGINE
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

  if (assets.playerSprite && assets.playerSprite.complete) {
      // Animate frame
      if (player.walking) {
          player.frameTimer++;
          if (player.frameTimer >= 8) { 
              player.currentFrame++;
              if (player.currentFrame > 3) player.currentFrame = 0; 
              player.frameTimer = 0;
          }
      } else {
          player.currentFrame = 0; // Idle frame
      }

      // Draw sprite
      ctx.save();
      if (player.facing === -1) {
          ctx.translate(player.x + player.w, py);
          ctx.scale(-1, 1);
          ctx.drawImage(assets.playerSprite, player.currentFrame * player.spriteWidth, 0, player.spriteWidth, player.spriteHeight, 0, 0, player.w, player.h);
      } else {
          ctx.drawImage(assets.playerSprite, player.currentFrame * player.spriteWidth, 0, player.spriteWidth, player.spriteHeight, player.x, py, player.w, player.h);
      }
      ctx.restore();
  } else {
      // Fallback if sprite is missing
      ctx.fillStyle = '#6495ED';
      ctx.fillRect(player.x, py, player.w, player.h);
  }
}

function drawNPC(npc, lv) {
  const screenX = npc.x - cam.x;
  if (screenX < -100 || screenX > W + 100) return; 
  
  const fy = getFloorY(lv);
  ctx.font = '40px serif';
  ctx.textAlign = 'center';
  ctx.fillText(npc.emoji, screenX, fy - 20);

  const actualDist = Math.abs((player.x + cam.x) - npc.x);
  if (actualDist < 100) {
    ctx.fillStyle = 'rgba(255,215,0,0.9)';
    ctx.font = 'bold 14px system-ui';
    ctx.fillText('🗨️ [Space / Tap]', screenX, fy - 70);
  }
}

// ==========================================
// 10. PHYSICS & MOVEMENT
// ==========================================
function updatePlayer() {
  if (GS.phase !== 'playing') return;
  const lv = LEVELS[GS.currentLevel];

  player.vx = 0;
  if (keys.left) { player.vx = -player.speed; player.facing = -1; }
  if (keys.right) { player.vx = player.speed; player.facing = 1; }
  
  player.walking = player.vx !== 0;

  const worldX = player.x + cam.x;
  const newWorldX = Math.max(0, Math.min(lv.width - player.w, worldX + player.vx));

  const deadL = W * 0.4, deadR = W * 0.6;
  const newScreenX = newWorldX - cam.x;
  
  if (newScreenX < deadL) cam.x = Math.max(0, newWorldX - deadL);
  else if (newScreenX > deadR) cam.x = Math.min(lv.width - W, newWorldX - deadR);

  player.x = newWorldX - cam.x;
}

// ==========================================
// 11. MAIN LOOP
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
  if (document.querySelector('.start-btn').disabled) return; 
  document.getElementById('title-screen').style.display = 'none';
  document.getElementById('touch-controls').style.display = 'flex';
  document.getElementById('hud').style.display = 'flex';
  updateHUD();
  GS.phase = 'playing';
  gameLoop();
};
