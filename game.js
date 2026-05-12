// ==========================================
// 1. ASSET LOADER (FLIPBOOK VERSION)
// ==========================================
const assets = {
    bankInterior: new Image(),
    playerFrames: [new Image(), new Image(), new Image(), new Image()]
};

assets.bankInterior.src = 'assets/maps/bank_interior.png'; 
assets.playerFrames[0].src = 'assets/player_walk_1.png'; 
assets.playerFrames[1].src = 'assets/player_walk_2.png'; 
assets.playerFrames[2].src = 'assets/player_walk_3.png'; 
assets.playerFrames[3].src = 'assets/player_walk_4.png'; 

// Force unlock the start button when the page loads
window.onload = () => {
    const startBtn = document.querySelector('.start-btn');
    if (startBtn) {
        startBtn.textContent = "Тоглоом Эхлэх";
        startBtn.disabled = false;
        startBtn.style.opacity = "1";
    }
};

// ==========================================
// 2. CORE ENGINE & STATE
// ==========================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let W, H;
const DEBUG_HITBOXES = false; // Set to true if you want to see red walls

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W;
  canvas.height = H;
  ctx.imageSmoothingEnabled = false; 
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
// 3. PLAYER SETTINGS (NO SLICING MATH NEEDED!)
// ==========================================
const player = {
  x: 950, y: 700, // Spawn Point in Lobby
  w: 48, h: 96,   // Render size on screen (Adjust if she's too big)
  vx: 0, vy: 0, speed: 5,
  facing: 1, walking: false,
  currentFrame: 0,  
  frameTimer: 0     
};
const cam = { x: 0, y: 0 };

// ==========================================
// 4. LEVEL, NPCS & HITBOXES
// ==========================================
const LEVELS = [
  {
    id: 1, name: 'Банкны дотор',
    bgImage: assets.bankInterior,
    
    // Invisible Walls
    hitboxes: [
        { x: 0, y: 0, w: 1920, h: 320 },      // Top Counters
        { x: 0, y: 0, w: 100, h: 1080 },      // Left Wall
        { x: 1820, y: 0, w: 100, h: 1080 },   // Right Wall
        { x: 0, y: 980, w: 1920, h: 100 },    // Bottom Wall
        { x: 0, y: 550, w: 450, h: 430 },     // Vault Area
        { x: 450, y: 550, w: 300, h: 100 },   // Railings
        { x: 1450, y: 550, w: 470, h: 100 }   // Office Dividers
    ],
    
    npcs: [
      { 
        x: 1000, y: 340, emoji: '👩‍💼', name: 'Теллер Болормаа', 
        dialog: [
          { speaker: 'Болормаа', emoji: '👩‍💼', text: 'Төрийн банкинд тавтай морилно уу.' },
          { speaker: 'Болормаа', emoji: '👩‍💼', text: 'Та цахим банк ашиглаж сурмаар байна уу?' }
        ],
        minigame: 'gyalsbank'
      },
      { 
        x: 600, y: 650, emoji: '👨‍💼', name: 'Менежер', 
        dialog: [
          { speaker: 'Менежер', emoji: '👨‍💼', text: 'Санхүүгийн мэдлэгээ шалгах уу?' }
        ],
        minigame: 'budget'
      }
    ]
  }
];

// ==========================================
// 5. INPUT HANDLING
// ==========================================
const keys = { left: false, right: false, up: false, down: false };

document.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === 'arrowleft' || k === 'a') keys.left = true;
  if (k === 'arrowright' || k === 'd') keys.right = true;
  if (k === 'arrowup' || k === 'w') keys.up = true;
  if (k === 'arrowdown' || k === 's') keys.down = true;
  if (k === ' ' || k === 'enter') handleInteract();
});
document.addEventListener('keyup', e => {
  const k = e.key.toLowerCase();
  if (k === 'arrowleft' || k === 'a') keys.left = false;
  if (k === 'arrowright' || k === 'd') keys.right = false;
  if (k === 'arrowup' || k === 'w') keys.up = false;
  if (k === 'arrowdown' || k === 's') keys.down = false;
});

