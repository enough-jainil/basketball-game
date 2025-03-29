// --- Global Variables ---
let player;
let basketballs = [];
let obstacles = []; // NEW: Array for obstacles
let scorePopups = []; // NEW: Array for score "+1" effects
let powerups = []; // NEW: Array for power-ups
let hazards = []; // NEW: Array for airborne hazards
let basketsScored = 0;
let canShoot = true;
let basketHoops = [];
let shootCooldown = 0;

let score = 0;
let gameSpeed; // Will be reset
let gravity;
let groundHeight;
let spawnRate; // Will be reset
let obstacleSpawnChance = 0.3; // NEW: 30% chance an obstacle spawns instead of nothing/ball
let powerupSpawnChance = 0.05; // NEW: 5% chance a power-up spawns (adjust as needed)
let hazardSpawnChance = 0.15; // NEW: 15% chance a hazard spawns (adjust as needed)

// NEW: Power-up State Variables
let isInvincible = false;
let invincibilityTimer = 0;
const INVINCIBILITY_DURATION = 300; // 5 seconds at 60fps

// NEW: Game State Management
let gameState = 'start'; // 'start', 'playing', 'gameOver'

// NEW: Difficulty Caps
const MAX_GAME_SPEED = 10;
const MIN_SPAWN_RATE = 40; // Minimum frames between spawns

// Add to global variables
let courtFeatures = [];
let featureTypes = ['scoreboard', 'crowd', 'bench'];

// Add these global variables at the top
let scaleFactor = 1;
let baseWidth = 600;
let baseHeight = 400;

// NEW: Additional Difficulty Variables
let difficultyLevel = 1;
let nextLevelScore = 2; // INCREASED: Start requiring 15 points for level 2
const MAX_DIFFICULTY_LEVEL = 10; // Cap the difficulty level benefits/scaling

// Add to the top of your file after existing global variables
let isMobileDevice = false;

// Create random court features for visual interest
function createCourtFeature() {
    let type = random(featureTypes);
    let featureX = width + random(50, 150) * scaleFactor;
    let yPos;
    
    switch(type) {
        case 'scoreboard':
            yPos = random(height * 0.1, height * 0.3);
            break;
        case 'crowd':
            yPos = height * 0.2;
            break;
        case 'bench':
            yPos = height - groundHeight - 20 * scaleFactor;
            break;
    }
    
    courtFeatures.push({
        type: type,
        x: featureX,
        y: yPos,
        speed: gameSpeed * 0.7, // Move slower than game elements for parallax
        
        update: function() {
            this.x -= this.speed;
            return this.x < -100 * scaleFactor;
        },
        
        show: function() {
            push();
            if (this.type === 'scoreboard') {
                fill(0, 0, 0);
                rect(this.x, this.y, 80 * scaleFactor, 40 * scaleFactor);
                fill(255, 0, 0);
                rect(this.x + 5 * scaleFactor, this.y + 5 * scaleFactor, 
                     70 * scaleFactor, 30 * scaleFactor);
                fill(255);
                textSize(15 * scaleFactor);
                text("SCORE", this.x + 40 * scaleFactor, this.y + 20 * scaleFactor);
            } else if (this.type === 'crowd') {
                // Simple crowd representation
                for (let i = 0; i < 10; i++) {
                    fill(random(100, 255), random(100, 255), random(100, 255));
                    ellipse(this.x + i * 15 * scaleFactor, 
                            this.y + sin(i * 0.5) * 10 * scaleFactor, 
                            12 * scaleFactor, 12 * scaleFactor);
                }
            } else if (this.type === 'bench') {
                fill(150, 75, 0);
                rect(this.x, this.y, 60 * scaleFactor, 15 * scaleFactor);
                fill(120, 60, 0);
                rect(this.x + 5 * scaleFactor, this.y + 15 * scaleFactor, 
                     10 * scaleFactor, 15 * scaleFactor);
                rect(this.x + 45 * scaleFactor, this.y + 15 * scaleFactor, 
                     10 * scaleFactor, 15 * scaleFactor);
            }
            pop();
        }
    });
}

