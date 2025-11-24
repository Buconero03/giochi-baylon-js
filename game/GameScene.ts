
import * as BABYLON from '@babylonjs/core';
import { GameState } from '../types';

interface GameCallbacks {
  onGameStateChange: (state: GameState) => void;
  onScoreUpdate: (score: number) => void;
  onTimeUpdate: (time: number) => void;
  onLevelUpdate?: (level: number) => void;
}

interface EnemyMetadata {
  type: 'enemy';
  dead: boolean;
  direction: number;
  speed: number;
  initialPos: BABYLON.Vector3;
  animTime: number; 
}

interface BlockMetadata {
    type: 'question' | 'brick' | 'ground';
    active: boolean;
    originalY: number;
}

const LEVEL_MAPS = [
    // LEVEL 1
    [
        ".......................................................................................................................................................................................................................................................",
        ".......................................................................................................................................................................................................................................................",
        "..............................................................................................................................................................................................................................................F........",
        "...................................................................C.C.C........................................................................C..........................................................................................###.......",
        "..................................................................#######..................................................###.......C.C.......###.C...................................................................C....C......##...####.......",
        "....................................................C.C.........................................C........C................#####.....#####.....#####.C.....E.......E.....................E...............E......E......###..###..E.#####..#####.......",
        "..........................................?.......#######.......?.........?...................#####....#####.....T........#######...#######...#######...#####...#####...T...........#########.......#########.......####..####..#######..######......",
        "................C.......................#####.................#####.....#####.......T.........#####....#####.....T........#######...#######...#######...#####...#####...T...........#########.......#########......#####..#####..######..#######.....",
        "....P.........#####...........?........#######...............#######...#######......T.........#####....#####.....T........#######...#######...#######...#####...#####...T...........#########.......#########.....######..######..#####..########....",
        "#################################################################################################################################...#################...#########################################################################################....",
        "#################################################################################################################################...#################...#########################################################################################...."
    ],
    // LEVEL 2
    [
        "#######################################################################################################################################################################################################################################################",
        "#######################################################################################################################################################################################################################################################",
        ".......................................................................................................................................................................................................................................................",
        ".......................................................................................................................................................................................................................................................",
        ".......C.C.C................C.......................................................C.C...................C.C.................................................................................................................................F........",
        "......#######..............###.....................................................#####.................#####..................................###...###...###..........................................C.C..................................###.......",
        "..........................#####......................C.C...........###............#######...............#######...............###...............###...###...###...............###.......###............#######.......E.......E.......E.......####.......",
        ".........................#######.......###..........#####.........#####..........#########.....###.....#########.....###.....#####.....###......###...###...###......###.....#####.....#####..........#########...#######...#######...#######..#####.......",
        "....P...................#########.....#####........#######.......#######........###########...#####...###########...#####...#######...#####.....###...###...###.....#####...#######...#######........###########..#######...#######...#######..######......",
        "#######.......######...###########...#######......#########.....#########......#############.#######.#############.#######.#########.#######.......................#######.#########.#########......#############.#######...#######...#######..#######.....",
        "#######.......######...###########...#######......#########.....#########......#############.#######.#############.#######.#########.#######.......................#######.#########.#########......#############.#######...#######...#######..########...."
    ],
    // LEVEL 3
    [
        ".......................................................................................................................................................................................................................................................",
        ".......................................................................................................................................................................................................................................................",
        "..............................................................................................................................................................................................................................................F........",
        ".......................................................................................................................................................................................................................................................",
        ".....................................................................C.....................C.................................C..........###.........###########.....................###.......................C.............E.......E.......####.......",
        ".......................................................###..........###.........###.......###..........###.........###......###......................................###...........#####..........###........###...........###.....###......#####.......",
        "..........................................###.....................................................................................................................................#######...................#####..........................######......",
        "..............C...........###....................................................................................................................................................#########.................#######........................#######......",
        "....P.......#####...............................................................................................................................................................###########...............#########......................########......",
        "#######...#########...#############...###########...#########...#############...###...#############...#########...#########...###...#########...###################...#######...#############...#######...###########...#############...###########......",
        "......................................................................................................................................................................................................................................................."
    ]
];

export class GameScene {
  private engine: BABYLON.Engine;
  private scene: BABYLON.Scene;
  private canvas: HTMLCanvasElement;
  private callbacks: GameCallbacks;

  private playerMesh: BABYLON.Mesh | null = null; 
  private playerSprite: BABYLON.Sprite | null = null;
  private playerManager: BABYLON.SpriteManager | null = null;
  
  private camera: BABYLON.UniversalCamera | null = null;
  private shadowGenerator: BABYLON.ShadowGenerator | null = null;
  
