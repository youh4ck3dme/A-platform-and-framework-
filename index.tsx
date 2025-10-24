/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { gsap } from 'gsap';

// --- State Management ---
let appState: 'landing' | 'gallery' | 'detail' = 'landing';
let selectedFramework: Framework | null = null;

// DOM Elements
const canvas = document.querySelector('#webgl-canvas') as HTMLCanvasElement;
const landingHeader = document.querySelector('#landing-header') as HTMLElement;
const enterBtn = document.querySelector('#enter-btn') as HTMLButtonElement;
const showcaseContainer = document.querySelector('#showcase-container') as HTMLElement;
const frameworkInfo = document.querySelector('#framework-info') as HTMLElement;
const fpsMetric = document.querySelector('#fps-metric') as HTMLSpanElement;
const memMetric = document.querySelector('#mem-metric') as HTMLSpanElement;
const drawMetric = document.querySelector('#draw-metric') as HTMLSpanElement;
const detailView = document.querySelector('#detail-view') as HTMLElement;
const backBtn = document.querySelector('#back-btn') as HTMLButtonElement;
const detailLogo = document.querySelector('#detail-logo') as HTMLImageElement;
const detailName = document.querySelector('#detail-name') as HTMLElement;
const detailDescription = document.querySelector('#detail-description') as HTMLElement;

// 1. SCENE SETUP
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 0, 50);

const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
  alpha: true,
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

// 2. LIGHTING
const pointLight = new THREE.PointLight(0x00c3ff, 500);
pointLight.position.set(10, 10, 20);
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(pointLight, ambientLight);

// 3. OBJECTS
// "Collaboration" representation
const collaborationMaterial = new THREE.MeshStandardMaterial({
    color: 0x00c3ff,
    metalness: 0.8,
    roughness: 0.3,
    emissive: 0x00c3ff,
    emissiveIntensity: 0.15,
});
const torus1 = new THREE.Mesh( new THREE.TorusGeometry(15, 0.8, 16, 100), collaborationMaterial );
const torus2 = new THREE.Mesh( new THREE.TorusGeometry(15, 0.8, 16, 100), collaborationMaterial );
torus2.rotation.y = Math.PI / 2;
const collaborationGroup = new THREE.Group();
collaborationGroup.add(torus1, torus2);
scene.add(collaborationGroup);


// Framework Gallery
interface Framework {
    name: string;
    logo: string;
    description: string;
}

const frameworks: Framework[] = [
    { name: 'React', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original.svg', description: 'A JavaScript library for building user interfaces, focusing on component-based architecture.' },
    { name: 'Angular', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/angular/angular-original.svg', description: 'A platform and framework for building single-page client applications using HTML and TypeScript.' },
    { name: 'Vue', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/vuejs/vuejs-original.svg', description: 'The Progressive JavaScript Framework for building user interfaces and single-page applications.' },
    { name: 'Svelte', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/svelte/svelte-original.svg', description: 'A radical new approach to building user interfaces. Svelte compiles your code to tiny, framework-less vanilla JS.' },
];
const cardsGroup = new THREE.Group();
const textureLoader = new THREE.TextureLoader();
const cardGeometry = new THREE.PlaneGeometry(12, 12);
const cardMaterial = new THREE.MeshStandardMaterial({
    color: 0x00c3ff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.1,
    metalness: 0.9,
    roughness: 0.1,
    emissive: 0x00c3ff,
    emissiveIntensity: 0.3,
});

frameworks.forEach((fw, index) => {
    const angle = (index / frameworks.length) * Math.PI * 2;
    const radius = 25;
    const card = new THREE.Mesh(cardGeometry, cardMaterial.clone());

    textureLoader.load(fw.logo, (texture) => {
        const logoMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.1,
        });
        const logoMesh = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), logoMaterial);
        logoMesh.position.z = 0.1;
        card.add(logoMesh);
    });

    card.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    card.lookAt(scene.position);
    card.userData = { name: fw.name, initialRotation: card.rotation.clone() };
    cardsGroup.add(card);
});
cardsGroup.visible = false;
scene.add(cardsGroup);


