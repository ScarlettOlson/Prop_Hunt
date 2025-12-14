import * as THREE from '../CS559-Three/build/three.module.js';


/**
 * 
 * @param {Number} x 
 * @param {Number} y 
 * @param {Number} z 
 * @param {Number} color 
 * @param {Number} intensity 
 */
export function createDirectionalLight(x, y, z, color, intensity) {
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(x, y, z);
    light.castShadow = true;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 50;
    light.shadow.camera.left = -25;
    light.shadow.camera.right = 25;
    light.shadow.camera.top = 25;
    light.shadow.camera.bottom = -25;
    light.shadow.bias = -0.0001;
    return light
}

/**
 * 
 * @param {Number} x 
 * @param {Number} y 
 * @param {Number} z 
 * @param {Number} color 
 * @param {Number} intensity 
 * @param {Number} dist
 */
export function createPointLight(x, y, z, color, intensity, dist) {
    const light = new THREE.PointLight(color, intensity, dist);
    light.position.set(x, y, z);
    light.castShadow = true;
    light.shadow.mapSize.width = 512;
    light.shadow.mapSize.height = 512;
    return light;
}




