import * as THREE from '../CS559-Three/build/three.module.js';
import { GLTFLoader } from '../CS559-Three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Core game configuration
 */
const CONFIG = {
  player: {
    height: 1.7,
    speedWalk: 2.0,
    speedRun: 3.8,
    turnSpeed: THREE.MathUtils.degToRad(110), // yaw/sec via keyboard
  },
  eye: {
    intervalMin: 30, // seconds
    intervalMax: 60,
    visibleDuration: 5, // seconds per peering
    sightDistance: 18,
    fov: THREE.MathUtils.degToRad(35),
  },
  interact: {
    distance: 2.0,
  },
  world: {
    gravity: -9.81, // future expansion
    floorY: 0,
  }
};

/**
 * Global DOM elements
 */
const dom = {
  paperCount: document.getElementById('paperCount'),
  codeDisplay: document.getElementById('codeDisplay'),
  objective: document.getElementById('objective'),
  fullModeCheckbox: document.getElementById('fullModeCheckbox'),
  overlay: document.getElementById('overlay'),
  message: document.getElementById('message'),
  restartBtn: document.getElementById('restartBtn'),
  up: document.getElementById('up'),
  down: document.getElementById('down'),
  left: document.getElementById('left'),
  right: document.getElementById('right'),
  interact: document.getElementById('interact'),
  run: document.getElementById('run'),
};

/**
 * Utility: tries to load a texture, falls back to a procedural if missing
 */
function loadTextureOrFallback(url, fallbackKind = 'checker') {
  const loader = new THREE.TextureLoader();
  return new Promise((resolve) => {
    loader.load(url, tex => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      resolve(tex);
    }, undefined, () => {
      // Fallback procedural texture
      const size = 64;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#666'; ctx.fillRect(0,0,size,size);
      if (fallbackKind === 'checker') {
        for (let y=0; y<8; y++) for (let x=0; x<8; x++) {
          if ((x+y)%2===0) { ctx.fillStyle = '#777'; } else { ctx.fillStyle = '#555'; }
          ctx.fillRect(x*8, y*8, 8, 8);
        }
      } else if (fallbackKind === 'noise') {
        const imgData = ctx.createImageData(size, size);
        for (let i=0;i<imgData.data.length;i+=4){
          const v = 120 + Math.floor(Math.random()*60);
          imgData.data[i]=v; imgData.data[i+1]=v; imgData.data[i+2]=v; imgData.data[i+3]=255;
        }
        ctx.putImageData(imgData,0,0);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      resolve(tex);
    });
  });
}

/**
 * Basic input manager
 */
class Input {
  constructor() {
    this.keys = new Set();
    this.running = false;
    this.interactRequested = false;

    // Keyboard
    window.addEventListener('keydown', e => {
      this.keys.add(e.key.toLowerCase());
      if (e.key === 'Shift') this.running = true;
      if (e.key.toLowerCase() === 'e') this.interactRequested = true;
    });
    window.addEventListener('keyup', e => {
      this.keys.delete(e.key.toLowerCase());
      if (e.key === 'Shift') this.running = false;
    });

    // Mobile buttons
    const press = (k) => this.keys.add(k);
    const release = (k) => this.keys.delete(k);
    dom.up.addEventListener('touchstart', e => { e.preventDefault(); press('w'); }, {passive:false});
    dom.up.addEventListener('touchend', () => release('w'));
    dom.down.addEventListener('touchstart', e => { e.preventDefault(); press('s'); }, {passive:false});
    dom.down.addEventListener('touchend', () => release('s'));
    dom.left.addEventListener('touchstart', e => { e.preventDefault(); press('a'); }, {passive:false});
    dom.left.addEventListener('touchend', () => release('a'));
    dom.right.addEventListener('touchstart', e => { e.preventDefault(); press('d'); }, {passive:false});
    dom.right.addEventListener('touchend', () => release('d'));
    dom.run.addEventListener('touchstart', e => { e.preventDefault(); this.running = true; }, {passive:false});
    dom.run.addEventListener('touchend', () => { this.running = false; });
    dom.interact.addEventListener('click', () => { this.interactRequested = true; });

    // Mouse look (simple drag-to-look)
    this.mouseDown = false;
    this.deltaYaw = 0;
    window.addEventListener('mousedown', () => { this.mouseDown = true; });
    window.addEventListener('mouseup', () => { this.mouseDown = false; });
    window.addEventListener('mousemove', e => {
      if (!this.mouseDown) return;
      this.deltaYaw += e.movementX * 0.0025;
    });
    // Touch look
    let lastX = null;
    window.addEventListener('touchstart', e => {
      if (e.touches.length === 1) lastX = e.touches[0].clientX;
    }, {passive:true});
    window.addEventListener('touchmove', e => {
      if (e.touches.length === 1 && lastX !== null) {
        const x = e.touches[0].clientX;
        this.deltaYaw += (x - lastX) * 0.003;
        lastX = x;
      }
    }, {passive:true});
    window.addEventListener('touchend', () => { lastX = null; });
  }