// 4. STARFIELD
const starVertices = [];
for (let i = 0; i < 15000; i++) {
    const x = THREE.MathUtils.randFloatSpread(2000);
    const y = THREE.MathUtils.randFloatSpread(2000);
    const z = THREE.MathUtils.randFloatSpread(2000);
    starVertices.push(x, y, z);
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, sizeAttenuation: true, transparent: true, opacity: 0.8 });
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// 5. MOUSE INTERACTION & RAYCASTING
const mousePosition = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
let intersectedObject: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial> | null = null;
document.addEventListener('mousemove', (event) => {
    mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
    mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

document.addEventListener('click', () => {
    if (appState === 'gallery' && intersectedObject) {
        const frameworkName = intersectedObject.userData.name;
        if (typeof frameworkName === 'string') {
            window.location.hash = `#/framework/${frameworkName.toLowerCase()}`;
        }
    }
});

// 6. ANIMATION & PERFORMANCE MONITORING
const clock = new THREE.Clock();
let lastTime = 0;
let frameCount = 0;

function animate() {
  requestAnimationFrame(animate);

  const elapsedTime = clock.getElapsedTime();
  const deltaTime = elapsedTime - lastTime;
  lastTime = elapsedTime;

  // Update metrics (throttled)
  frameCount++;
  if (frameCount % 10 === 0) {
    const fps = (1 / deltaTime).toFixed(0);
    fpsMetric.textContent = fps;
    const memory = (performance as any).memory;
    if (memory) {
      memMetric.textContent = `${(memory.usedJSHeapSize / 1048576).toFixed(1)} MB`;
    } else {
      memMetric.textContent = 'N/A';
    }
    drawMetric.textContent = renderer.info.render.calls.toString();
  }

  stars.rotation.y = elapsedTime * 0.02;

  // State-based animation
  if (appState === 'landing') {
      collaborationGroup.rotation.y = elapsedTime * 0.1;
      collaborationGroup.rotation.x = elapsedTime * 0.05;
      const parallaxFactor = 5;
      camera.position.x += (mousePosition.x * parallaxFactor - camera.position.x) * 0.02;
      camera.position.y += (mousePosition.y * parallaxFactor - camera.position.y) * 0.02;
      camera.lookAt(collaborationGroup.position);
  } else if (appState === 'gallery') {
      // Rotate gallery based on mouse
      cardsGroup.rotation.y += (mousePosition.x * 0.5 - cardsGroup.rotation.y) * 0.05;

      // Raycasting for hover
      raycaster.setFromCamera(mousePosition, camera);
      const intersects = raycaster.intersectObjects(cardsGroup.children);

      if (intersects.length > 0) {
          const firstIntersect = intersects[0].object as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
          if (intersectedObject !== firstIntersect) {
              if (intersectedObject) { // Reset previous
                  const previousObject = intersectedObject;
                  gsap.to(previousObject.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: 'power2.out' });
                  // Animate emissive intensity via a proxy object to avoid GSAP errors
                  const proxy = { intensity: previousObject.material.emissiveIntensity };
                  gsap.to(proxy, {
                      intensity: 0.3,
                      duration: 0.5,
                      onUpdate: () => { previousObject.material.emissiveIntensity = proxy.intensity; }
                  });
              }
              intersectedObject = firstIntersect;
              gsap.to(intersectedObject.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 0.5, ease: 'power2.out' });
              // Animate emissive intensity via a proxy object
              const proxy = { intensity: intersectedObject.material.emissiveIntensity };
              gsap.to(proxy, {
                  intensity: 0.8,
                  duration: 0.5,
                  onUpdate: () => {
                      if (intersectedObject) {
                        intersectedObject.material.emissiveIntensity = proxy.intensity;
                      }
                  }
              });
              frameworkInfo.textContent = intersectedObject.userData.name;
              frameworkInfo.classList.add('visible');
          }
      } else {
          if (intersectedObject) { // Reset on mouse out
              const previousObject = intersectedObject;
              gsap.to(previousObject.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: 'power2.out' });
              const proxy = { intensity: previousObject.material.emissiveIntensity };
              gsap.to(proxy, {
                  intensity: 0.3,
                  duration: 0.5,
                  onUpdate: () => { previousObject.material.emissiveIntensity = proxy.intensity; }
              });
              intersectedObject = null;
              frameworkInfo.classList.remove('visible');
          }
      }
  }

  renderer.render(scene, camera);
}


