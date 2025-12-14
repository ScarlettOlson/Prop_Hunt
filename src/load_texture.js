import * as T from '../CS559-Three/build/three.module.js';



const protoMat = (color) => {
  return new T.MeshStandardMaterial({ 
    color, 
    roughness: 0.8, 
    metalness: 0.0
  });
};

/**
 * Utility: tries to load a texture, falls back to a procedural if missing
 */
export function loadTextureSafely(url, fallbackColor = 0x777777) {
  const loader = new T.TextureLoader();

  return new Promise((resolve) => {
    loader.load(
      url,
      tex => {
        tex.wrapS = tex.wrapT = T.RepeatWrapping;
        resolve(new T.MeshStandardMaterial({
          map: tex,
          roughness: 0.8,
          metalness: 0.0
        }));
      },
      undefined,
      () => {
        // Fallback: return protoMat with the given color
        resolve(protoMat(fallbackColor));
      }
    );
  });
}

/**
 * Create shine shader material for notes
 */
export function createShineShader() {
  return new T.ShaderMaterial({
    uniforms: {
      time: { value: 0.0 },
      baseColor: { value: new T.Color(0xddddcc) },
      shineColor: { value: new T.Color(0xffffff) },
      shineIntensity: { value: 1.5 },
      shineSpeed: { value: 2.0 },
      shineWidth: { value: 0.3 }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vPosition;
      varying vec3 vNormal;
      
      void main() {
        vUv = uv;
        vPosition = position;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 baseColor;
      uniform vec3 shineColor;
      uniform float shineIntensity;
      uniform float shineSpeed;
      uniform float shineWidth;
      
      varying vec2 vUv;
      varying vec3 vPosition;
      varying vec3 vNormal;
      
      void main() {
        vec3 color = baseColor;
        
        // Create moving shine effect
        float shine = sin((vUv.x + vUv.y) * 3.14159 + time * shineSpeed) * 0.5 + 0.5;
        shine = pow(shine, 1.0 / shineWidth);
        
        // Add shine highlight
        vec3 finalColor = mix(color, shineColor, shine * shineIntensity * 0.3);
        
        // Add rim lighting effect
        float rim = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
        rim = pow(rim, 2.0);
        finalColor += shineColor * rim * 0.2;
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
    side: T.DoubleSide,
    transparent: false
  });
}