// --- Player Object ---
// (Keep the Player object definition from the previous version)
function setupPlayer() {
    player = {
        x: 100 * scaleFactor,
        y: height - groundHeight - 60 * scaleFactor,
        width: 40 * scaleFactor,
        height: 60 * scaleFactor,
        velocityY: 0,
        lift: -13 * scaleFactor,
        onGround: true,
        canDoubleJump: false, // NEW: Track if double jump is available

        show: function() {
            push(); // Isolate drawing style for player
            // Invincibility Flash Effect
            if (isInvincible && frameCount % 10 < 5) {
                 fill(255, 105, 180, 100); // Semi-transparent Pink
                 stroke(255, 255, 255, 100); // Semi-transparent White outline
            } else {
                 fill(255, 90, 170); // Brighter Pink
                 stroke(255); // White outline/detail color
            }
            strokeWeight(2); // Make outline visible

            // Draw main body
            rect(this.x, this.y, this.width, this.height, 5);

            // Simple "Jersey" stripe
            noStroke();
            fill(255); // White stripe
            rect(this.x, this.y + this.height * 0.4, this.width, this.height * 0.2);

             // Simple face - draw over stripe
            fill(0); // Black for eyes/mouth
            ellipse(this.x + this.width * 0.3, this.y + this.height * 0.3, 5, 7); // Slightly taller eyes
            ellipse(this.x + this.width * 0.7, this.y + this.height * 0.3, 5, 7);
            // Mouth (simple line)
            stroke(0);
            strokeWeight(1.5);
            line(this.x + this.width * 0.4, this.y + this.height * 0.7, this.x + this.width * 0.6, this.y + this.height * 0.7);
            // noFill(); // Not needed if just drawing a line
            // arc(this.x + this.width / 2, this.y + this.height * 0.6, 15, 10, 0, PI); // Removed arc mouth

            pop(); // Restore drawing style
        },

        update: function() {
            this.velocityY += gravity;
            this.y += this.velocityY;

            if (this.y >= height - groundHeight - this.height) {
                this.y = height - groundHeight - this.height;
                this.velocityY = 0;
                this.onGround = true;
                this.canDoubleJump = false; // Reset double jump on landing
            } else {
                this.onGround = false;
            }
        },

        jump: function() {
            if (this.onGround) { // First jump
                this.velocityY = this.lift;
                this.onGround = false;
                this.canDoubleJump = true; // Enable double jump after the first jump
                // NEW: Play jump sound (optional, requires p5.sound)
                // if (jumpSound && jumpSound.isLoaded()) { jumpSound.play(); }
            } else if (this.canDoubleJump) { // Second jump (double jump)
                this.velocityY = this.lift; // Apply lift again
                this.canDoubleJump = false; // Disable double jump until landing again
                 // Optional: Play a different sound for double jump?
                 // if (doubleJumpSound && doubleJumpSound.isLoaded()) { doubleJumpSound.play(); }
            }
        },
        // NEW: Collision check specifically for rectangles
        collidesWithRect: function(otherRect) {
             // Basic Axis-Aligned Bounding Box (AABB) collision
             return (
                this.x < otherRect.x + otherRect.width &&
                this.x + this.width > otherRect.x &&
                this.y < otherRect.y + otherRect.height &&
                this.y + this.height > otherRect.y
             );
        },
        shootBall: function() {
            if (!canShoot || shootCooldown > 0) return;
            
            // Create a shot ball that arcs toward the nearest hoop
            let nearestHoop = null;
            let minDist = Infinity;
            
            for (let hoop of basketHoops) {
                let d = hoop.x - this.x;
                if (d > 0 && d < minDist) {
                    minDist = d;
                    nearestHoop = hoop;
                }
            }
            
            if (nearestHoop) {
                let shotBall = {
                    x: this.x + this.width,
                    y: this.y + this.height * 0.3,
                    targetX: nearestHoop.x + nearestHoop.width * 0.6,
                    targetY: nearestHoop.y,
                    size: 15 * scaleFactor,
                    t: 0,
                    hoop: nearestHoop,
                    
                    update: function() {
                        this.t += 0.05;
                        if (this.t >= 1) {
                            // Check if ball went through hoop
                            if (!this.hoop.scored && 
                                abs(this.x - this.targetX) < 10 * scaleFactor && 
                                abs(this.y - this.targetY) < 10 * scaleFactor) {
                                basketsScored++;
                                score += 3; // 3 points for a basket
                                this.hoop.scored = true;
                                createScorePopup(this.x, this.y, "+3");
                            }
                            return true; // Remove this ball
                        }
                        
                        // Parabolic arc motion
                        this.x = lerp(this.x, this.targetX, this.t);
                        this.y = lerp(this.y, this.targetY, this.t) - sin(this.t * PI) * 100 * scaleFactor;
                        return false;
                    },
                    
                    show: function() {
                        push();
                        fill(255, 120, 0);
                        noStroke();
                        ellipse(this.x, this.y, this.size, this.size);
                        pop();
                    }
                };
                
                shotBalls.push(shotBall);
                canShoot = false;
                shootCooldown = 30; // Cooldown before next shot
            }
        }
    };
}