// 7. UI & SCENE TRANSITIONS
function transitionToGallery() {
    appState = 'gallery';
    window.location.hash = '#/gallery';

    gsap.timeline()
        .to(landingHeader, { opacity: 0, duration: 0.5, ease: 'power2.in', onComplete: () => landingHeader.classList.add('hidden') })
        .to(collaborationGroup.scale, { x: 0.1, y: 0.1, z: 0.1, duration: 1, ease: 'power3.inOut' }, "-=0.2")
        .to(collaborationGroup.rotation, { z: Math.PI, duration: 1, ease: 'power3.inOut' }, "<")
        .call(() => {
            collaborationGroup.visible = false;
            cardsGroup.visible = true;
            showcaseContainer.classList.remove('hidden');
        })
        .from(cardsGroup.position, { y: -50, duration: 1, ease: 'power3.out' })
        .to(showcaseContainer, { opacity: 1, duration: 0.5 }, "-=0.5");
}

function transitionToDetail(framework: Framework) {
    appState = 'detail';
    selectedFramework = framework;

    // Populate detail view
    detailName.textContent = framework.name;
    detailLogo.src = framework.logo;
    detailLogo.alt = `${framework.name} logo`;
    detailDescription.textContent = framework.description;

    const targetCard = cardsGroup.children.find(c => c.userData.name === framework.name);
    if (!targetCard) return;

    gsap.timeline()
        .to(showcaseContainer, { opacity: 0, duration: 0.5, ease: 'power2.in' })
        .call(() => {
            detailView.classList.remove('hidden');
        })
        .to(camera.position, {
            x: targetCard.position.x + 5,
            y: targetCard.position.y,
            z: targetCard.position.z + 15,
            duration: 1.2,
            ease: 'power3.inOut',
            onUpdate: () => camera.lookAt(targetCard.position)
        }, "<")
        .to(cardsGroup.rotation, {
            y: -frameworks.findIndex(f => f.name === framework.name) * (Math.PI * 2 / frameworks.length),
            duration: 1.2,
            ease: 'power3.inOut'
        }, "<")
        .to(targetCard.rotation, {
            x: targetCard.userData.initialRotation.x,
            y: targetCard.userData.initialRotation.y,
            z: targetCard.userData.initialRotation.z,
            duration: 1.2,
            ease: 'power3.inOut'
        }, "<");
}

function transitionFromDetailToGallery() {
    appState = 'gallery';
    window.location.hash = '#/gallery';
    selectedFramework = null;

    gsap.timeline()
        .call(() => {
            detailView.classList.add('hidden');
        })
        .to(camera.position, {
            x: 0, y: 0, z: 50,
            duration: 1.2,
            ease: 'power3.inOut',
            onUpdate: () => camera.lookAt(0, 0, 0)
        })
        .to(showcaseContainer, { opacity: 1, duration: 0.5, ease: 'power2.out' }, "-=0.5");
}


// 8. ROUTING
function handleHashChange() {
    const hash = window.location.hash;

    if (hash.startsWith('#/framework/')) {
        const frameworkName = hash.split('/')[2];
        if (typeof frameworkName === 'string') {
            const framework = frameworks.find(f => f.name.toLowerCase() === frameworkName);
            if (framework && appState !== 'detail') {
                transitionToDetail(framework);
            }
        }
    } else if (hash === '#/gallery') {
        if (appState === 'landing') {
            transitionToGallery();
        } else if (appState === 'detail') {
            transitionFromDetailToGallery();
        }
    } else {
        // Handle root or unknown hash
        if (appState !== 'landing') {
            // Logic to transition back to landing if needed, for now we stay
        }
    }
}


// Initial setup
enterBtn.addEventListener('click', transitionToGallery);
backBtn.addEventListener('click', transitionFromDetailToGallery);
window.addEventListener('hashchange', handleHashChange);
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start the loop
animate();

// Initial route handling
handleHashChange();
if (!window.location.hash) {
    appState = 'landing';
}