  consumeInteract() {
    const v = this.interactRequested;
    this.interactRequested = false;
    return v;
  }
}

/**
 * Interactable base
 */
class Interactable extends THREE.Group {
  constructor({ label, onInteract, hint = 'Interact (E)' }) {
    super();
    this.isInteractable = true;
    this.label = label || 'Interactable';
    this.onInteract = onInteract || (() => {});
    this.hint = hint;
  }
}

/**
 * Drawer/Cupboard with open/close
 */
class HingedDoor extends Interactable {
  constructor({ width=0.6, height=0.8, depth=0.02, openAngle=90, pivotSide='left', material }) {
    super({
      label: 'Door',
      hint: 'Open/Close (E)',
    });
    this.openAngle = THREE.MathUtils.degToRad(openAngle);
    this.open = false;

    const geom = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geom, material);
    mesh.castShadow = true; mesh.receiveShadow = true;

    // pivot
    const pivot = new THREE.Object3D();
    this.add(pivot);
    pivot.add(mesh);

    const offsetX = (pivotSide === 'left' ? -width/2 : width/2);
    mesh.position.set(-offsetX, 0, 0); // place so pivot at edge
    this.pivot = pivot;
  }
  onInteract() {
    this.open = !this.open;
  }
  update(dt) {
    const target = this.open ? this.openAngle : 0;
    const curr = this.pivot.rotation.y;
    const speed = 4.0;
    this.pivot.rotation.y = THREE.MathUtils.damp(curr, target, speed, dt);
  }
}

/**
 * Simple sliding drawer
 */
class SlidingDrawer extends Interactable {
  constructor({ width=0.5, height=0.2, depth=0.4, extend=0.35, material }) {
    super({ label: 'Drawer', hint: 'Open/Close (E)' });
    this.open = false;
    this.extend = extend;

    const geom = new THREE.BoxGeometry(width, height, depth);
    this.mesh = new THREE.Mesh(geom, material);
    this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    this.add(this.mesh);
    this.basePos = this.mesh.position.clone();
  }
  onInteract() { this.open = !this.open; }
  update(dt) {
    const target = this.open ? this.extend : 0;
    const curr = this.mesh.position.z;
    this.mesh.position.z = THREE.MathUtils.damp(curr, target, 6.0, dt);
  }
}

/**
 * Collectible paper with index and value
 */
class Paper extends Interactable {
  constructor({ index, value, material }) {
    super({ label: `Paper ${index}`, hint: 'Pick up (E)' });
    this.index = index;
    this.value = value;
    const geom = new THREE.PlaneGeometry(0.15, 0.2);
    const mesh = new THREE.Mesh(geom, material);
    mesh.rotation.x = -Math.PI/2; // lying on surface by default
    mesh.castShadow = true; mesh.receiveShadow = true;
    this.add(mesh);
  }
}

/**
 * Basement lock
 */
class Lock extends Interactable {
  constructor({ material }) {
    super({ label: 'Lock', hint: 'Unlock (E)' });
    const geom = new THREE.TorusGeometry(0.12, 0.03, 16, 24);
    const mesh = new THREE.Mesh(geom, material);
    mesh.castShadow = true; mesh.receiveShadow = true;
    this.add(mesh);
    this.unlocked = false;
  }
  tryUnlock(foundValues) {
    // Require all four: indices 1..4
    const allFound = [1,2,3,4].every(i => foundValues.has(i));
    if (allFound) {
      this.unlocked = true;
      return true;
    }
    return false;
  }
}

/**
 * The giant eye that peers through windows
 */
