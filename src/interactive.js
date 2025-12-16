import * as THREE from '../CS559-Three/build/three.module.js';
import { loadTextureSafely, createShineShader } from './load_texture.js'
import { Door, Note, SlidingDrawer, Cabinet } from './objects.js';



/**
 * Interactable base
 */
export class Interactable extends THREE.Group {
  constructor({ label, hint = 'Interact (E)' }) {
    super();
    this.isInteractable = true;
    this.label = label || 'Interactable';
    this.hint = hint;
  }

  onInteract() {
    console.log("Default Interact Not Overridden");
  }
}


/**
 * Note with password piece
 */
// Interactable Note class that extends Interactable and uses NoteObject
export class InteractiveNote extends Interactable {
  constructor({ passwordPiece, content, material, position, passwordIndex, useShineShader = false, rotationY = 0 }) {
    super({
      label: 'Note',
      hint: 'Read Note (E)',
    });

    this.passwordPiece = passwordPiece; // e.g., "12", "34", "56"
    this.passwordIndex = passwordIndex; // Position in password (0, 1, 2)
    this.content = content || `Password piece: ${passwordPiece}`;
    this.collected = false;
    this.bobOffset = Math.random() * Math.PI * 2; // Random starting phase for animation

    // Create note using NoteObject class
    // Position at origin since the parent Interactable handles positioning
    const noteObject = new Note({
      x: 0, y: 0, z: 0,
      material,
      useShineShader
    });

    this.add(noteObject);

    // Store references to note components
    this.noteObject = noteObject;
    this.mesh = noteObject.mesh;
    this.glow = noteObject.glow;
    this.collider = noteObject.collider;
    this.shineMaterial = noteObject.shineMaterial;
    this.baseMaterial = noteObject.baseMaterial;
    this.useShineShader = useShineShader;

    if (position) {
      this.position.copy(position);
    }
    this.rotation.y = rotationY;
  }

  setInvisible() {
    this.noteObject.visible = false;
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
    this.noteObject.setShineShader(enabled);
    this.shineMaterial = this.noteObject.shineMaterial;
    this.useShineShader = enabled;
  }
}

/**
 * Door that can be opened and closed
 */
export class InteractiveDoor extends Interactable {
  constructor({ x = 0, y = 0, z = 0, w = 0.6, h = 0.8, t = 0.02, openAngle = Math.PI / 2, frameMat, doorMat, handleMat, rotationY = 0 }) {
    super({
      label: 'Door',
      hint: 'Open/Close (E)',
    });

    this.openAngle = openAngle;
    this.open = false;

    // Set position
    this.position.set(x, y, z);

    // Create door using Door class
    // Position at origin since the parent Interactable handles positioning
    const door = new Door({
      x: 0, y: 0, z: 0,
      w: w, h: h, t: t,
      frameMat, doorMat, handleMat, rotationY
    });

    this.add(door);

    // Store references to door components
    this.frame = door;
    this.hinge = door.hinge;
    this.door = door.door;
    this.frameLeft = door.frameLeft;
    this.frameTop = door.frameTop;
    this.frameRight = door.frameRight;
  }

  onInteract() {
    this.open = !this.open;
  }

  update(dt) {
    let target = 0;
    if (this.open) {
      target = this.openAngle;
    }
    const curr = this.hinge.rotation.y;
    const speed = 4.0;
    this.hinge.rotation.y = THREE.MathUtils.damp(curr, target, speed, dt);
  }
}

/**
 * Simple sliding drawer
 */
export class InteractiveDrawer extends Interactable {
  constructor({ x, y, z, w, h, d, extend = 0.75, drawerMat, handleMat, rotationY = 0 }) {
    super({ label: 'Drawer', hint: 'Open/Close (E)' });
    this.open = false;
    this.extend = extend;
    this.position.set(x, y, z);

    const mesh = new SlidingDrawer({ x: 0, y: 0, z: 0, w, h, d, drawerMat, handleMat, rotationY });
    this.add(mesh);
    this.drawer = mesh.drawer;
  }
  onInteract() {
    this.open = !this.open;
    if (this.sound && this.sound.buffer) {
      if (this.sound.isPlaying) this.sound.stop();
      this.sound.play();
    }
  }