// --- Basketball Object ---
// (Keep the Basketball object definition, but add score popup creation)
function createBasketball() {
    let basketballSize = 30 * scaleFactor;
    let minY = height * 0.5;
    let maxY = height - groundHeight - basketballSize - 20 * scaleFactor;
    let randomY = random(minY, maxY);

    basketballs.push({
        x: width + basketballSize,
        y: randomY,
        size: basketballSize,
        radius: basketballSize / 2,
        speed: gameSpeed, // Use current gameSpeed

        show: function() {
            push(); // Isolate styles
            // Draw basketball
             fill(255, 120, 0); // Brighter Orange
            noStroke();
            ellipse(this.x, this.y, this.size, this.size);

             // Simple basketball lines
            stroke(0); // Black lines
            strokeWeight(1.5); // Slightly thicker lines
            noFill();
            line(this.x - this.radius, this.y, this.x + this.radius, this.y); // Horizontal
            line(this.x, this.y - this.radius, this.x, this.y + this.radius); // Vertical
            // Curved lines
            arc(this.x, this.y, this.size * 0.8, this.size * 0.8, -QUARTER_PI * 1.2, QUARTER_PI * 1.2);
            arc(this.x, this.y, this.size * 0.8, this.size * 0.8, PI - QUARTER_PI * 1.2, PI + QUARTER_PI * 1.2);
            pop(); // Restore styles
        },

        update: function() {
            this.x -= this.speed; // Move left based on current speed
        },

        collidesWith: function(playerRect) {
            let closestX = constrain(this.x, playerRect.x, playerRect.x + playerRect.width);
            let closestY = constrain(this.y, playerRect.y, playerRect.y + playerRect.height);
            let distanceX = this.x - closestX;
            let distanceY = this.y - closestY;
            let distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
            let collision = distanceSquared < (this.radius * this.radius);

            // *** NEW: Create score popup on collision ***
            if (collision) {
                createScorePopup(this.x, this.y);
                 // NEW: Play collect sound (optional)
                 // if (collectSound && collectSound.isLoaded()) { collectSound.play(); }
            }
            return collision;
        }
    });
}