// Mobile Controls
const touchControlSetup = (id, key) => {
    const el = document.getElementById(id);
    if(el) {
        el.addEventListener('touchstart', e => { e.preventDefault(); keys[key] = true; });
        el.addEventListener('touchend', e => { e.preventDefault(); keys[key] = false; });
    }
}
touchControlSetup('btn-left', 'left');
touchControlSetup('btn-right', 'right');
touchControlSetup('btn-up', 'up');
touchControlSetup('btn-down', 'down');
document.getElementById('btn-interact').addEventListener('click', handleInteract);
document.getElementById('dialog-top').addEventListener('click', advanceDialog);

// ==========================================
// 6. UI, HUD & MINIGAMES
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

let currentNPC = null;
function showDialog(messages, npc) {
  if (!messages || messages.length === 0) return;
  GS.phase = 'dialog';
  GS.dialogStep = 0;
  GS.dialogQueue = messages;
  currentNPC = npc;
  
  keys.left = false; keys.right = false; keys.up = false; keys.down = false;
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
    if (currentNPC && currentNPC.minigame) openMiniGame(currentNPC.minigame);
  } else {
    showDialogStep();
  }
}

function closeDialog() {
  document.getElementById('dialog-box').classList.remove('open');
  GS.phase = 'playing';
  currentNPC = null;
}

function openMiniGame(id) {
  const body = document.getElementById('minigame-body');
  body.innerHTML = '';
  GS.phase = 'minigame';
  if (id === 'gyalsbank') {
      document.getElementById('minigame-title').textContent = "Гялс Банк";
      body.innerHTML = `<div style="background:#0a1528; padding:20px; border-radius:10px; text-align:center;"><h3 style="color:#6495ED; margin-bottom: 10px;">Шилжүүлэг хийх</h3><p style="margin-bottom: 20px;">Та 50,000₮ шилжүүлэх үү?</p><button class="choice-btn" onclick="transferMoney()" style="width:100%; justify-content:center;">Шилжүүлэх</button></div>`;
  } else if (id === 'budget') {
      document.getElementById('minigame-title').textContent = "Төсөв зохиох";
      body.innerHTML = `<div style="background:#0a1528; padding:20px; border-radius:10px;"><p>Зөв төсөвлөлт бол амжилтын үндэс!</p><br><button class="choice-btn" onclick="finishMiniGame(50)" style="width:100%; justify-content:center;">Төсвөө батлах (+50 оноо)</button></div>`;
  }
  document.getElementById('minigame-overlay').classList.add('open');
}

window.transferMoney = function() { GS.balance -= 50000; updateHUD(); finishMiniGame(20); }
window.finishMiniGame = function(points) { GS.points += points; updateHUD(); showToast(`+${points} ⭐ Оноо авлаа!`); closeMiniGame(); }
window.closeMiniGame = function() { document.getElementById('minigame-overlay').classList.remove('open'); GS.phase = 'playing'; }

function handleInteract() {
  if (GS.phase === 'dialog') { advanceDialog(); return; }
  if (GS.phase !== 'playing') return;
  const lv = LEVELS[GS.currentLevel];
  for (const npc of lv.npcs) {
    const dx = player.x + (player.w/2) - npc.x;
    const dy = player.y + (player.h/2) - npc.y;
    if (Math.sqrt(dx*dx + dy*dy) < 120) { showDialog(npc.dialog, npc); return; }
  }
}

// ==========================================
// 7. RENDERING & CAMERA
// ==========================================
function drawBackground(lv) {
  if (lv.bgImage && lv.bgImage.complete && lv.bgImage.width > 0) {
    ctx.drawImage(lv.bgImage, -cam.x, -cam.y); 
    lv.width = lv.bgImage.width; 
    lv.height = lv.bgImage.height;
  } else {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);
  }
}

function drawHitboxes(lv) {
    if (!DEBUG_HITBOXES) return;
    ctx.fillStyle = 'rgba(255, 0, 0, 0.4)'; 
    for (let box of lv.hitboxes) {
        ctx.fillRect(box.x - cam.x, box.y - cam.y, box.w, box.h);
    }
}