  private levelContainer: BABYLON.TransformNode | null = null;
  private backgroundContainer: BABYLON.TransformNode | null = null;
  private coins: BABYLON.Mesh[] = [];
  private enemies: BABYLON.Mesh[] = [];
  
  // Custom Collision Grid
  private solidTiles: Set<string> = new Set();
  private blockMeshes: Map<string, BABYLON.Mesh> = new Map();

  private dustParticleSystem: BABYLON.ParticleSystem | null = null;
  private coinParticleSystem: BABYLON.ParticleSystem | null = null;
  
  private score: number = 0;
  private timeRemaining: number = 400; 
  private currentGameState: GameState = GameState.MENU;
  private currentLevelIndex: number = 0;
  
  // Physics Constants
  private readonly GRAVITY = -65.0; 
  private readonly MOVE_SPEED = 10.0; 
  private readonly JUMP_FORCE = 24.0; 
  private readonly ACCELERATION = 40.0;
  private readonly FRICTION = 25.0;
  private readonly MAX_FALL_SPEED = -30.0;
  
  private playerVelocity = new BABYLON.Vector3(0, 0, 0);
  private isGrounded = false;
  private facingRight = true;
  
  // Hitbox Dimensions
  private readonly PLAYER_WIDTH = 0.5;
  private readonly PLAYER_HEIGHT = 0.9;
  
  private animTimer = 0;
  private animFrame = 0;
  private runDustTimer = 0;

  private coyoteTimeCounter = 0;
  private readonly COYOTE_TIME = 0.1; 
  private jumpBufferCounter = 0;
  private readonly JUMP_BUFFER = 0.15; 
  private isJumping = false;

  private inputMap: { [key: string]: boolean } = {};
  private materials: { [key: string]: BABYLON.StandardMaterial } = {};

  constructor(engine: BABYLON.Engine, canvas: HTMLCanvasElement, callbacks: GameCallbacks) {
    this.engine = engine;
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.scene = new BABYLON.Scene(this.engine);
    
    this.setupScene();
    this.setupInputs();
    
    this.scene.onBeforeRenderObservable.add(() => {
      this.update();
    });
  }