class GiantEye extends THREE.Group {
  constructor({ texture, houseWindows, scene, getPlayerPos, getPlayerDir }) {
    super();
    this.houseWindows = houseWindows;
    this.scene = scene;
    this.getPlayerPos = getPlayerPos;
    this.getPlayerDir = getPlayerDir;
    this.visibleNow = false;
    this.timer = 0;
    this.nextPeek = this.randomInterval();
    this.peekDuration = CONFIG.eye.visibleDuration;

    const geom = new THREE.SphereGeometry(0.6, 32, 32);
    const mat = new THREE.MeshPhongMaterial({
      map: texture,
      color: 0xffffff,
      shininess: 30,
    });
    this.mesh = new THREE.Mesh(geom, mat);
    this.add(this.mesh);

    // Start off-scene
    this.position.set(0, 100, 0);
    scene.add(this);
  }

  randomInterval() {
    return CONFIG.eye.intervalMin + Math.random()*(CONFIG.eye.intervalMax - CONFIG.eye.intervalMin);
  }

  chooseWindow() {
    return this.houseWindows[Math.floor(Math.random()*this.houseWindows.length)];
  }

  update(dt, obstacles) {
    this.timer += dt;

    if (!this.visibleNow && this.timer > this.nextPeek) {
      // Start peeking
      this.timer = 0;
      this.visibleNow = true;
      this.windowTarget = this.chooseWindow();

      const lookPos = this.windowTarget.position.clone();
      lookPos.y += 1.1;
      const outward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.windowTarget.quaternion);
      const eyePos = lookPos.clone().add(outward.multiplyScalar(1.4)); // just outside window
      this.position.copy(eyePos);
      this.mesh.lookAt(lookPos);
    }

    if (this.visibleNow) {
      // Gently sway
      this.rotation.y += dt*0.2;

      // Vision check (lose condition)
      const playerPos = this.getPlayerPos();
      const toPlayer = new THREE.Vector3().subVectors(playerPos, this.position);
      const dist = toPlayer.length();
      if (dist < CONFIG.eye.sightDistance) {
        const dir = toPlayer.normalize();
        const eyeForward = new THREE.Vector3(0,0,1).applyQuaternion(this.mesh.quaternion);
        const angle = Math.acos(THREE.MathUtils.clamp(eyeForward.dot(dir), -1, 1));
        if (angle < CONFIG.eye.fov) {
          // Check line of sight (ray no obstacles)
          const ray = new THREE.Raycaster(this.position, dir, 0, dist);
          const hits = ray.intersectObjects(obstacles, true);
          const blocked = hits.length > 0;
          if (!blocked) {
            // Player is spotted -> game over
            return 'spotted';
          }
        }
      }

      if (this.timer > this.peekDuration) {
        // End peeking
        this.timer = 0;
        this.visibleNow = false;
        this.nextPeek = this.randomInterval();
        this.position.set(0, 100, 0);
      }
    }
    return null;
  }
}

/**
 * Main Game
 */
class Game {
  constructor() {
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.input = new Input();
    this.collected = new Map(); // index -> value
    this.prototypeMode = true;

    // Render setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100);
    this.camera.position.set(0, CONFIG.player.height, 4);

    // Lighting
    const ambient = new THREE.AmbientLight(0x404040, 0.8);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.7);
    dir.position.set(5, 8, 5);
    dir.castShadow = true;
    this.scene.add(dir);

    // Controls state
    this.yaw = 0;
    this.runHeld = false;

    // World
    this.obstacles = []; // for line-of-sight blocking
    this.interactables = [];
    this.updateables = [];