function drawPlayer() {
  const drawX = player.x - cam.x;
  const drawY = player.y - cam.y;

  const currentImg = assets.playerFrames[player.currentFrame];

  // If the image is successfully loaded, draw the character!
  if (currentImg && currentImg.complete && currentImg.width > 0) {
      
      if (player.walking) {
          player.frameTimer++;
          if (player.frameTimer >= 8) { 
              player.currentFrame = (player.currentFrame + 1) % 4; 
              player.frameTimer = 0;
          }
      } else {
          player.currentFrame = 0; 
      }

      ctx.save();
      if (player.facing === -1) {
          // Face left
          ctx.translate(drawX + player.w, drawY);
          ctx.scale(-1, 1);
          ctx.drawImage(assets.playerFrames[player.currentFrame], 0, 0, player.w, player.h);
      } else {
          // Face right
          ctx.drawImage(assets.playerFrames[player.currentFrame], drawX, drawY, player.w, player.h);
      }
      ctx.restore();
  } else {
      // If the image fails to load, draw the yellow fallback box
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(drawX, drawY, player.w, player.h);
  }
}

function drawNPC(npc, lv) {
  const drawX = npc.x - cam.x;
  const drawY = npc.y - cam.y;
  if (drawX < -100 || drawX > W + 100 || drawY < -100 || drawY > H + 100) return; 
  
  ctx.font = '40px serif';
  ctx.textAlign = 'center';
  ctx.fillText(npc.emoji, drawX, drawY);

  const dx = player.x + (player.w/2) - npc.x;
  const dy = player.y + (player.h/2) - npc.y;
  if (Math.sqrt(dx*dx + dy*dy) < 120) {
    ctx.fillStyle = 'rgba(255,215,0,0.9)';
    ctx.font = 'bold 14px system-ui';
    ctx.fillText('🗨️ [Space / Tap]', drawX, drawY - 40);
  }
}

// ==========================================
// 8. PHYSICS & COLLISION
// ==========================================
function checkCollision(newX, newY, hitboxes) {
    const pw = player.w * 0.8; 
    const ph = 20; // Only block the feet
    const px = newX + (player.w - pw) / 2;
    const py = newY + player.h - ph;

    for (let box of hitboxes) {
        if (px < box.x + box.w && px + pw > box.x && py < box.y + box.h && py + ph > box.y) {
            return true; 
        }
    }
    return false; 
}

function updatePlayer() {
  if (GS.phase !== 'playing') return;
  const lv = LEVELS[GS.currentLevel];

  player.vx = 0; player.vy = 0;
  if (keys.left) { player.vx = -player.speed; player.facing = -1; }
  if (keys.right) { player.vx = player.speed; player.facing = 1; }
  if (keys.up) { player.vy = -player.speed; }
  if (keys.down) { player.vy = player.speed; }
  
  player.walking = (player.vx !== 0 || player.vy !== 0);

  let nextX = player.x + player.vx;
  let nextY = player.y + player.vy;

  if (!checkCollision(nextX, player.y, lv.hitboxes)) player.x = nextX;
  if (!checkCollision(player.x, nextY, lv.hitboxes)) player.y = nextY;

  // Center Camera
  cam.x = player.x - (W / 2) + (player.w / 2);
  cam.y = player.y - (H / 2) + (player.h / 2);

  if (lv.width && lv.height) {
      if (cam.x < 0) cam.x = 0;
      if (cam.y < 0) cam.y = 0;
      if (cam.x > lv.width - W) cam.x = lv.width - W;
      if (cam.y > lv.height - H) cam.y = lv.height - H;
  }
}

// ==========================================
// 9. MAIN LOOP
// ==========================================
function gameLoop() {
  ctx.clearRect(0, 0, W, H);

  if (GS.phase === 'playing' || GS.phase === 'dialog') {
    const lv = LEVELS[GS.currentLevel];
    drawBackground(lv);
    if (DEBUG_HITBOXES) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.4)'; 
        for (let box of lv.hitboxes) ctx.fillRect(box.x - cam.x, box.y - cam.y, box.w, box.h);
    }
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