// --- NEW: Obstacle Object ---
function createObstacle() {
    // Scale all dimensions
    let obstacleWidth = 30 * scaleFactor;
    let obstacleHeight = random(40, 60) * scaleFactor;

    // NEW: Define possible obstacle types
    let possibleTypes = ['cone', 'bottle', 'rack', 'hand'];
    let obstacleType = random(possibleTypes); // Randomly pick a type

    let visualData = {}; // Store visual details specific to the type

    // Set dimensions and visual properties based on type
    switch (obstacleType) {
        case 'bottle':
            visualData.color = color(180, 220, 255, 200); // Light blue, semi-transparent
            visualData.capColor = color(200, 200, 200); // Grey cap
            visualData.labelColor = color(255); // White label
            break;
        case 'rack':
            visualData.color = color(100, 100, 100); // Grey metal
            visualData.ballColor = color(255, 120, 0); // Orange balls
            break;
        case 'hand':
            visualData.color = color(224, 172, 105); // Skin tone (adjust as desired)
            visualData.sleeveColor = color(random(50, 150), random(50, 150), random(50, 150)); // Random sleeve color
            break;
        case 'cone': // Default to cone if needed, or keep specific properties
        default:
             visualData.color = color(255, 100, 0); // Orange
             visualData.stripeColor = color(255); // White
             // Store visual dimensions for the cone
             visualData.baseWidth = obstacleWidth * 1.5;
             visualData.topWidth = obstacleWidth * 0.5;
             break;
    }


    obstacles.push({
        x: width + obstacleWidth, // Position based on calculated width
        y: height - groundHeight - obstacleHeight, // Position on the ground
        width: obstacleWidth, // Used for collision detection
        height: obstacleHeight, // Used for collision detection
        type: obstacleType, // Store the chosen type
        visuals: visualData, // Store the visual properties
        speed: gameSpeed,

        show: function() {
            push(); // Isolate styles
            strokeWeight(1.5);
            stroke(50); // Default dark outline

            // --- Draw based on type ---
            if (this.type === 'cone') {
                fill(this.visuals.color); // Orange color for cone
                stroke(50);
                // Draw a trapezoid/quad for a simple cone shape
                let x1 = this.x - this.visuals.baseWidth / 2 + this.width / 2; // Center the visual shape roughly
                let y1 = this.y + this.height;
                let x2 = this.x + this.visuals.baseWidth / 2 + this.width / 2;
                let y2 = this.y + this.height;
                let x3 = this.x + this.visuals.topWidth / 2 + this.width / 2;
                let y3 = this.y;
                let x4 = this.x - this.visuals.topWidth / 2 + this.width / 2;
                let y4 = this.y;
                quad(x1, y1, x2, y2, x3, y3, x4, y4);

                // White stripes
                noStroke();
                fill(this.visuals.stripeColor);
                let stripeHeight = this.height * 0.15;
                rect(x4 + (x3-x4)*0.1, this.y + this.height * 0.25, (x3-x4)*0.8, stripeHeight);
                rect(x4 + (x3-x4)*0.1, this.y + this.height * 0.6, (x3-x4)*0.8, stripeHeight);

            } else if (this.type === 'bottle') {
                // Main bottle body
                fill(this.visuals.color);
                noStroke();
                rect(this.x, this.y + this.height * 0.1, this.width, this.height * 0.9, 3); // Main part with rounded bottom corners
                // Bottle Cap
                fill(this.visuals.capColor);
                rect(this.x + this.width * 0.2, this.y, this.width * 0.6, this.height * 0.15);
                // Simple label
                fill(this.visuals.labelColor);
                rect(this.x + this.width * 0.1, this.y + this.height * 0.4, this.width * 0.8, this.height * 0.2);

            } else if (this.type === 'rack') {
                // Main rack frame
                fill(this.visuals.color);
                stroke(30);
                rect(this.x, this.y, this.width, this.height, 2);
                // Bars
                line(this.x, this.y + this.height/3, this.x + this.width, this.y + this.height/3);
                line(this.x, this.y + 2*this.height/3, this.x + this.width, this.y + 2*this.height/3);
                // Simple basketballs inside
                fill(this.visuals.ballColor);
                noStroke();
                let ballSize = this.width * 0.25;
                ellipse(this.x + this.width * 0.25, this.y + this.height * 0.2, ballSize, ballSize);
                ellipse(this.x + this.width * 0.75, this.y + this.height * 0.2, ballSize, ballSize);
                ellipse(this.x + this.width * 0.25, this.y + this.height * 0.5, ballSize, ballSize);
                ellipse(this.x + this.width * 0.75, this.y + this.height * 0.5, ballSize, ballSize);
                ellipse(this.x + this.width * 0.5, this.y + this.height * 0.8, ballSize, ballSize);


            } else if (this.type === 'hand') {
                 // Sleeve/Arm part
                 fill(this.visuals.sleeveColor);
                 noStroke();
                 // Draw arm slightly angled - using quad
                 let armWidth = this.width * 0.8;
                 let armTopY = this.y + this.height * 0.3;
                 quad(
                     this.x, this.y + this.height, // Bottom left
                     this.x + armWidth, this.y + this.height, // Bottom right
                     this.x + armWidth * 1.2, armTopY, // Top right (slightly offset)
                     this.x + armWidth * 0.2, armTopY // Top left (slightly offset)
                 );

                 // Hand part
                 fill(this.visuals.color);
                 stroke(50);
                 strokeWeight(1);
                 ellipse(this.x + armWidth * 0.7, armTopY, this.width * 0.9, this.height * 0.5); // Simple oval for hand

            }

            // // Draw original collision box for debugging (optional)
            // noFill();
            // stroke(255, 0, 0);
            // strokeWeight(1);
            // rect(this.x, this.y, this.width, this.height);

            pop(); // Restore styles
        },

        update: function() {
            this.x -= this.speed;
        }
        // Collision with player still uses player.collidesWithRect(this) with this.x,y,width,height
    });
}

// --- NEW: Hazard Object (Bird) ---
function createHazard() {
    let hazardSize = 20 * scaleFactor; // Size of the hazard
    let minHazardY = 50; // Minimum spawn height from top
    let maxHazardY = height * 0.5 - hazardSize; // Max spawn height (above basketballs)
    let randomY = random(minHazardY, maxHazardY);

    hazards.push({
        x: width + hazardSize,
        y: randomY,
        size: hazardSize,
        // Define hitbox dimensions (can be different from visual size)
        hitboxWidth: hazardSize * 1.5, // Wider V shape
        hitboxHeight: hazardSize * 0.8,
        speed: gameSpeed * 1.1, // Maybe make them slightly faster?

        show: function() {
            push();
            translate(this.x, this.y);
            fill(40, 40, 40); // Darker grey/black
            stroke(0);
            strokeWeight(1);
            // Slightly more bird-like shape
            beginShape();
            vertex(0, -this.size * 0.1); // Head point slightly up
            vertex(-this.size / 1.8, this.size / 2.2); // Wing back point
            vertex(0, this.size / 4); // Tail center point
            vertex(this.size / 1.8, this.size / 2.2); // Wing front point
            endShape(CLOSE);

            // Simple eye (optional)
            fill(255, 0, 0); // Red eye
            noStroke();
            ellipse(-this.size * 0.1, 0, 3, 3);
            pop();

            // Optional: Draw hitbox for debugging
            // noFill();
            // stroke(255, 0, 0);
            // rect(this.x - this.hitboxWidth / 2, this.y, this.hitboxWidth, this.hitboxHeight);
        },

        update: function() {
            this.x -= this.speed;
        },

        // Use AABB collision check for the defined hitbox
        collidesWith: function(playerRect) {
            // Calculate hazard's bounding box (centered horizontally, starts at y)
            let hazardLeft = this.x - this.hitboxWidth / 2;
            let hazardRight = this.x + this.hitboxWidth / 2;
            let hazardTop = this.y;
            let hazardBottom = this.y + this.hitboxHeight;

            // Player's bounding box
            let playerLeft = playerRect.x;
            let playerRight = playerRect.x + playerRect.width;
            let playerTop = playerRect.y;
            let playerBottom = playerRect.y + playerRect.height;

            // Check for overlap
            return (
                playerLeft < hazardRight &&
                playerRight > hazardLeft &&
                playerTop < hazardBottom &&
                playerBottom > hazardTop
            );
        }
    });
}