    // UI
    dom.fullModeCheckbox.addEventListener('change', () => {
      this.prototypeMode = !dom.fullModeCheckbox.checked;
      this.resetWorld();
    });
    dom.restartBtn.addEventListener('click', () => {
      this.hideOverlay();
      this.resetWorld();
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.resetWorld();
    this.loop();
  }

  async resetWorld() {
    // Clear scene children except camera and lights
    for (let i = this.scene.children.length - 1; i >= 0; i--) {
      const obj = this.scene.children[i];
      if (obj.isLight || obj === this.camera) continue;
      this.scene.remove(obj);
    }
    this.interactables = [];
    this.updateables = [];
    this.obstacles = [];
    this.collected.clear();
    this.yaw = 0;
    this.camera.position.set(0, CONFIG.player.height, 4);
    this.hideOverlay();
    dom.paperCount.textContent = '0';
    dom.codeDisplay.textContent = '_ _ _ _';
    dom.objective.textContent = 'Find all papers.';

    // Materials depending on mode
    const protoMat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.0 });
    const mats = {};
    if (this.prototypeMode) {
      mats.floor = protoMat(0x444444);
      mats.wall = protoMat(0x777777);
      mats.wood = protoMat(0x8b6b3e);
      mats.metal = protoMat(0x888888);
      mats.paper = protoMat(0xddddcc);
      mats.eye = protoMat(0xffffff);
    } else {
      mats.floorTex = await loadTextureOrFallback('assets/textures/floor.jpg', 'checker');
      mats.wallTex = await loadTextureOrFallback('assets/textures/wallpaper.jpg', 'noise');
      mats.woodTex = await loadTextureOrFallback('assets/textures/wood.jpg', 'checker');
      mats.metalTex = await loadTextureOrFallback('assets/textures/metal.jpg', 'checker');
      mats.paperTex = await loadTextureOrFallback('assets/textures/paper.jpg', 'noise');
      mats.eyeTex = await loadTextureOrFallback('assets/textures/eye.jpg', 'checker');

      mats.floor = new THREE.MeshStandardMaterial({ map: mats.floorTex });
      mats.wall = new THREE.MeshStandardMaterial({ map: mats.wallTex });
      mats.wood = new THREE.MeshStandardMaterial({ map: mats.woodTex });
      mats.metal = new THREE.MeshStandardMaterial({ map: mats.metalTex, metalness: 0.3, roughness: 0.5 });
      mats.paper = new THREE.MeshStandardMaterial({ map: mats.paperTex });
      mats.eye = new THREE.MeshPhongMaterial({ map: mats.eyeTex, shininess: 40 });
    }

