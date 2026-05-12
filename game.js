// ==========================================
// 1. ASSET LOADER (BYPASS VERSION)
// ==========================================
const assets = {
    bankInterior: new Image(),
    playerSprite: new Image()
};

// This forces the button to unlock immediately
assets.bankInterior.src = 'assets/maps/bank_interior.png'; 
assets.playerSprite.src = 'assets/player_walk.png'; 

// ==========================================
// 2. CORE ENGINE & STATE
// ==========================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let W, H;
const DEBUG_HITBOXES = false; // Set to true if you want to see walls

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
// 3. PLAYER SETTINGS (FIXED FOR YOUR STRIP)
// ==========================================
const player = {
  x: 800, y: 500, // Starting position in the lobby
  
  // RENDER SIZE: Shrink these if she is too big
  w: 40, 
  h: 80, 
  
  vx: 0, vy: 0, speed: 5,
  facing: 1, walking: false,
  
  // SLICING MATH: Based on your 4-frame image
  // Width should be [Total Image Width / 4]
  // Height should be [Total Image Height]
  spriteWidth: 200,  // ADJUST THIS: Total width of player_walk.png divided by 4
  spriteHeight: 400, // ADJUST THIS: Total height of player_walk.png
  currentFrame: 0,  
  frameTimer: 0     
};
const cam = { x: 0, y: 0 };

// ... (Keep the rest of your logic, LEVELS, and updatePlayer functions) ...

// ==========================================
// 9. RE-LINKED START BUTTON
// ==========================================
// Force unlock the start button regardless of image status
window.onload = () => {
    const startBtn = document.querySelector('.start-btn');
    startBtn.textContent = "Тоглоом Эхлэх (Start Game)";
    startBtn.disabled = false;
    startBtn.style.opacity = "1";
};

window.beginGame = function() {
  document.getElementById('title-screen').style.display = 'none';
  document.getElementById('touch-controls').style.display = 'flex';
  document.getElementById('hud').style.display = 'flex';
  GS.phase = 'playing';
  gameLoop();
};
