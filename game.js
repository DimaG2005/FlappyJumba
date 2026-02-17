const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

/* ============================= */
/*          ФОН                  */
/* ============================= */
const bgImage = new Image();
bgImage.src = "komar.jpg";

/* ============================= */
/*          МУЗЫКА               */
/* ============================= */
const music = new Audio("gufmusic.mp3");
music.loop = true;
music.volume = 0.5;
let musicStarted = false;
function startMusic() {
    if (!musicStarted) {
        music.play().catch(() => {});
        musicStarted = true;
    }
}

/* ============================= */
/*          ПТИЦА                */
/* ============================= */
let bird = {
    x: 40,
    y: canvas.height / 1,
    size: 20,
    velocity: 0
};

let gravity, jumpPower;

/* ============================= */
/*          ТРУБЫ                */
/* ============================= */
let pipes = [];
let pipeGap;
let pipeSpawnInterval;
let pipeTimer;
let pipeSpeed = 4;

/* ============================= */
/*          ИГРА                 */
/* ============================= */
let score = 0;
let coinsCollected = 0;
let gameActive = false;

/* ============================= */
/*    АДАПТАЦИЯ ПОД МОБИЛКУ     */
/* ============================= */
function updateGameParameters() {
    const scale = canvas.height / 800;
    gravity = 0.35 * scale;
    jumpPower = -8.5 * scale;
    pipeGap = 250 * scale;
    pipeSpawnInterval = 1500;
}
updateGameParameters();

/* ============================= */
/*       СПАВН ТРУБ              */
/* ============================= */
function spawnPipe() {
    const minTop = 50;
    const maxTop = canvas.height - pipeGap - 50;
    const topHeight = Math.random() * (maxTop - minTop) + minTop;

    pipes.push({
        x: canvas.width,
        top: topHeight,
        bottom: topHeight + pipeGap,
        passed: false,
        coinSpawned: false
    });
}

/* ============================= */
/*          МОНЕТКИ              */
/* ============================= */
let coins = [];
function spawnCoin(pipe) {
    const coinY = pipe.top + Math.random() * (pipe.bottom - pipe.top - 30);
    coins.push({
        x: pipe.x + 35,
        y: coinY,
        size: 20,
        collected: false
    });
}

/* ============================= */
/*          УПРАВЛЕНИЕ           */
/* ============================= */
function jump() {
    if (!gameActive) { restart(); return; }
    bird.velocity = jumpPower;
    startMusic();
}

document.addEventListener("click", jump);
document.addEventListener("touchstart", jump);
document.addEventListener("keydown", e => { if(e.code === "Space") jump(); });

/* ============================= */
/*          ОБНОВЛЕНИЕ           */
/* ============================= */
function update() {
    if (!gameActive) return;

    bird.velocity += gravity;
    bird.y += bird.velocity;

    if (bird.y < 0 || bird.y + bird.size > canvas.height) endGame();

    pipes.forEach(pipe => {
        pipe.x -= pipeSpeed;

        if (bird.x < pipe.x + 70 && bird.x + bird.size > pipe.x &&
            (bird.y < pipe.top || bird.y + bird.size > pipe.bottom)) {
            endGame();
        }

        // очки
        if (!pipe.passed && bird.x > pipe.x + 70) {
            pipe.passed = true;
            score++;

            // монетки сразу с первой трубы
            coinsCollected += 1;

            // отправляем в Telegram
            if (window.Telegram && Telegram.WebApp) {
                Telegram.WebApp.sendData(JSON.stringify({
                    score: score,
                    coins: coinsCollected,
                    game: "flappy"
                }));
            }
        }

        // создаем монетку визуально
        if (!pipe.coinSpawned) { spawnCoin(pipe); pipe.coinSpawned = true; }
    });

    coins.forEach(coin => {
        coin.x -= pipeSpeed;
        if (!coin.collected &&
            bird.x < coin.x + coin.size && bird.x + bird.size > coin.x &&
            bird.y < coin.y + coin.size && bird.y + bird.size > coin.y) {
            coin.collected = true;
        }
    });

    pipes = pipes.filter(p => p.x > -100);
    coins = coins.filter(c => c.x > -50 && !c.collected);
}

/* ============================= */
/*          ОТРИСОВКА           */
/* ============================= */
function drawBackground() {
    if (!bgImage.complete || bgImage.naturalWidth === 0) {
        ctx.fillStyle = "#87CEEB";
        ctx.fillRect(0,0,canvas.width,canvas.height);
        return;
    }
    const scale = Math.max(canvas.width / bgImage.width, canvas.height / bgImage.height);
    const x = (canvas.width - bgImage.width * scale)/2;
    const y = (canvas.height - bgImage.height * scale)/2;
    ctx.drawImage(bgImage, x, y, bgImage.width * scale, bgImage.height * scale);
}

function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawBackground();

    // птица
    ctx.fillStyle = "yellow";
    ctx.fillRect(bird.x,bird.y,bird.size,bird.size);

    // трубы
    ctx.fillStyle = "green";
    pipes.forEach(pipe => {
        ctx.fillRect(pipe.x,0,70,pipe.top);
        ctx.fillRect(pipe.x,pipe.bottom,70,canvas.height - pipe.bottom);
    });

    // монетки
    ctx.fillStyle = "gold";
    coins.forEach(coin => {
        ctx.beginPath();
        ctx.arc(coin.x + coin.size/2, coin.y + coin.size/2, coin.size/2, 0, Math.PI*2);
        ctx.fill();
    });

    // счёт
    ctx.fillStyle = "white";
    ctx.font = "40px Arial";
    ctx.fillText("Score: "+score, 30,60);
    ctx.fillText("Coins: "+coinsCollected, 30,110);

    // старт / Game Over
    if (!gameActive && score === 0) {
        ctx.font = "40px Arial";
        ctx.fillText("Tap to Start", canvas.width/2 - 110, canvas.height/2);
    }
    if (!gameActive && score > 0) {
        ctx.fillStyle = "red";
        ctx.font = "50px Arial";
        ctx.fillText("GAME OVER", canvas.width/2 - 150, canvas.height/2);
        ctx.fillStyle = "white";
        ctx.font = "30px Arial";
        ctx.fillText("Tap to restart", canvas.width/2 - 100, canvas.height/2 + 40);
    }
}

/* ============================= */
/*           RESTART             */
/* ============================= */
function restart() {
    bird.y = canvas.height/2;
    bird.velocity = 0;
    pipes = [];
    coins = [];
    coinsCollected = 0;
    score = 0;
    gameActive = true;

    clearInterval(pipeTimer);
    pipeTimer = setInterval(spawnPipe, pipeSpawnInterval);
}

/* ============================= */
/*          ЗАВЕРШЕНИЕ           */
/* ============================= */
function endGame() {
    if (!gameActive) return;
    gameActive = false;
    if (window.Telegram && Telegram.WebApp) {
        Telegram.WebApp.sendData(JSON.stringify({
            score: score,
            coins: coinsCollected,
            game: "flappy"
        }));
    }
}

/* ============================= */
/*            LOOP               */
/* ============================= */
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

/* ============================= */
/*          RESIZE               */
/* ============================= */
window.addEventListener("resize", ()=>{
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    updateGameParameters();
});

/* ============================= */
/*            СТАРТ              */
/* ============================= */
bgImage.onload = () => { gameLoop(); };

