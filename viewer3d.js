/*
 * MISTY - 3D Mirror Studio Visualizer
 * Core WebGL module powered by Three.js
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Visualizer State
let scene, camera, renderer, controls;
let mirrorGroup; // Holds all parts of the mirror
let glassMesh, frameMesh, ledGlowMesh, gridMesh;
let ledLight;
let wallMesh;

// Configurable Parameters
let currentShape = 'round';       // round, arch, rectangle, organic
let currentFinish = 'brass';       // brass, black, chrome, wood
let currentLedEnabled = true;
let currentLedColor = 'warm';      // candle, warm, cool, amber
let currentLedBrightness = 0.8;
let currentWall = 'plaster';       // plaster, concrete, beige, brick
let currentWidth = 80;             // in cm (0.4m to 1.5m scale)
let currentHeight = 80;            // in cm (0.4m to 2.2m scale)

// Preset Prices (base prices)
const shapeBasePrices = {
  round: 450,
  arch: 600,
  rectangle: 520,
  organic: 850
};

const finishMultipliers = {
  brass: 1.2,
  black: 1.0,
  chrome: 1.15,
  wood: 1.25
};

// Procedural Texture Generators
// Generates a beautiful Oak Wood texture dynamically on a canvas
function generateOakWoodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Base beige-wood color
  ctx.fillStyle = '#dfcaa0';
  ctx.fillRect(0, 0, 512, 512);

  // Oak grains
  ctx.strokeStyle = '#b8996b';
  ctx.lineWidth = 1;
  for (let i = 0; i < 120; i++) {
    ctx.beginPath();
    let x = Math.random() * 512;
    ctx.moveTo(x, 0);
    // Draw wavy lines to simulate wood grains
    for (let y = 0; y <= 512; y += 10) {
      const wave = Math.sin(y * 0.05 + x) * 2;
      ctx.lineTo(x + wave, y);
    }
    ctx.globalAlpha = Math.random() * 0.3 + 0.1;
    ctx.stroke();
  }
  
  // Knots and fine details
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#543f1d';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * 512, Math.random() * 512, Math.random() * 20 + 5, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

// Procedural bump map for Plaster Wall texture
function generatePlasterNoise() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#808080'; // Neutral grey for bump
  ctx.fillRect(0, 0, 512, 512);
  
  // Paint rollers pattern
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 20000; i++) {
    ctx.globalAlpha = Math.random() * 0.08;
    ctx.beginPath();
    ctx.arc(Math.random() * 512, Math.random() * 512, Math.random() * 3 + 1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#000000';
  for (let i = 0; i < 20000; i++) {
    ctx.globalAlpha = Math.random() * 0.08;
    ctx.beginPath();
    ctx.arc(Math.random() * 512, Math.random() * 512, Math.random() * 3 + 1, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Procedural Concrete Texture
function generateConcreteTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#7a7d85';
  ctx.fillRect(0, 0, 1024, 1024);
  
  // Broad concrete shifts
  for (let i = 0; i < 15; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#61636b' : '#9498a1';
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.arc(Math.random() * 1024, Math.random() * 1024, Math.random() * 300 + 100, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Concrete grain/noise
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 50000; i++) {
    ctx.globalAlpha = Math.random() * 0.04;
    ctx.fillRect(Math.random() * 1024, Math.random() * 1024, Math.random() * 4 + 1, Math.random() * 4 + 1);
  }
  ctx.fillStyle = '#000000';
  for (let i = 0; i < 50000; i++) {
    ctx.globalAlpha = Math.random() * 0.05;
    ctx.fillRect(Math.random() * 1024, Math.random() * 1024, Math.random() * 4 + 1, Math.random() * 4 + 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Procedural Brick Texture
function generateBrickTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  
  // Mortar background
  ctx.fillStyle = '#9e9e9e';
  ctx.fillRect(0, 0, 1024, 1024);
  
  // Brick dimensions
  const brickWidth = 128;
  const brickHeight = 64;
  const gutter = 8;
  
  for (let y = 0; y < 1024; y += brickHeight + gutter) {
    const isShifted = (y / (brickHeight + gutter)) % 2 === 0;
    const startX = isShifted ? -(brickWidth / 2) : 0;
    
    for (let x = startX; x < 1024 + brickWidth; x += brickWidth + gutter) {
      // Brick base colors
      const r = Math.floor(Math.random() * 40) + 110; // Red
      const g = Math.floor(Math.random() * 30) + 50;  // Brownish red
      const b = Math.floor(Math.random() * 20) + 40;
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(x, y, brickWidth, brickHeight);
      
      // Brick textures
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.globalAlpha = 0.3;
      for (let i = 0; i < 15; i++) {
        ctx.fillRect(x + Math.random() * (brickWidth - 20), y + Math.random() * (brickHeight - 10), Math.random() * 20 + 5, Math.random() * 10 + 5);
      }
      ctx.globalAlpha = 1.0;
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.5, 1.5);
  return texture;
}

// Programmatic Environment Map Creator
// Sets up elegant gradient skybox reflecting glowing lights for premium glossy mirror realism
function createProceduralEnvMap() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Background gradient slate-blue
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#0c0e14');
  grad.addColorStop(1, '#222836');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Softbox studio lighting simulation
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 45;

  // Softbox 1 (Left window style)
  ctx.fillRect(40, 30, 80, 110);
  
  // Softbox 2 (Right light strip)
  ctx.fillRect(380, 50, 60, 140);
  
  // Softbox 3 (Top ambient light panel)
  ctx.fillRect(190, 15, 130, 25);

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  return texture;
}

// LED Color temperature mapping
const LED_COLORS = {
  candle: new THREE.Color(0xffaa44), // Warm amber candlelight
  warm: new THREE.Color(0xffecd2),   // Luxurious 3000K warm white
  cool: new THREE.Color(0xd2e5ff),   // Elegant 5000K daylight white
  amber: new THREE.Color(0xff7722)   // Golden glowing amber
};

// ==========================================
// GEOMETRY GENERATORS (Procedural Mesh Builders)
// ==========================================

// 1. Arched Geometry Builder
function buildArchShape(w, h) {
  const shape = new THREE.Shape();
  const radius = w / 2;
  const straightHeight = h - radius;

  // Draw arch profile starting bottom left
  shape.moveTo(-w / 2, -h / 2);
  shape.lineTo(-w / 2, -h / 2 + straightHeight);
  // Top arched crown
  shape.absarc(0, -h / 2 + straightHeight, radius, Math.PI, 0, true);
  shape.lineTo(w / 2, -h / 2);
  shape.closePath();

  return shape;
}

// 2. Modern Asymmetrical Organic Shape
function buildOrganicShape(w, h) {
  const shape = new THREE.Shape();
  
  // Approximate a stylized liquid asymmetric blob using bezier curves
  // Scales organically with width (w) and height (h)
  const halfW = w / 2;
  const halfH = h / 2;

  shape.moveTo(0, -halfH);
  shape.bezierCurveTo(halfW * 0.9, -halfH * 0.9, halfW * 1.2, -halfH * 0.2, halfW * 0.85, halfH * 0.3);
  shape.bezierCurveTo(halfW * 0.6, halfH * 0.75, halfW * 0.1, halfH * 1.1, -halfW * 0.4, halfH * 0.85);
  shape.bezierCurveTo(-halfW * 0.9, halfH * 0.6, -halfW * 1.1, -halfH * 0.1, -halfW * 0.8, -halfH * 0.6);
  shape.bezierCurveTo(-halfW * 0.6, -halfH * 0.9, -halfW * 0.3, -halfH * 1.0, 0, -halfH);

  return shape;
}

// ==========================================
// CORE 3D VIEWER INITIALIZATION
// ==========================================
export function initViewer(canvasId, containerId) {
  const canvas = document.getElementById(canvasId);
  const container = document.getElementById(containerId);

  if (!canvas || !container) return;

  // 1. Scene Setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f1117); // Dark luxury backdrop match
  
  // Set Environment Map for high fidelity gloss
  const envMap = createProceduralEnvMap();
  scene.environment = envMap;

  // 2. Camera Setup
  camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 2.2);

  // 3. Renderer Setup
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  // 4. OrbitControls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2 + 0.05; // Lock camera from rotating under the floor
  controls.minDistance = 0.8;
  controls.maxDistance = 4.0;
  controls.enablePan = true;

  // 5. Ambient & Direct Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambientLight);

  // Direct Key Light to catch frame metal bevels and shadows
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
  keyLight.position.set(1.5, 2, 2.5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 10;
  scene.add(keyLight);

  // Soft Fill Light
  const fillLight = new THREE.DirectionalLight(0xd2e5ff, 0.4);
  fillLight.position.set(-1.5, -0.5, 1);
  scene.add(fillLight);

  // 6. LED Light Source (Point light located right behind mirror, casting glow on the wall)
  ledLight = new THREE.PointLight(LED_COLORS[currentLedColor], 0, 2.5, 1.2);
  ledLight.position.set(0, 0, -0.05); // Placed slightly behind mirror
  ledLight.castShadow = false;
  scene.add(ledLight);

  // 7. Backdrop Wall Creation
  const wallGeo = new THREE.PlaneGeometry(10, 10);
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x22252c,
    roughness: 0.95,
    metalness: 0.05
  });
  
  wallMesh = new THREE.Mesh(wallGeo, wallMat);
  wallMesh.position.set(0, 0, -0.1); // Wall sits 10cm behind origin
  wallMesh.receiveShadow = true;
  scene.add(wallMesh);

  // 8. Mirror Group
  mirrorGroup = new THREE.Group();
  scene.add(mirrorGroup);

  // Initial Builds
  updateWall(currentWall);
  buildMirror();

  // 9. Resize Handling
  window.addEventListener('resize', handleResize);

  // Animation Loop
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  // Hide loading spinner once ready
  const spinner = document.getElementById('viewer-loading-spinner');
  if (spinner) spinner.style.display = 'none';
}

function handleResize() {
  const container = document.getElementById('canvas-container-3d');
  if (!container || !renderer || !camera) return;
  
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  
  renderer.setSize(container.clientWidth, container.clientHeight);
}

// ==========================================
// BUILD PROCEDURAL MIRROR MESHES
// ==========================================
function buildMirror() {
  // Clean up existing meshes
  if (glassMesh) mirrorGroup.remove(glassMesh);
  if (frameMesh) mirrorGroup.remove(frameMesh);
  if (ledGlowMesh) mirrorGroup.remove(ledGlowMesh);
  if (gridMesh) mirrorGroup.remove(gridMesh);

  // Dimensions scaled to meters
  const w = currentWidth / 100;
  const h = currentHeight / 100;

  // 1. Get Materials
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 1.0,
    roughness: 0.0,
    reflectivity: 1.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.0,
    envMapIntensity: 1.2
  });

  const frameMaterial = getFrameMaterial();

  const ledGlowMaterial = new THREE.MeshBasicMaterial({
    color: LED_COLORS[currentLedColor],
    transparent: true,
    opacity: currentLedEnabled ? currentLedBrightness * 0.8 : 0
  });

  // Apply LED point light values
  if (currentLedEnabled) {
    ledLight.intensity = currentLedBrightness * 6.0; // PBR multiplier
    ledLight.color = LED_COLORS[currentLedColor];
  } else {
    ledLight.intensity = 0;
  }

  // 2. Shape Geometries
  let glassGeo, frameGeo, ledGlowGeo;

  if (currentShape === 'round') {
    // Round is perfect cylinder
    const radius = w / 2;
    glassGeo = new THREE.CylinderGeometry(radius, radius, 0.01, 64);
    glassGeo.rotateX(Math.PI / 2); // Align flat facing camera
    
    // Extruded ring frame
    const frameShape = new THREE.Shape();
    frameShape.absarc(0, 0, radius + 0.012, 0, Math.PI * 2, false);
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, radius, 0, Math.PI * 2, true);
    frameShape.holes.push(holePath);

    frameGeo = new THREE.ExtrudeGeometry(frameShape, {
      depth: 0.035,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.003,
      bevelThickness: 0.003
    });
    frameGeo.center(); // Center frame anchor

    // Led backing glow mesh
    ledGlowGeo = new THREE.CylinderGeometry(radius - 0.015, radius - 0.015, 0.01, 64);
    ledGlowGeo.rotateX(Math.PI / 2);

  } else if (currentShape === 'arch') {
    // Arch shape profile
    const glassShape = buildArchShape(w, h);
    glassGeo = new THREE.ExtrudeGeometry(glassShape, {
      depth: 0.01,
      bevelEnabled: false
    });
    glassGeo.center();

    // Frame (slightly expanded outline extruded)
    const frameOuterShape = buildArchShape(w + 0.024, h + 0.012);
    // Draw offset inside hole
    const frameInnerShape = buildArchShape(w, h);
    frameOuterShape.holes.push(frameInnerShape);

    frameGeo = new THREE.ExtrudeGeometry(frameOuterShape, {
      depth: 0.04,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.003,
      bevelThickness: 0.003
    });
    frameGeo.center();

    // LED glow backer
    const ledShape = buildArchShape(w - 0.03, h - 0.03);
    ledGlowGeo = new THREE.ExtrudeGeometry(ledShape, {
      depth: 0.01,
      bevelEnabled: false
    });
    ledGlowGeo.center();

  } else if (currentShape === 'rectangle') {
    // Standard flat box geometries
    glassGeo = new THREE.BoxGeometry(w, h, 0.01);
    
    // Outer border frame
    const frameOuterShape = new THREE.Shape();
    frameOuterShape.moveTo(-w/2 - 0.012, -h/2 - 0.012);
    frameOuterShape.lineTo(-w/2 - 0.012, h/2 + 0.012);
    frameOuterShape.lineTo(w/2 + 0.012, h/2 + 0.012);
    frameOuterShape.lineTo(w/2 + 0.012, -h/2 - 0.012);
    frameOuterShape.closePath();

    const frameInnerHole = new THREE.Path();
    frameInnerHole.moveTo(-w/2, -h/2);
    frameInnerHole.lineTo(-w/2, h/2);
    frameInnerHole.lineTo(w/2, h/2);
    frameInnerHole.lineTo(w/2, -h/2);
    frameInnerHole.closePath();
    frameOuterShape.holes.push(frameInnerHole);

    frameGeo = new THREE.ExtrudeGeometry(frameOuterShape, {
      depth: 0.035,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.003,
      bevelThickness: 0.003
    });
    frameGeo.center();

    // Industrial Grid overlay (Only rendered if Black finish is selected, imitating grid panels!)
    if (currentFinish === 'black') {
      const gridGroup = new THREE.Group();
      
      const gridMat = frameMaterial;
      const barThickness = 0.006;
      const barDepth = 0.012;

      // Draw horizontal crossbars
      const horizontalGeo = new THREE.BoxGeometry(w, barThickness, barDepth);
      const hBar1 = new THREE.Mesh(horizontalGeo, gridMat);
      hBar1.position.set(0, h * 0.16, 0.006);
      const hBar2 = new THREE.Mesh(horizontalGeo, gridMat);
      hBar2.position.set(0, -h * 0.16, 0.006);
      gridGroup.add(hBar1, hBar2);

      // Draw vertical crossbars
      const verticalGeo = new THREE.BoxGeometry(barThickness, h, barDepth);
      const vBar1 = new THREE.Mesh(verticalGeo, gridMat);
      vBar1.position.set(w * 0.25, 0, 0.006);
      const vBar2 = new THREE.Mesh(verticalGeo, gridMat);
      vBar2.position.set(-w * 0.25, 0, 0.006);
      gridGroup.add(vBar1, vBar2);

      gridMesh = gridGroup;
      mirrorGroup.add(gridMesh);
    }

    // LED glow backer
    ledGlowGeo = new THREE.BoxGeometry(w - 0.03, h - 0.03, 0.01);

  } else if (currentShape === 'organic') {
    // Extruded organic asymmetrical shapes
    const organicGlassPath = buildOrganicShape(w, h);
    glassGeo = new THREE.ExtrudeGeometry(organicGlassPath, {
      depth: 0.01,
      bevelEnabled: false
    });
    glassGeo.center();

    // Frame (slightly expanded outline)
    const organicOuterShape = buildOrganicShape(w + 0.025, h + 0.025);
    const organicInnerHole = buildOrganicShape(w, h);
    organicOuterShape.holes.push(organicInnerHole);

    frameGeo = new THREE.ExtrudeGeometry(organicOuterShape, {
      depth: 0.038,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.003,
      bevelThickness: 0.003
    });
    frameGeo.center();

    // LED glow backer
    const organicLedPath = buildOrganicShape(w - 0.03, h - 0.03);
    ledGlowGeo = new THREE.ExtrudeGeometry(organicLedPath, {
      depth: 0.01,
      bevelEnabled: false
    });
    ledGlowGeo.center();
  }

  // 3. Create Meshes
  glassMesh = new THREE.Mesh(glassGeo, glassMaterial);
  glassMesh.castShadow = true;
  glassMesh.receiveShadow = true;

  frameMesh = new THREE.Mesh(frameGeo, frameMaterial);
  frameMesh.castShadow = true;
  frameMesh.receiveShadow = true;
  // Shift frame backward so mirror glass sits inside bevel beautifully
  frameMesh.position.set(0, 0, -0.015);

  ledGlowMesh = new THREE.Mesh(ledGlowGeo, ledGlowMaterial);
  ledGlowMesh.position.set(0, 0, -0.02); // Position back to shine on wall

  // Add all meshes to the interactive group
  mirrorGroup.add(glassMesh);
  mirrorGroup.add(frameMesh);
  mirrorGroup.add(ledGlowMesh);

  // Center group bounding box
  const box = new THREE.Box3().setFromObject(mirrorGroup);
  const center = box.getCenter(new THREE.Vector3());
  mirrorGroup.position.y = -center.y; // Ensure mirror centers horizontally and vertically in viewer
}

// Frame finish material mapper
function getFrameMaterial() {
  switch (currentFinish) {
    case 'brass':
      return new THREE.MeshPhysicalMaterial({
        color: 0xc2a070,       // Rich champagne gold/brass
        roughness: 0.16,       // Slight brush roughness
        metalness: 0.9,        // High PBR metalness
        clearcoat: 0.3,
        clearcoatRoughness: 0.1
      });
      
    case 'black':
      return new THREE.MeshPhysicalMaterial({
        color: 0x18181c,       // Matte charcoal steel
        roughness: 0.38,
        metalness: 0.75
      });
      
    case 'chrome':
      return new THREE.MeshPhysicalMaterial({
        color: 0xeeeeee,       // Polished chrome mirror finish
        roughness: 0.05,
        metalness: 0.98,
        clearcoat: 1.0,
        clearcoatRoughness: 0.02
      });
      
    case 'wood':
      const woodTex = generateOakWoodTexture();
      return new THREE.MeshStandardMaterial({
        map: woodTex,
        roughness: 0.72,
        metalness: 0.05
      });

    default:
      return new THREE.MeshStandardMaterial({ color: 0xcccccc });
  }
}

// ==========================================
// EXTERNAL CONTROL STATE MODIFIERS
// ==========================================

export function updateShape(shape) {
  currentShape = shape;
  buildMirror();
  return calculatePrice();
}

export function updateFinish(finish) {
  currentFinish = finish;
  buildMirror();
  return calculatePrice();
}

export function updateLED(enabled, color, brightness) {
  currentLedEnabled = enabled;
  if (color) currentLedColor = color;
  if (brightness !== undefined) currentLedBrightness = brightness;
  
  buildMirror();
}

export function updateDimensions(w, h) {
  currentWidth = w;
  currentHeight = h;
  buildMirror();
  return calculatePrice();
}

export function updateWall(wallType) {
  currentWall = wallType;
  if (!wallMesh) return;

  const plasterBump = generatePlasterNoise();

  switch (wallType) {
    case 'plaster':
      wallMesh.material = new THREE.MeshStandardMaterial({
        color: 0x22252c,       // Dark slate/grey
        bumpMap: plasterBump,
        bumpScale: 0.008,
        roughness: 0.9,
        metalness: 0.05
      });
      break;

    case 'concrete':
      const concreteTex = generateConcreteTexture();
      wallMesh.material = new THREE.MeshStandardMaterial({
        map: concreteTex,
        bumpMap: concreteTex,
        bumpScale: 0.015,
        roughness: 0.82,
        metalness: 0.1
      });
      break;

    case 'beige':
      wallMesh.material = new THREE.MeshStandardMaterial({
        color: 0xd8caa8,       // Warm cozy beige
        bumpMap: plasterBump,
        bumpScale: 0.005,
        roughness: 0.95,
        metalness: 0.0
      });
      break;

    case 'brick':
      const brickTex = generateBrickTexture();
      wallMesh.material = new THREE.MeshStandardMaterial({
        map: brickTex,
        bumpMap: brickTex,
        bumpScale: 0.02,
        roughness: 0.85,
        metalness: 0.05
      });
      break;
  }
  
  // Inform material map update has occurred
  wallMesh.material.needsUpdate = true;
}

// Calculate the retail price dynamically based on material selection and physical size
export function calculatePrice() {
  const base = shapeBasePrices[currentShape] || 400;
  const finishMult = finishMultipliers[currentFinish] || 1.0;
  
  // Size calculation (Width x Height in square decimeters scaled)
  const sizeArea = (currentWidth * currentHeight) / 10000; // in square meters
  const baseArea = 0.64; // base size (80cm x 80cm)
  const sizeFactor = sizeArea / baseArea;
  const sizeSurcharge = (sizeFactor > 1.0) ? (sizeFactor - 1.0) * 180 : (sizeFactor - 1.0) * 80;

  // LED Surcharge
  const ledSurcharge = currentLedEnabled ? 150 : 0;

  // Round pricing mathematically
  let total = (base * finishMult * (1 + (sizeFactor - 1) * 0.4)) + ledSurcharge;
  total = Math.ceil(total / 10) * 10; // Round to nearest $10
  
  return total;
}