// --- NEW: Power-up Object ---
function createPowerup(x, y, type) {
    let powerupSize = 25 * scaleFactor;
    powerups.push({
        x: x,
        y: y,
        size: powerupSize,
        type: type, // e.g., 'invincibility'
        speed: gameSpeed * 0.8, // Maybe make them move slightly slower?

        show: function() {
            push(); // Isolate drawing styles
            translate(this.x, this.y);
            if (this.type === 'invincibility') {
                fill(255, 230, 0); // Bright Yellow
                stroke(255, 150, 0); // Orange outline
                strokeWeight(1.5);
                // Simple star shape (same as before)
                let angle = TWO_PI / 5;
                let halfAngle = angle / 2.0;
                beginShape();
                for (let a = -PI/2; a < TWO_PI - PI/2; a += angle) {
                    let sx = cos(a) * this.size / 2;
                    let sy = sin(a) * this.size / 2;
                    vertex(sx, sy);
                    sx = cos(a + halfAngle) * this.size / 4; // Inner point
                    sy = sin(a + halfAngle) * this.size / 4;
                    vertex(sx, sy);
                }
                endShape(CLOSE);
            }
            // Add visual representations for other power-up types here later
            pop();
        },

        update: function() {
            this.x -= this.speed;
        },

        // Basic circle collision check (could be improved)
        collidesWith: function(playerRect) {
            let d = dist(this.x, this.y, playerRect.x + playerRect.width / 2, playerRect.y + playerRect.height / 2);
            return d < (this.size / 2 + playerRect.width / 2); // Approximate
        },

        activateEffect: function() {
            if (this.type === 'invincibility') {
                isInvincible = true;
                invincibilityTimer = INVINCIBILITY_DURATION;
                // Optional: Play power-up sound
            }
            // Add effect activation for other types here later
        }
    });
}

// --- NEW: Score Popup Function ---
function createScorePopup(x, y) {
    scorePopups.push({
        x: x,
        y: y,
        text: "+1",
        alpha: 255, // Start fully opaque
        life: 60 // Lifespan in frames (1 second at 60fps)
    });
}

// --- NEW: Level Up Effect Function ---
function createLevelUpEffect() {
    // Create a "LEVEL UP!" popup
    scorePopups.push({
        x: width / 2,
        y: height / 2,
        text: "LEVEL " + difficultyLevel + "!",
        alpha: 255, // Start fully opaque
        life: 90, // Longer life for level up notification
        size: 30 * scaleFactor // Larger text
    });
    
    // Update the score popup display code to handle the size property
    // In the scorePopups update loop:
    /* 
    Push this change to the score popup drawing code in the draw function:
    */
}

// --- p5.js Core Functions ---

// Optional: Preload assets like sounds or images
// let jumpSound, collectSound, gameOverSound;
// function preload() {
//     soundFormats('mp3', 'ogg'); // Specify sound formats
//     jumpSound = loadSound('assets/jump.mp3'); // Replace with your sound file path
//     collectSound = loadSound('assets/collect.mp3');
//     gameOverSound = loadSound('assets/gameover.mp3');
// }

function setup() {
    // Calculate scale factor based on window width, but with a maximum
    // to ensure UI elements don't get cut off
    let maxScaleFactor = min(windowWidth / baseWidth, windowHeight / baseHeight, 1.5); 
    scaleFactor = min(windowWidth / baseWidth, windowHeight / baseHeight, maxScaleFactor);
    
    // Create responsive canvas
    let canvas = createCanvas(baseWidth * scaleFactor, baseHeight * scaleFactor);
    canvas.parent('canvas-container');

    // Check if device is mobile
    isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Adjust padding if on desktop to ensure visibility
    if (!isMobileDevice) {
        let canvasContainer = document.getElementById('canvas-container');
        canvasContainer.style.margin = '20px auto';
    }

    // Text settings
    textAlign(CENTER, CENTER);
    textFont('monospace');
    
    // Scale all measurements
    groundHeight = 50 * scaleFactor;
    gravity = 0.5 * scaleFactor;

    // Call resetGame() to initialize variables
    resetGame();

    // Update control instructions based on device
    if (isMobileDevice) {
        document.getElementById('mobile-controls').style.display = 'inline';
        document.getElementById('desktop-controls').style.display = 'none';
    } else {
        document.getElementById('mobile-controls').style.display = 'none';
        document.getElementById('desktop-controls').style.display = 'inline';
    }
}