  initAudio(listener, buffer) {
    this.sound = new THREE.PositionalAudio(listener);
    this.sound.setBuffer(buffer);
    this.sound.setRefDistance(1);
    this.sound.setVolume(1.0);
    this.add(this.sound);
  }

  update(dt) {
    let target = 0;
    if (this.open) {
      target = this.extend;
    }
    const curr = this.drawer.position.z;
    this.drawer.position.z = THREE.MathUtils.damp(curr, target, 6.0, dt);
  }
}



export class InteractiveCabinet extends Interactable {
  constructor({ x, y, z, w, h, d, cabinetMat, handleMat, rotationY = 0, label = 'Cabinet Door', openAngle = 5 * Math.PI / 12 }) {
    super({ label, hint: 'Open/Close (E)' });
    this.position.set(x, y, z);

    // Create the cabinet door
    this.cabinet = new Cabinet({ x: 0, y: 0, z: 0, w, h, d, cabinetMat, handleMat, rotationY });
    this.add(this.cabinet);

    // Door state
    this.isOpen = false;
    this.openAngle = -openAngle;
    this.closedAngle = 0;
    this.animationSpeed = 3;
    this.hing = hint;
  }

  onInteract() {
    this.isOpen = !this.isOpen;
    if (this.sound && this.sound.buffer) {
      if (this.sound.isPlaying) this.sound.stop();
      this.sound.play();
    }
  }

  initAudio(listener, buffer) {
    this.sound = new THREE.PositionalAudio(listener);
    this.sound.setBuffer(buffer);
    this.sound.setRefDistance(1);
    this.sound.setVolume(1.0);
    this.add(this.sound);
  }


  update(deltaTime) {

    const targetAngle = this.isOpen ? this.openAngle : this.closedAngle;
    const currentAngle = this.cabinet.hinge.rotation.y;
    const angleDiff = targetAngle - currentAngle;

    if (Math.abs(angleDiff) < 0.01) {
      // Close enough, snap to target
      this.cabinet.hinge.rotation.y = targetAngle;
    } else {
      // Smoothly animate towards target
      const step = Math.sign(angleDiff) * this.animationSpeed * deltaTime;
      if (Math.abs(step) > Math.abs(angleDiff)) {
        this.cabinet.hinge.rotation.y = targetAngle;
      } else {
        this.cabinet.hinge.rotation.y += step;
      }
    }
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
    const allFound = [1, 2, 3, 4].every(i => foundValues.has(i));
    if (allFound) {
      this.unlocked = true;
      return true;
    }
    return false;
  }
}

export class BasementDoor extends InteractiveDoor {
  constructor(args) {
    super(args);
    this.label = 'Basement Door';
    this.hint = 'Locked (Requires Password)';
    this.isLocked = true;

    // Add a temporary lock mesh
    const lockGeom = new THREE.BoxGeometry(0.1, 0.15, 0.05);
    const lockMat = new THREE.MeshStandardMaterial({ color: 0xFF0000 }); // Red for locked
    this.lockMesh = new THREE.Mesh(lockGeom, lockMat);
    // Position on the handle
    this.lockMesh.position.set(args.w - 0.2, 0, 0.05);
    this.door.add(this.lockMesh);
  }

  unlock() {
    this.isLocked = false;
    this.hint = 'Open/Close (E)';
    if (this.lockMesh) {
      this.door.remove(this.lockMesh);
      this.lockMesh = null;
    }
  }

  onInteract() {
    if (this.isLocked) {
      // Maybe play a sound or shake
      return;
    }
    super.onInteract();
  }
}



