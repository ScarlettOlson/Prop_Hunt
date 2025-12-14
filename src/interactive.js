import * as THREE from '../CS559-Three/build/three.module.js';
import { loadTextureSafely, createShineShader} from './load_texture.js'
import { createDoor } from './objects.js';



/**
 * Interactable base
 */
export class Interactable extends THREE.Group {
  constructor({ label, onInteract, hint = 'Interact (E)' }) {
    super();
    this.isInteractable = true;
    this.label = label || 'Interactable';
    this.onInteract = onInteract || (() => {});
    this.hint = hint;
  }
}


/**
 * Note with password piece
 */
export class Note extends Interactable {
  constructor({ passwordPiece, content, material, position, passwordIndex, useShineShader = false }) {
    super({
      label: 'Note',
      hint: 'Read Note (E)',
    });
    this.passwordPiece = passwordPiece; // e.g., "12", "34", "56"
    this.passwordIndex = passwordIndex; // Position in password (0, 1, 2)
    this.content = content || `Password piece: ${passwordPiece}`;
    this.collected = false;
    this.bobOffset = Math.random() * Math.PI * 2; // Random starting phase for animation
    this.useShineShader = useShineShader;
    this.shineMaterial = null;

    // Create shine shader material if needed
    if (useShineShader) {
      this.shineMaterial = createShineShader();
    }

    // Create a visual representation (paper/note) - make it bigger and vertical so it's easier to see and interact with
    const geom = new THREE.PlaneGeometry(0.3, 0.4);
    const noteMaterial = useShineShader ? this.shineMaterial : material;
    const mesh = new THREE.Mesh(geom, noteMaterial);
    // Keep it vertical (not flat) so it's easier to see and interact with
    mesh.rotation.y = Math.PI; // Face forward
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.add(mesh);
    this.mesh = mesh; // Store reference for animation
    this.baseMaterial = material; // Store base material for switching

    // Add a subtle glow or highlight
    const glowGeom = new THREE.PlaneGeometry(0.35, 0.45);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffffaa,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    glow.rotation.y = Math.PI;
    glow.position.z = -0.01; // Slightly behind the note
    this.add(glow);
    this.glow = glow; // Store reference

    // Add an invisible sphere collider for easier interaction detection
    const sphereGeom = new THREE.SphereGeometry(0.5, 8, 8);
    const sphereMat = new THREE.MeshBasicMaterial({
      visible: false, // Invisible
      transparent: true,
      opacity: 0
    });
    const sphereCollider = new THREE.Mesh(sphereGeom, sphereMat);
    this.add(sphereCollider);
    this.collider = sphereCollider; // Store reference

    if (position) {
      this.position.copy(position);
    }
  }

  update(dt) {
    if (!this.collected) {
      // Update shine shader time uniform if using shader
      if (this.shineMaterial && this.shineMaterial.uniforms) {
        this.shineMaterial.uniforms.time.value += dt;
      }

      // Subtle floating/bobbing animation
      const bobSpeed = 1.5;
      const bobAmount = 0.1;
      this.bobOffset += dt * bobSpeed;
      const bobY = Math.sin(this.bobOffset) * bobAmount;
      this.mesh.position.y = bobY;
      this.glow.position.y = bobY;
      if (this.collider) {
        this.collider.position.y = bobY;
      }
      
      // Gentle rotation (only rotate around Y axis, not the whole note)
      this.mesh.rotation.y = Math.PI + Math.sin(this.bobOffset * 0.5) * 0.2;
    }
  }

  setShineShader(enabled) {
    if (this.collected) return; // Don't change collected notes
    
    if (enabled && !this.shineMaterial) {
      // Create shine shader
      this.shineMaterial = createShineShader();
      this.mesh.material = this.shineMaterial;
    } else if (!enabled && this.shineMaterial) {
      // Switch back to base material
      this.mesh.material = this.baseMaterial;
    }
    this.useShineShader = enabled;
  }
}

/**
 * Door that can be opened and closed
 */
export class HingedDoor extends Interactable {
  constructor({ x=0, y=0, z=0, width=0.6, height=0.8, depth=0.02, openAngle=Math.PI/2, pivotSide='left', frameMat, doorMat, handleMat, rotationY=0 }) {
    super({
      label: 'Door',
      hint: 'Open/Close (E)',
    });
    this.openAngle = openAngle;
    this.open = false;
    
    // Set position and rotation
    this.position.set(x, y, z);
    this.rotation.y = rotationY;
    
    // Create door using createDoor function
    // Position at origin since the parent Interactable handles positioning
    const doorComponents = createDoor(0, 0, 0, width, height, depth, frameMat, doorMat, handleMat, 0);
    
    // Create pivot point for rotation
    const pivot = new THREE.Object3D();
    this.add(pivot);
    
    // Add the door mesh to the pivot
    pivot.add(doorComponents.door);
    
    // Add frame pieces directly to the Interactable (they don't rotate)
    this.add(doorComponents.frameTop);
    this.add(doorComponents.frameLeft);
    this.add(doorComponents.frameRight);
    
    // Position the door so the pivot is at the correct edge
    pivot.position.set(0, 0, 0);
    
    this.pivot = pivot;
    this.frame = doorComponents.frame;

    this.door = doorComponents.door;
    this.frameLeft = doorComponents.frameLeft
    this.frameTop = doorComponents.frameTop;
    this.frameRight = doorComponents.frameRight;
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
export class SlidingDrawer extends Interactable {
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
export class Paper extends Interactable {
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
export class Lock extends Interactable {
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
export class GiantEye extends THREE.Group {
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