// Add window resize handler
function windowResized() {
    // Recalculate scale factor
    let maxScaleFactor = min(windowWidth / baseWidth, windowHeight / baseHeight, 1.5);
    scaleFactor = min(windowWidth / baseWidth, windowHeight / baseHeight, maxScaleFactor);
    
    // Resize canvas
    resizeCanvas(baseWidth * scaleFactor, baseHeight * scaleFactor);
    
    // Adjust ground height and other scaled values
    groundHeight = 50 * scaleFactor;
    gravity = 0.5 * scaleFactor;
    
    // Update player position and size
    if (player) {
        player.width = 40 * scaleFactor;
        player.height = 60 * scaleFactor;
        player.lift = -13 * scaleFactor;
        // Keep player on ground
        player.y = height - groundHeight - player.height;
    }
}

// --- NEW: Reset Game Function ---s
function resetGame() {
    score = 0;
    basketballs = [];
    obstacles = [];
    scorePopups = [];
    powerups = [];
    hazards = []; // Clear hazards array

    gameSpeed = 4;
    spawnRate = 90;

    // Reset power-up states
    isInvincible = false;
    invincibilityTimer = 0;
    // Reset other power-up states here later

    // Re-create the player object to reset its position and velocity
    setupPlayer();

    gameState = 'playing'; // Start the game immediately after reset
    loop(); // Ensure the draw loop is running if it was stopped
}

// --- NEW: Game Over Function ---
function triggerGameOver() {
    gameState = 'gameOver';
     // NEW: Play game over sound (optional)
     // if (gameOverSound && gameOverSound.isLoaded()) { gameOverSound.play(); }
    noLoop(); // Stop the draw loop to freeze the game
}