  private setupScene() {
    this.scene.clearColor = new BABYLON.Color4(0.36, 0.58, 0.98, 1); 
    
    this.camera = new BABYLON.UniversalCamera("camera", new BABYLON.Vector3(0, 5, -22), this.scene);
    this.camera.fov = 0.5;
    
    const hemiLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), this.scene);
    hemiLight.intensity = 0.7;
    
    const dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-0.5, -0.8, -0.2), this.scene);
    dirLight.position = new BABYLON.Vector3(20, 50, 10);
    dirLight.intensity = 0.8;
    this.shadowGenerator = new BABYLON.ShadowGenerator(1024, dirLight);

    this.createMaterials();
    this.createPlayerSprites();
    this.createParticles();
    this.createPlayer();
  }

  private createParticles() {
    const particleTexture = new BABYLON.DynamicTexture("pTex", {width:32, height:32}, this.scene, false);
    const ctx = particleTexture.getContext();
    ctx.beginPath();
    ctx.arc(16, 16, 10, 0, Math.PI*2);
    ctx.fillStyle = "white";
    ctx.fill();
    particleTexture.update();

    this.dustParticleSystem = new BABYLON.ParticleSystem("dust", 100, this.scene);
    this.dustParticleSystem.particleTexture = particleTexture;
    this.dustParticleSystem.emitter = new BABYLON.Vector3(0,0,0);
    this.dustParticleSystem.minEmitBox = new BABYLON.Vector3(-0.2, 0, 0);
    this.dustParticleSystem.maxEmitBox = new BABYLON.Vector3(0.2, 0, 0);
    this.dustParticleSystem.color1 = new BABYLON.Color4(1, 1, 1, 0.8);
    this.dustParticleSystem.color2 = new BABYLON.Color4(1, 1, 1, 0.2);
    this.dustParticleSystem.minSize = 0.1;
    this.dustParticleSystem.maxSize = 0.3;
    this.dustParticleSystem.minLifeTime = 0.3;
    this.dustParticleSystem.maxLifeTime = 0.6;
    this.dustParticleSystem.emitRate = 0;
    this.dustParticleSystem.direction1 = new BABYLON.Vector3(-1, 0.5, 0);
    this.dustParticleSystem.direction2 = new BABYLON.Vector3(1, 1, 0);
    this.dustParticleSystem.gravity = new BABYLON.Vector3(0, 2, 0);
    this.dustParticleSystem.start();

    this.coinParticleSystem = new BABYLON.ParticleSystem("sparkle", 50, this.scene);
    this.coinParticleSystem.particleTexture = particleTexture;
    this.coinParticleSystem.emitter = new BABYLON.Vector3(0,0,0);
    this.coinParticleSystem.color1 = new BABYLON.Color4(1, 1, 0, 1.0);
    this.coinParticleSystem.color2 = new BABYLON.Color4(1, 0.8, 0.2, 0.0);
    this.coinParticleSystem.minSize = 0.1;
    this.coinParticleSystem.maxSize = 0.2;
    this.coinParticleSystem.minLifeTime = 0.3;
    this.coinParticleSystem.maxLifeTime = 0.5;
    this.coinParticleSystem.emitRate = 0;
    this.coinParticleSystem.direction1 = new BABYLON.Vector3(-1, -1, -1);
    this.coinParticleSystem.direction2 = new BABYLON.Vector3(1, 1, 1);
    this.coinParticleSystem.minEmitPower = 2;
    this.coinParticleSystem.maxEmitPower = 4;
    this.coinParticleSystem.start();
  }

  private createPlayerSprites() {
    const dynamicTexture = new BABYLON.DynamicTexture("marioTexture", { width: 256, height: 64 }, this.scene, false);
    const ctx = dynamicTexture.getContext();
    ctx.clearRect(0, 0, 256, 64);
    const size = 4;

    const draw = (x: number, y: number, color: string, offsetX: number) => {
        ctx.fillStyle = color;
        const flippedY = 15 - y;
        ctx.fillRect(offsetX + x * size, flippedY * size, size, size);
    };

    const C = { R: '#E3001B', B: '#2144C6', S: '#FFCAB0', K: '#4B2E0B', W: '#FFFFFF', Y: '#FFD700', M: 'black' };
    const sprites = {
        idle: ["................",".....RRRRR......","....RRRRRRRRR...","....KKKSSSM.....","....KKSSMME.....","....KKSSMME.....","....KKSSSS......","......RRR.......","...RRRBRB......","..RRRRBBBBRRR...","..WW..BYYB..WW..","..WW..BBBB..WW..","......BBBB......",".....BB..BB.....","....KKK..KKK....","................"],
        run1: ["................",".....RRRRR......","....RRRRRRRRR...","....KKKSSSM.....","....KKSSMME.....","....KKSSMME.....","....KKSSSS......","......RRR.......","..RRRBBBBRRR....",".RRRRBBBBRRRR...",".WW...BYYB..WW..","......BBBB......",".....BB..BB.....","....KK....KK....","...KK......KK...","................"],
        run2: ["................",".....RRRRR......","....RRRRRRRRR...","....KKKSSSM.....","....KKSSMME.....","....KKSSMME.....","....KKSSSS......","......RRR.......","...RRBBBBBRR....","..RRRBBBBRRR....","..WW.BYYB..WW...",".....BBBB.......","....BB..BB......","...KKK..KKK.....","................","................"],
        jump: ["................",".....RRRRR......","....RRRRRRRRR...","....KKKSSSM.....","....KKSSMME.....","....KKSSMME.....","....KKSSSS......","......RRR.......","..RR.BBBB.RR....",".WW..BYYB..WW...",".....BBBB.......","....BB..BB......","...BB....BB.....","..K........K....","................","................"]
    };

    const render = (map: string[], offset: number) => {
        map.forEach((row, y) => {
            row.split('').forEach((char, x) => {
                const color = (C as any)[char];
                if (color) draw(x, y, color, offset);
            });
        });
    };

    render(sprites.idle, 0);
    render(sprites.run1, 64);
    render(sprites.jump, 128);
    render(sprites.run2, 192);

    dynamicTexture.update();
    this.playerManager = new BABYLON.SpriteManager("playerManager", "", 1, { width: 64, height: 64 }, this.scene);
    this.playerManager.texture = dynamicTexture;
  }

  private createMaterials() {
    const createMat = (name: string, color: BABYLON.Color3) => {
        const mat = new BABYLON.StandardMaterial(name, this.scene);
        mat.diffuseColor = color;
        mat.specularPower = 0; 
        return mat;
    };

    this.materials.enemy = createMat("enemy", new BABYLON.Color3(0.6, 0.2, 0.2));
    this.materials.ground = createMat("ground", new BABYLON.Color3(0.5, 0.25, 0.1));
    this.materials.question = createMat("question", new BABYLON.Color3(0.95, 0.75, 0.1));
    this.materials.questionEmpty = createMat("questionEmpty", new BABYLON.Color3(0.5, 0.4, 0.2));
    this.materials.pipe = createMat("pipe", new BABYLON.Color3(0.1, 0.8, 0.1));
    this.materials.grass = createMat("grass", new BABYLON.Color3(0.2, 0.9, 0.2));
    this.materials.coin = createMat("coin", new BABYLON.Color3(1, 0.9, 0));
    this.materials.coin.emissiveColor = new BABYLON.Color3(0.4, 0.4, 0);
    this.materials.finish = createMat("finish", new BABYLON.Color3(0.1, 0.8, 0.1));
    this.materials.cloud = createMat("cloud", new BABYLON.Color3(0.9, 0.95, 1));
    this.materials.hill = createMat("hill", new BABYLON.Color3(0.1, 0.5, 0.2));
  }

  private createPlayer() {
    // Hitbox is purely visual/logical anchor now, not used for engine physics
    this.playerMesh = BABYLON.MeshBuilder.CreateBox("playerHitbox", { width: this.PLAYER_WIDTH, height: this.PLAYER_HEIGHT, depth: 0.5 }, this.scene);
    this.playerMesh.position.set(0, 10, 0); 
    this.playerMesh.isVisible = false;
    
    if (this.playerManager) {
        this.playerSprite = new BABYLON.Sprite("playerSprite", this.playerManager);
        this.playerSprite.width = 1.6;
        this.playerSprite.height = 1.6;
        this.playerSprite.position = this.playerMesh.position.clone();
    }
  }

  private clearCurrentLevel() {
    if (this.levelContainer) {
        this.levelContainer.dispose();
        this.levelContainer = null;
    }
    if (this.backgroundContainer) {
        this.backgroundContainer.dispose();
        this.backgroundContainer = null;
    }
    this.coins = [];
    this.enemies = [];
    this.solidTiles.clear();
    this.blockMeshes.clear();
  }

  private loadLevel(levelIndex: number) {
    this.clearCurrentLevel();
    this.currentLevelIndex = levelIndex;
    
    if (this.callbacks.onLevelUpdate) this.callbacks.onLevelUpdate(levelIndex + 1);

    if (levelIndex >= LEVEL_MAPS.length) {
        this.currentGameState = GameState.VICTORY;
        this.callbacks.onGameStateChange(GameState.VICTORY);
        return;
    }

    if (levelIndex === 1) { 
        this.scene.clearColor = new BABYLON.Color4(0.05, 0.05, 0.1, 1);
    } else {
        this.scene.clearColor = new BABYLON.Color4(0.36, 0.58, 0.98, 1);
    }

    this.levelContainer = new BABYLON.TransformNode("levelContainer", this.scene);
    this.backgroundContainer = new BABYLON.TransformNode("bgContainer", this.scene);

    const map = LEVEL_MAPS[levelIndex];
    let levelWidth = 0;

    for (let row = 0; row < map.length; row++) {
        const y = (map.length - 1 - row) * 1; 
        const line = map[row];
        if (line.length > levelWidth) levelWidth = line.length;

        for (let col = 0; col < line.length; col++) {
            const char = line[col];
            
            if (char === '#') {
                let length = 1;
                while (col + length < line.length && line[col + length] === '#') {
                    length++;
                }
                const startX = col * 1;
                const width = length * 1;
                this.spawnMergedBlock(startX + width / 2 - 0.5, y, width, 'ground');
                
                // Add to collision grid
                for (let k = 0; k < length; k++) {
                    this.solidTiles.add(`${col + k},${y}`);
                }
                
                col += length - 1;
            } else if (char === '?') {
                 this.spawnBlock(col, y, 'question');
                 this.solidTiles.add(`${col},${y}`);
            } else if (char === 'T') {
                 this.spawnBlock(col, y, 'pipe');
                 this.solidTiles.add(`${col},${y}`);
            } else if (char === 'P') {
                 this.resetPlayer(col, y);
            } else if (char === 'E') {
                 this.spawnEnemy(col, y);
            } else if (char === 'C') {
                 this.spawnCoin(col, y);
            } else if (char === 'F') {
                 this.spawnFlag(col, y);
            }
        }
    }

    this.createDecorations(levelWidth);
  }

  private createDecorations(width: number) {
    if (this.currentLevelIndex === 1) return; 

    for (let i = 0; i < width; i += Math.random() * 8 + 4) {
        const y = Math.random() * 6 + 9;
        const cloud = BABYLON.MeshBuilder.CreateBox("cloud", {width: Math.random() * 3 + 2, height: 1, depth: 1}, this.scene);
        cloud.position.set(i, y, 5 + Math.random() * 5); 
        cloud.material = this.materials.cloud;
        cloud.parent = this.backgroundContainer;
    }

    for (let i = 0; i < width; i += Math.random() * 12 + 6) {
        const h = Math.random() * 5 + 4;
        const hill = BABYLON.MeshBuilder.CreateSphere("hill", {diameter: h * 2, segments: 16}, this.scene);
        hill.position.set(i, -2, 4 + Math.random() * 3);
        hill.scaling.y = 0.5; 
        hill.material = this.materials.hill;
        hill.parent = this.backgroundContainer;
    }
  }

  private spawnMergedBlock(centerX: number, y: number, width: number, type: 'ground') {
    const box = BABYLON.MeshBuilder.CreateBox("box", { width: width, height: 1, depth: 1 }, this.scene);
    box.position.set(centerX, y, 0);
    box.receiveShadows = true;
    box.parent = this.levelContainer;
    box.material = this.materials.ground;

    const grass = BABYLON.MeshBuilder.CreatePlane("grass", { width: width, height: 1 }, this.scene);
    grass.rotation.x = Math.PI / 2;
    grass.position.set(0, 0.501, 0);
    grass.material = this.materials.grass;
    grass.parent = box;
  }

  private spawnBlock(x: number, y: number, type: 'ground' | 'question' | 'pipe') {
    const box = BABYLON.MeshBuilder.CreateBox("box", { width: 1, height: 1, depth: 1 }, this.scene);
    box.position.set(x, y, 0);
    box.receiveShadows = true;
    box.parent = this.levelContainer;

    if (type === 'ground') {
        box.material = this.materials.ground;
    } else if (type === 'question') {
        box.material = this.materials.question;
        box.metadata = { type: 'question', active: true, originalY: y } as BlockMetadata;
        this.blockMeshes.set(`${x},${y}`, box);
    } else if (type === 'pipe') {
        box.material = this.materials.pipe;
        box.scaling.x = 0.95; 
    }
    return box;
  }

  private spawnCoin(x: number, y: number) {
    const coin = BABYLON.MeshBuilder.CreateCylinder("coin", { diameter: 0.6, height: 0.05, tessellation: 16 }, this.scene);
    coin.rotation.x = Math.PI / 2;
    coin.position.set(x, y, 0);
    coin.material = this.materials.coin;
    coin.parent = this.levelContainer;
    coin.metadata = { collected: false };
    
    const anim = new BABYLON.Animation("spin", "rotation.y", 60, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
    anim.setKeys([{ frame: 0, value: 0 }, { frame: 60, value: Math.PI * 2 }]);
    coin.animations.push(anim);
    this.scene.beginAnimation(coin, 0, 60, true);
    
    this.coins.push(coin);
  }

  private spawnEnemy(x: number, y: number) {
     const enemy = BABYLON.MeshBuilder.CreateSphere("enemy", { diameter: 0.8, segments: 16 }, this.scene);
     enemy.scaling.y = 0.8; 
     enemy.position.set(x, y, 0);
     enemy.material = this.materials.enemy;
     enemy.parent = this.levelContainer;
     
     const eyeL = BABYLON.MeshBuilder.CreatePlane("eye", { size: 0.2 }, this.scene);
     eyeL.position.set(-0.2, 0.2, -0.35);
     eyeL.parent = enemy;
     eyeL.material = new BABYLON.StandardMaterial("white", this.scene);
     const eyeR = eyeL.clone("eyeR");
     eyeR.position.set(0.2, 0.2, -0.35);
     
     enemy.metadata = {
         type: 'enemy',
         dead: false,
         direction: -1,
         speed: 3.5, 
         initialPos: new BABYLON.Vector3(x, y, 0),
         animTime: 0
     } as EnemyMetadata;

     this.enemies.push(enemy);
  }

  private spawnFlag(x: number, y: number) {
      const pole = BABYLON.MeshBuilder.CreateCylinder("pole", { height: 6, diameter: 0.15 }, this.scene);
      pole.position.set(x, y + 2.5, 0);
      pole.parent = this.levelContainer;
      
      const flag = BABYLON.MeshBuilder.CreateBox("flag", { width: 1, height: 0.8, depth: 0.05 }, this.scene);
      flag.position.set(x + 0.5, y + 5, 0);
      flag.material = this.materials.finish;
      flag.parent = this.levelContainer;
      
      const trigger = BABYLON.MeshBuilder.CreateBox("winTrigger", { width: 1, height: 10, depth: 2 }, this.scene);
      trigger.position.set(x, y + 5, 0);
      trigger.isVisible = false;
      trigger.metadata = { type: 'flag' };
      trigger.parent = this.levelContainer;
  }

  private resetPlayer(x: number, y: number) {
      if (!this.playerMesh) return;
      this.playerMesh.position.set(x, y + 2, 0);
      this.playerVelocity.set(0, 0, 0);
      this.isJumping = false;
      this.facingRight = true;
  }

  public restartGame() {
    this.score = 0;
    this.callbacks.onScoreUpdate(0);
    this.timeRemaining = 400;
    this.currentGameState = GameState.PLAYING;
    this.callbacks.onGameStateChange(GameState.PLAYING);
    this.loadLevel(0);
  }

  // --- CUSTOM AABB PHYSICS ENGINE ---

  private checkCollision(x: number, y: number): boolean {
      // Calculate Player AABB at position x,y
      const minX = x - this.PLAYER_WIDTH / 2;
      const maxX = x + this.PLAYER_WIDTH / 2;
      const minY = y - this.PLAYER_HEIGHT / 2;
      const maxY = y + this.PLAYER_HEIGHT / 2;

      // Check all tiles that the player might overlap with
      // We expand the check range to be safe
      const startTileX = Math.floor(minX);
      const endTileX = Math.floor(maxX);
      const startTileY = Math.floor(minY);
      const endTileY = Math.floor(maxY);

      for (let tx = startTileX; tx <= endTileX; tx++) {
          for (let ty = startTileY; ty <= endTileY; ty++) {
              if (this.solidTiles.has(`${tx},${ty}`)) {
                  // Precise AABB overlap check
                  // Tile AABB: [tx-0.5, tx+0.5] x [ty-0.5, ty+0.5]
                  // Actually block centers are integers, extent is 1.0. 
                  // So bounds are tx-0.5 to tx+0.5.
                  
                  const tileMinX = tx - 0.5;
                  const tileMaxX = tx + 0.5;
                  const tileMinY = ty - 0.5;
                  const tileMaxY = ty + 0.5;

                  if (maxX > tileMinX && minX < tileMaxX && maxY > tileMinY && minY < tileMaxY) {
                      return true;
                  }
              }
          }
      }
      return false;
  }

  private triggerBlock(x: number, y: number) {
      const key = `${Math.round(x)},${Math.round(y)}`;
      const block = this.blockMeshes.get(key);
      
      if (block) {
          const meta = block.metadata as BlockMetadata;
          if (meta && meta.active && meta.type === 'question') {
              meta.active = false;
              block.material = this.materials.questionEmpty;
              
              // Bump animation
              const anim = new BABYLON.Animation("bump", "position.y", 60, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
              anim.setKeys([
                  { frame: 0, value: meta.originalY },
                  { frame: 5, value: meta.originalY + 0.3 },
                  { frame: 10, value: meta.originalY }
              ]);
              block.animations.push(anim);
              this.scene.beginAnimation(block, 0, 10, false);

              // Reward
              this.score += 5;
              this.callbacks.onScoreUpdate(this.score);
              
              // Coin Visual
              const tempCoin = BABYLON.MeshBuilder.CreateCylinder("tCoin", {diameter: 0.6, height: 0.05}, this.scene);
              tempCoin.rotation.x = Math.PI/2;
              tempCoin.position.set(block.position.x, block.position.y + 1, 0);
              tempCoin.material = this.materials.coin;
              
              const coinAnim = new BABYLON.Animation("pop", "position.y", 60, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
              coinAnim.setKeys([
                  { frame: 0, value: block.position.y + 0.5 },
                  { frame: 20, value: block.position.y + 2.5 },
                  { frame: 30, value: block.position.y + 2.0 }
              ]);
              tempCoin.animations.push(coinAnim);
              this.scene.beginAnimation(tempCoin, 0, 30, false, 1, () => {
                if(this.coinParticleSystem) {
                    this.coinParticleSystem.emitter = tempCoin.position.clone();
                    this.coinParticleSystem.manualEmitCount = 10;
                }  
                tempCoin.dispose();
              });
          }
      }
  }

  private update() {
    if (this.currentGameState !== GameState.PLAYING) return;
    if (!this.playerMesh) return;

    const dt = this.engine.getDeltaTime() / 1000;
    if (dt > 0.1) return; 

    this.timeRemaining -= dt;
    this.callbacks.onTimeUpdate(this.timeRemaining);
    if (this.timeRemaining <= 0 || this.playerMesh.position.y < -5) {
        this.die();
        return;
    }

    // Input
    const left = this.inputMap["a"] || this.inputMap["arrowleft"];
    const right = this.inputMap["d"] || this.inputMap["arrowright"];
    const jump = this.inputMap[" "] || this.inputMap["space"];

    // 1. Horizontal Movement
    let targetSpeed = 0;
    if (left) {
        targetSpeed = -this.MOVE_SPEED;
        this.facingRight = false;
    } else if (right) {
        targetSpeed = this.MOVE_SPEED;
        this.facingRight = true;
    }
    
    // Smooth Acceleration
    const accel = this.isGrounded ? this.ACCELERATION : this.ACCELERATION * 0.5;
    const friction = this.isGrounded ? this.FRICTION : 0; // No air friction
    
    if (targetSpeed !== 0) {
        this.playerVelocity.x = BABYLON.Scalar.MoveTowards(this.playerVelocity.x, targetSpeed, accel * dt);
    } else {
        this.playerVelocity.x = BABYLON.Scalar.MoveTowards(this.playerVelocity.x, 0, friction * dt);
    }

    // Apply X Move
    let nextX = this.playerMesh.position.x + this.playerVelocity.x * dt;
    let nextY = this.playerMesh.position.y;

    // Resolve X Collision
    if (this.checkCollision(nextX, nextY)) {
        if (this.playerVelocity.x > 0) {
            // Moving Right: Snap to left side of tile
            // Tile Center = round(nextX + width/2)
            // But checking tiles is iterative.
            // Simplest way: Backtrack.
            // Or Snap: nearest .5 boundary.
            const tileIdx = Math.floor(nextX + this.PLAYER_WIDTH/2);
            nextX = tileIdx - 0.5 - this.PLAYER_WIDTH/2 - 0.001;
        } else if (this.playerVelocity.x < 0) {
            // Moving Left
            const tileIdx = Math.floor(nextX - this.PLAYER_WIDTH/2);
            nextX = tileIdx + 0.5 + this.PLAYER_WIDTH/2 + 0.001;
        }
        this.playerVelocity.x = 0;
    }
    this.playerMesh.position.x = nextX;

    // 2. Vertical Movement
    if (this.isGrounded) {
        this.coyoteTimeCounter = this.COYOTE_TIME;
        this.isJumping = false;
    } else {
        this.coyoteTimeCounter -= dt;
    }

    if (jump && !this.inputMap["processed_jump"]) {
        this.jumpBufferCounter = this.JUMP_BUFFER;
        this.inputMap["processed_jump"] = true;
    } else if (!jump) {
        this.inputMap["processed_jump"] = false;
    }
    this.jumpBufferCounter -= dt;

    if (this.jumpBufferCounter > 0 && this.coyoteTimeCounter > 0) {
        this.playerVelocity.y = this.JUMP_FORCE;
        this.jumpBufferCounter = 0;
        this.coyoteTimeCounter = 0;
        this.isJumping = true;
        this.isGrounded = false;
    }
    
    if (!jump && this.playerVelocity.y > 0 && this.isJumping) {
        this.playerVelocity.y *= 0.5; 
    }

    this.playerVelocity.y += this.GRAVITY * dt;
    if (this.playerVelocity.y < this.MAX_FALL_SPEED) this.playerVelocity.y = this.MAX_FALL_SPEED;

    // Apply Y Move
    nextY = this.playerMesh.position.y + this.playerVelocity.y * dt;
    
    // Resolve Y Collision (Using already resolved X)
    if (this.checkCollision(nextX, nextY)) {
        if (this.playerVelocity.y < 0) {
            // Falling (Floor)
            const tileIdx = Math.floor(nextY - this.PLAYER_HEIGHT/2);
            nextY = tileIdx + 0.5 + this.PLAYER_HEIGHT/2;
            this.isGrounded = true;
        } else {
            // Jumping (Ceiling)
            const tileIdx = Math.floor(nextY + this.PLAYER_HEIGHT/2);
            nextY = tileIdx - 0.5 - this.PLAYER_HEIGHT/2 - 0.001;
            
            // Check for block activation above head
            this.triggerBlock(nextX, nextY + 1.0);
        }
        this.playerVelocity.y = 0;
    } else {
        this.isGrounded = false;
    }
    this.playerMesh.position.y = nextY;

    // Lock Z
    this.playerMesh.position.z = 0;

    // 3. Visuals & Gameplay
    if (this.playerSprite) {
        this.playerSprite.position.x = this.playerMesh.position.x;
        this.playerSprite.position.y = this.playerMesh.position.y + 0.15;
        this.playerSprite.position.z = 0;
        this.playerSprite.invertU = !this.facingRight;

        if (!this.isGrounded) {
            this.playerSprite.cellIndex = 2; // Jump
        } else if (Math.abs(this.playerVelocity.x) > 0.5) {
            this.animTimer += dt;
            if (this.animTimer > 0.08) { 
                this.animTimer = 0;
                this.animFrame = (this.animFrame + 1) % 3;
            }
            const runFrames = [1, 3, 1];
            this.playerSprite.cellIndex = runFrames[this.animFrame];

            this.runDustTimer += dt;
            if(this.runDustTimer > 0.15 && this.dustParticleSystem) {
                this.runDustTimer = 0;
                this.dustParticleSystem.emitter = this.playerMesh.position.clone().add(new BABYLON.Vector3(0, -0.4, 0));
                this.dustParticleSystem.direction1.x = this.facingRight ? -1 : 1;
                this.dustParticleSystem.manualEmitCount = 2;
            }
        } else {
            this.playerSprite.cellIndex = 0; // Idle
        }
    }

    if (this.camera) {
        const targetX = Math.max(0, this.playerMesh.position.x + 4); 
        const targetY = Math.max(5, this.playerMesh.position.y + 1);
        this.camera.position.x = BABYLON.Scalar.Lerp(this.camera.position.x, targetX, 5 * dt);
        this.camera.position.y = BABYLON.Scalar.Lerp(this.camera.position.y, targetY, 5 * dt);

        if (this.backgroundContainer) {
            this.backgroundContainer.position.x = this.camera.position.x * 0.5; 
        }
    }

    // Check Trigger Interactions
    if (this.levelContainer) {
        this.levelContainer.getChildMeshes().forEach(mesh => {
            if (mesh.metadata && mesh.metadata.type === 'flag') {
                if (this.playerMesh!.intersectsMesh(mesh, false)) {
                     this.nextLevel();
                }
            }
        });
    }

    // Coins
    this.coins.forEach(coin => {
        if (coin.isVisible && !coin.metadata.collected) {
            // Simple distance check usually better than intersect for coins
            if (BABYLON.Vector3.DistanceSquared(this.playerMesh!.position, coin.position) < 1.0) {
                coin.isVisible = false;
                coin.metadata.collected = true;
                this.score += 1;
                this.callbacks.onScoreUpdate(this.score);
                if(this.coinParticleSystem) {
                    this.coinParticleSystem.emitter = coin.position.clone();
                    this.coinParticleSystem.manualEmitCount = 5;
                }
            }
        }
    });

    // Enemies
    this.enemies.forEach(enemy => {
        const meta = enemy.metadata as EnemyMetadata;
        if (meta.dead) return;

        enemy.position.x += meta.direction * meta.speed * dt;
        
        meta.animTime += dt * 10;
        enemy.scaling.y = 0.8 + Math.sin(meta.animTime) * 0.1;
        enemy.scaling.x = 1.0 - Math.sin(meta.animTime) * 0.05;

        // Enemy Physics (Simple)
        const nextEnemyX = enemy.position.x + meta.direction * 0.5;
        // Turn if hitting wall or about to fall
        if (this.checkCollision(nextEnemyX, enemy.position.y)) {
             meta.direction *= -1;
        } else {
             // Check floor gap
             if (!this.checkCollision(nextEnemyX, enemy.position.y - 1)) {
                  meta.direction *= -1;
             }
        }

        // Interaction
        if (BABYLON.Vector3.Distance(this.playerMesh!.position, enemy.position) < 0.8) {
             const playerBottom = this.playerMesh!.position.y - this.PLAYER_HEIGHT/2;
             const enemyTop = enemy.position.y + 0.4;
             
             if (playerBottom > enemyTop - 0.2 && this.playerVelocity.y < 0) {
                // Stomp
                meta.dead = true;
                this.score += 10;
                this.callbacks.onScoreUpdate(this.score);
                this.playerVelocity.y = this.JUMP_FORCE * 0.6; 
                enemy.scaling.y = 0.1;
                enemy.position.y -= 0.35;
                if(this.dustParticleSystem) {
                    this.dustParticleSystem.emitter = enemy.position;
                    this.dustParticleSystem.manualEmitCount = 10;
                }
                setTimeout(() => { enemy.dispose(); }, 200);
             } else {
                 this.die();
             }
        }
    });
  }

  private nextLevel() {
      this.loadLevel(this.currentLevelIndex + 1);
  }

  private die() {
    this.currentGameState = GameState.GAME_OVER;
    this.callbacks.onGameStateChange(GameState.GAME_OVER);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.inputMap[e.key.toLowerCase()] = true;
    this.inputMap[e.code.toLowerCase()] = true;
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.inputMap[e.key.toLowerCase()] = false;
    this.inputMap[e.code.toLowerCase()] = false;
  };

  private setupInputs() {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  public render() {
    this.scene.render();
  }

  public setGameState(state: GameState) {
      this.currentGameState = state;
  }

  public dispose() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.scene.dispose();
  }
  
  public resize() {
      this.engine.resize();
  }
}