    // Build house with window gaps
    const house = new THREE.Group();
    this.scene.add(house);

    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), mats.floor);
    floor.rotation.x = -Math.PI/2;
    floor.receiveShadow = true;
    floor.position.y = CONFIG.world.floorY;
    house.add(floor);

    // Walls (create segments leaving window gaps)
    const wallThickness = 0.2;
    const wallHeight = 2.5;

    const mkWall = (w, h, d, x, y, z, rx=0, ry=0, rz=0) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats.wall);
      wall.position.set(x,y,z);
      wall.rotation.set(rx,ry,rz);
      wall.castShadow = true; wall.receiveShadow = true;
      house.add(wall);
      this.obstacles.push(wall);
      return wall;
    };

    // Front wall with two window gaps
    // Segment left
    mkWall(3.0, wallHeight, wallThickness, -3.5, wallHeight/2, -5);
    // Segment right
    mkWall(3.0, wallHeight, wallThickness, 3.5, wallHeight/2, -5);
    // Window beams (thin frames) to mount window meshes
    const windowFrames = [];
    const addWindow = (x) => {
      const frame = new THREE.Object3D();
      frame.position.set(x, 1.2, -5 + wallThickness/2);
      house.add(frame);
      windowFrames.push(frame);

      // Transparent plane to represent window glass (not blocking line of sight)
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.2), new THREE.MeshBasicMaterial({
        color: 0x99bbee, transparent: true, opacity: 0.2
      }));
      frame.add(glass);
    };
    addWindow(-1.5);
    addWindow(1.5);

    // Back wall
    mkWall(10, wallHeight, wallThickness, 0, wallHeight/2, 5);
    // Left wall
    mkWall(wallThickness, wallHeight, 10, -5, wallHeight/2, 0);
    // Right wall
    mkWall(wallThickness, wallHeight, 10, 5, wallHeight/2, 0);

    // Basement door area at back-right
    const basementDoorFrame = mkWall(2.0, wallHeight, wallThickness, 3.0, wallHeight/2, 4.9);
    // Create doorway gap by not placing a segment. Add a lock near it.
    const lock = new Lock({ material: mats.metal });
    lock.position.set(3.0, 1.0, 4.6);
    this.scene.add(lock);
    this.interactables.push(lock);

    // Cupboards and drawers (kitchen on left side)
    const kitchenGroup = new THREE.Group();
    kitchenGroup.position.set(-3.0, 0, -2.0);
    this.scene.add(kitchenGroup);

    const cupboard = new HingedDoor({ width: 0.6, height: 0.9, depth: 0.03, openAngle: 95, material: mats.wood });
    cupboard.position.set(0, 0.45, 0);
    kitchenGroup.add(cupboard);
    this.interactables.push(cupboard);
    this.updateables.push(cupboard);

    const drawer1 = new SlidingDrawer({ width: 0.5, height: 0.18, depth: 0.4, extend: 0.35, material: mats.wood });
    drawer1.position.set(0.9, 0.3, 0);
    kitchenGroup.add(drawer1);
    this.interactables.push(drawer1);
    this.updateables.push(drawer1);

    const drawer2 = new SlidingDrawer({ width: 0.5, height: 0.18, depth: 0.4, extend: 0.35, material: mats.wood });
    drawer2.position.set(0.9, 0.55, 0);
    kitchenGroup.add(drawer2);
    this.interactables.push(drawer2);
    this.updateables.push(drawer2);

    // Place four papers in varied locations
    const papers = [
      { index: 1, value: 3, pos: new THREE.Vector3(-3.0, 0.4, -2.0) }, // inside cupboard
      { index: 2, value: 7, pos: new THREE.Vector3(0.0, 0.02, 0.0) },   // on floor center
      { index: 3, value: 1, pos: new THREE.Vector3(4.2, 0.8, -4.0) },   // on window sill
      { index: 4, value: 5, pos: new THREE.Vector3(2.8, 0.4, 3.8) },    // near basement door
    ];
    for (const p of papers) {
      const paper = new Paper({ index: p.index, value: p.value, material: mats.paper });
      paper.position.copy(p.pos);
      this.scene.add(paper);
      this.interactables.push(paper);
    }

    // Optional models in Full mode
    if (!this.prototypeMode) {
      const gltfLoader = new GLTFLoader();
      const tryLoad = (url) => new Promise(resolve => gltfLoader.load(url, gltf => resolve(gltf.scene), undefined, () => resolve(null)));

      const modelCupboard = await tryLoad('assets/models/cupboard.glb');
      if (modelCupboard) {
        modelCupboard.scale.set(0.8,0.8,0.8);
        modelCupboard.position.copy(kitchenGroup.position).add(new THREE.Vector3(-0.1, 0, 0));
        this.scene.add(modelCupboard);
        // Add meshes as obstacles
        modelCupboard.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; this.obstacles.push(o); } });
      }

      const modelDrawer = await tryLoad('assets/models/drawer.glb');
      if (modelDrawer) {
        modelDrawer.scale.set(0.7,0.7,0.7);
        modelDrawer.position.copy(kitchenGroup.position).add(new THREE.Vector3(0.9, 0, 0.05));
        this.scene.add(modelDrawer);
        modelDrawer.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; this.obstacles.push(o); } });
      }

      const modelLock = await tryLoad('assets/models/lock.glb');
      if (modelLock) {
        modelLock.position.copy(lock.position);
        this.scene.add(modelLock);
        modelLock.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; this.obstacles.push(o); } });
      }
    }

    // Windows giant eye
    this.eye = new GiantEye({
      texture: this.prototypeMode ? null : mats.eye.map || mats.eyeTex || null,
      houseWindows: windowFrames,
      scene: this.scene,
      getPlayerPos: () => this.camera.position.clone(),
      getPlayerDir: () => {
        const dir = new THREE.Vector3(0,0,-1);
        dir.applyQuaternion(this.camera.quaternion);
        return dir;
      }
    });

    // Basement trigger (win when stepping inside)
    const basementTrigger = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 2.0, 1.2),
      new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.08 })
    );
    basementTrigger.position.set(3.0, 1.0, 4.0);
    this.scene.add(basementTrigger);
    basementTrigger.visible = this.prototypeMode; // visible only in prototype to debug
    this.basementTrigger = basementTrigger;

    // Obstacles: add furniture and walls already registered
    // Add kitchenGroup children meshes
    kitchenGroup.traverse(o => { if (o.isMesh) this.obstacles.push(o); });

    // Camera initial facing down the house
    this.yaw = 0;

    // Update UI mode label
    dom.objective.textContent = 'Find all papers.';
  }

  loop() {
    requestAnimationFrame(() => this.loop());
    const dt = this.clock.getDelta();

    // Update interactables
    for (const u of this.updateables) u.update(dt);

    // Player movement
    const speed = this.input.running ? CONFIG.player.speedRun : CONFIG.player.speedWalk;

    // Turn from mouse drag
    this.yaw += this.input.deltaYaw;
    this.input.deltaYaw = 0;

    // Turn from keyboard
    const turningLeft = this.input.keys.has('arrowleft') || this.input.keys.has('q');
    const turningRight = this.input.keys.has('arrowright') || this.input.keys.has('e') && !this.input.consumeInteract();
    if (turningLeft) this.yaw += CONFIG.player.turnSpeed * dt;
    if (turningRight) this.yaw -= CONFIG.player.turnSpeed * dt;

    // Update camera rotation
    const quat = new THREE.Quaternion();
    quat.setFromEuler(new THREE.Euler(0, this.yaw, 0, 'YXZ'));
    this.camera.quaternion.copy(quat);

    // Translate
    const forward = new THREE.Vector3(0,0,-1).applyQuaternion(this.camera.quaternion);
    const right = new THREE.Vector3(1,0,0).applyQuaternion(this.camera.quaternion);

    let vel = new THREE.Vector3();
    if (this.input.keys.has('w') || this.input.keys.has('arrowup')) vel.add(forward);
    if (this.input.keys.has('s') || this.input.keys.has('arrowdown')) vel.add(forward.clone().multiplyScalar(-1));
    if (this.input.keys.has('a')) vel.add(right.clone().multiplyScalar(-1));
    if (this.input.keys.has('d')) vel.add(right);

    if (vel.lengthSq() > 0) {
      vel.normalize().multiplyScalar(speed * dt);
      const nextPos = this.camera.position.clone().add(vel);
      nextPos.y = CONFIG.player.height;

      // Simple collision: prevent crossing walls by ray forward
      const ray = new THREE.Raycaster(this.camera.position, vel.clone().normalize(), 0, 0.5);
      const hits = ray.intersectObjects(this.obstacles, true);
      if (hits.length === 0) this.camera.position.copy(nextPos);
    }

    // Interaction ray from camera forward
    const interact = this.input.consumeInteract();
    this.raycaster.set(this.camera.position, forward);
    const candidates = this.raycaster.intersectObjects(this.interactables, true);
    if (candidates.length > 0 && candidates[0].distance < CONFIG.interact.distance) {
      const hit = candidates[0].object;
      // Find parent interactable
      let node = hit;
      while (node && !node.isInteractable) node = node.parent;
      if (node && node.isInteractable && interact) {
        if (node instanceof Paper) {
          if (!this.collected.has(node.index)) {
            this.collected.set(node.index, node.value);
            dom.paperCount.textContent = `${this.collected.size}`;
            this.scene.remove(node);
            this.interactables = this.interactables.filter(o => o !== node);
            // Update code display
            const code = [1,2,3,4].map(i => this.collected.has(i) ? this.collected.get(i) : '_');
            dom.codeDisplay.textContent = code.join(' ');
            if (this.collected.size === 4) dom.objective.textContent = 'Unlock the basement lock.';
          }
        } else if (node instanceof Lock) {
          const ok = node.tryUnlock(this.collected);
          if (ok) {
            dom.objective.textContent = 'Basement unlocked. Enter to win.';
            // Remove door frame obstacle to allow entry
            this.scene.remove(this.basementTrigger.material); // keep trigger
          }
        } else if (node.onInteract) {
          node.onInteract();
        }
      }
    }

    // Win condition: stepping into basement trigger after unlocked
    if (this.basementTrigger) {
      const pt = this.basementTrigger.position.clone();
      const ext = new THREE.Vector3(1.1, 1.0, 0.6);
      const cam = this.camera.position;
      const inside =
        Math.abs(cam.x - pt.x) < ext.x &&
        Math.abs(cam.y - pt.y) < ext.y &&
        Math.abs(cam.z - pt.z) < ext.z;
      const allFound = this.collected.size === 4;
      if (inside && allFound) {
        this.showOverlay('You descended into the basement. You win.');
      }
    }

    // Eye update (lose condition)
    if (this.eye) {
      const result = this.eye.update(dt, this.obstacles);
      if (result === 'spotted') {
        this.showOverlay('The giant eye spotted you through the window. Game over.');
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  showOverlay(text) {
    dom.message.textContent = text;
    dom.overlay.classList.add('show');
  }
  hideOverlay() {
    dom.overlay.classList.remove('show');
  }
}

// Boot
new Game();