function draw() {
    background(100, 180, 255); // Slightly different Sky blue

    // Draw ground - change to look like pavement/court
    fill(100, 105, 110); // Grey pavement color
    noStroke();
    rect(0, height - groundHeight, width, groundHeight);
     // Optional: Add court line
     stroke(255); // White line
     strokeWeight(3);
     line(0, height - groundHeight, width, height - groundHeight);
     noStroke();

    // Scale text sizes
    textSize(20 * scaleFactor);
    // For game over screen
    textSize(48 * scaleFactor);
    textSize(24 * scaleFactor);
    textSize(18 * scaleFactor);

    // --- Game State Logic ---
    if (gameState === 'playing') {
        // --- Update Power-up Effects ---
        if (isInvincible) {
            invincibilityTimer--;
            if (invincibilityTimer <= 0) {
                isInvincible = false;
            }
        }
        // Add timers for other power-ups here

        // --- Player Logic ---
        player.show();
        player.update();

        // --- Spawning Logic ---
        if (frameCount % floor(spawnRate) === 0) {
            let r = random(1);
            let spawnType = 'none';
            let cumulativeChance = 0;

            // Determine spawn type based on cumulative chances
            cumulativeChance += powerupSpawnChance;
            if (r < cumulativeChance) {
                spawnType = 'powerup';
            } else {
                cumulativeChance += hazardSpawnChance; // Add hazard chance
                if (r < cumulativeChance) {
                    spawnType = 'hazard';
                } else {
                    cumulativeChance += obstacleSpawnChance;
                    if (r < cumulativeChance) {
                        spawnType = 'obstacle';
                    } else if (r > cumulativeChance + 0.1) { // Gap ensures some frames have no spawn
                        spawnType = 'basketball';
                    }
                }
            }


            // Check spacing before spawning (include hazards)
            let lastBallX = basketballs.length > 0 ? basketballs[basketballs.length - 1].x : -Infinity;
            let lastObsX = obstacles.length > 0 ? obstacles[obstacles.length - 1].x : -Infinity;
            let lastPowerupX = powerups.length > 0 ? powerups[powerups.length - 1].x : -Infinity;
            let lastHazardX = hazards.length > 0 ? hazards[hazards.length - 1].x : -Infinity; // Check last hazard X
            let lastItemX = max(lastBallX, lastObsX, lastPowerupX, lastHazardX); // Include hazards
            
            // NEW: Adjust safe spawn distance based on level (subtle)
            let safeSpawnDist = width * (0.2 - (difficultyLevel -1) * 0.005); // Decrease slightly per level
            safeSpawnDist = max(safeSpawnDist, width * 0.1); // Ensure minimum distance

            if (width - lastItemX > safeSpawnDist) {
                 let spawnY = random(height * 0.4, height - groundHeight - 60); // Default Y
                 
                 // NEW: Max items scale with difficulty
                 let maxPowerups = 1; // Keep powerups rare
                 let maxHazards = min(2 + floor(difficultyLevel / 2), 5); // Increase max hazards with level, cap at 5
                 let maxObstacles = min(3 + difficultyLevel, 8);      // Increase max obstacles with level, cap at 8

                 if (spawnType === 'powerup' && powerups.length < maxPowerups) {
                    createPowerup(width + 30, spawnY, 'invincibility');
                 } else if (spawnType === 'hazard' && hazards.length < maxHazards) {
                    createHazard(); // Uses its own Y calculation
                 } else if (spawnType === 'obstacle' && obstacles.length < maxObstacles) {
                    createObstacle(); // Uses its own Y calculation
                 } else if (spawnType === 'basketball') {
                    createBasketball(); // Uses its own Y calculation
                 }
            }

            // --- Difficulty Increase (Time-based) ---
            if (spawnRate > MIN_SPAWN_RATE) {
                spawnRate -= 0.2; // Decrease time between spawns
                spawnRate = max(spawnRate, MIN_SPAWN_RATE); // Ensure it doesn't go below min
            }
            if (gameSpeed < MAX_GAME_SPEED) {
                gameSpeed += 0.02; // Increase speed
                gameSpeed = min(gameSpeed, MAX_GAME_SPEED); // Ensure it doesn't exceed max
            }
            
            // --- Difficulty Increase (Score/Level-based) ---
            if (score >= nextLevelScore && difficultyLevel < MAX_DIFFICULTY_LEVEL) { // Added level cap check
                difficultyLevel++;
                // IMPROVED: Calculate next score threshold based on the new level
                // Formula: Base + (Level * Multiplier) - Adjust base/multiplier to tune difficulty curve
                let baseRequirement = 10; 
                let pointsPerLevel = 15;
                nextLevelScore = baseRequirement + (difficultyLevel * pointsPerLevel); 
                // Example Progression:
                // Lvl 2 needs 10 + (2*15) = 40 total score
                // Lvl 3 needs 10 + (3*15) = 55 total score
                // Lvl 4 needs 10 + (4*15) = 70 total score ... etc.
                // This creates increasing gaps but is calculated absolutely each time.
                
                // Boost game speed on level up
                gameSpeed = min(gameSpeed + 0.5, MAX_GAME_SPEED);
                
                // Increase spawn chances for obstacles and hazards (capped)
                obstacleSpawnChance = min(obstacleSpawnChance + 0.04, 0.6); // Slightly less increase, higher cap
                hazardSpawnChance = min(hazardSpawnChance + 0.02, 0.35); // Slightly less increase, higher cap
                
                // NEW: Decrease powerup spawn chance (capped)
                powerupSpawnChance = max(powerupSpawnChance - 0.005, 0.02); // Decrease chance, minimum 2%

                // Visual feedback for level up
                createLevelUpEffect();
            }
        }

        // --- Update & Draw Hazards ---
        for (let i = hazards.length - 1; i >= 0; i--) {
            let h = hazards[i];
            // NEW: Hazard speed increases slightly with level
            let hazardSpeedMultiplier = 1.1 + (difficultyLevel - 1) * 0.05; // Base 1.1x, +0.05x per level
            h.speed = gameSpeed * min(hazardSpeedMultiplier, 1.6); // Update speed dynamically, cap multiplier
            h.show(); // Draw the updated hazard look
            h.update();

            // Check collision with player ONLY if NOT invincible
            if (!isInvincible && h.collidesWith(player)) { // Use hazard's collision check
                triggerGameOver(); // End the game
                break; // Exit loop after game over
            }

            // Remove if off-screen
            if (h.x < -h.size) { // Use size for off-screen check
                hazards.splice(i, 1);
            }
        }

        // --- Update & Draw Powerups ---
        for (let i = powerups.length - 1; i >= 0; i--) {
            let p = powerups[i];
            p.speed = gameSpeed * 0.8; // Update speed if gameSpeed changes
            p.show(); // Draw the updated powerup look
            p.update();

            if (p.collidesWith(player)) {
                p.activateEffect();
                powerups.splice(i, 1); // Remove collected powerup
            } else if (p.x < -p.size) {
                powerups.splice(i, 1); // Remove if off-screen
            }
        }

        // --- Update & Draw Basketballs ---
        for (let i = basketballs.length - 1; i >= 0; i--) {
            let b = basketballs[i];
            b.speed = gameSpeed; // Update speed dynamically
            b.show(); // Draw the updated basketball look
            b.update();

            if (b.collidesWith(player)) {
                score++;
                basketballs.splice(i, 1);
            } else if (b.x < -b.size) {
                basketballs.splice(i, 1);
            }
        }

        // --- Update & Draw Obstacles ---
        for (let i = obstacles.length - 1; i >= 0; i--) {
            let o = obstacles[i];
            o.speed = gameSpeed; // Update speed dynamically
            o.show(); // Draw the updated obstacle look
            o.update();

            // Check collision with player ONLY if NOT invincible
            if (!isInvincible && player.collidesWithRect(o)) { // MODIFIED Check
                triggerGameOver(); // End the game
                // Break immediately after game over to prevent further checks in the same frame
                break;
            }

            // Remove if off-screen
            if (o.x < -o.width) {
                obstacles.splice(i, 1);
            }
        }

         // --- Update & Draw Score Popups ---
         for (let i = scorePopups.length - 1; i >= 0; i--) {
            let p = scorePopups[i];
            p.y -= 1 * scaleFactor; // Scale movement slightly
            p.alpha -= 4; // Fade out
            p.life--;

            if (p.life <= 0) {
                scorePopups.splice(i, 1);
            } else {
                push(); // Save current drawing style
                fill(255, 255, 255, p.alpha); // White text, fading out
                // Use scaled size if available, otherwise default
                textSize( (p.size || 16 * scaleFactor) ); 
                textAlign(CENTER, CENTER);
                noStroke();
                text(p.text, p.x, p.y);
                pop(); // Restore drawing style
            }
        }


        // --- Draw Score and Level (Playing State) ---
        fill(255);
        stroke(0);
        strokeWeight(2 * scaleFactor); // Scale stroke weight
        textAlign(LEFT, TOP); // Reset alignment for score
        textSize(20 * scaleFactor); // Scale text size
        text("Score: " + score, 10 * scaleFactor, 10 * scaleFactor);
        // NEW: Show current level
        text("Level: " + difficultyLevel, 10 * scaleFactor, (10 + 25) * scaleFactor);
        // NEW: Show speed indicator
        text("Speed: " + gameSpeed.toFixed(1), 10 * scaleFactor, (10 + 50) * scaleFactor);
        noStroke();


    } else if (gameState === 'gameOver') {
        // --- Draw Game Over Screen ---
        fill(0, 0, 0, 150); // Semi-transparent black overlay
        rect(0, 0, width, height);

        fill(255); // White text
        stroke(0);
        strokeWeight(3);
        textAlign(CENTER, CENTER);

        textSize(48);
        text("GAME OVER", width / 2, height / 2 - 40);

        textSize(24);
        text("Final Score: " + score, width / 2, height / 2 + 10);

        textSize(18 * scaleFactor);
        if (isMobileDevice) {
            text("Tap to Restart", width / 2, height / 2 + 50 * scaleFactor);
        } else {
            text("Press 'R' or SPACE to Restart", width / 2, height / 2 + 50 * scaleFactor);
        }
        noStroke();

        // We use noLoop() in gameOver, so draw only runs once.
        // The game is effectively paused.
    }
     else if (gameState === 'start') {
         // --- Draw Start Screen (Optional, currently skips straight to playing) ---
         // You could add a start screen here if desired, similar to gameOver.
         // For now, resetGame() sets state to 'playing'.
         // Example:
         // fill(0, 0, 0, 150);
         // rect(0, 0, width, height);
         // fill(255);
         // textAlign(CENTER, CENTER);
         // textSize(32);
         // text("Basketball Collector", width / 2, height / 2 - 30);
         // textSize(20);
         // text("Press SPACE or UP to Start", width / 2, height / 2 + 20);
    }
}

// --- Handle Input ---
function keyPressed() {
    if (gameState === 'playing') {
        if (key === ' ' || keyCode === UP_ARROW || keyCode === 87) { // Space, Up Arrow, or W
            player.jump();
            return false; // Prevent default
        }
    } else if (gameState === 'gameOver') {
        if (key === 'r' || key === 'R' || key === ' ' || keyCode === UP_ARROW) {
            resetGame(); // Restart the game
            return false; // Prevent default
        }
    } else if (gameState === 'start') {
        if (key === ' ' || keyCode === UP_ARROW) {
            resetGame(); // Start the game
            return false; // Prevent default
        }
    }
    return true;
}

// Improve touchStarted function
function touchStarted() {
    if (gameState === 'playing') {
        player.jump();
    } else if (gameState === 'gameOver' || gameState === 'start') {
        resetGame();
    }
    return false; // Prevent default browser behavior
}

// Add mousePressed for desktop clicks
function mousePressed() {
    if (!isMobileDevice) { // Only handle mouse on non-mobile devices
        if (gameState === 'playing') {
            player.jump();
        } else if (gameState === 'gameOver' || gameState === 'start') {
            resetGame();
        }
        return false;
    }
    return true;
}