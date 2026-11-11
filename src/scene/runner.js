import * as THREE from 'three';

const SKIN = new THREE.Color('#e0b18f');
const SKIN_PALE = new THREE.Color('#ecdcd0');
const BELT_TOP = 0.165;
const HIP_HEIGHT = 0.95;

// A limb hangs down from its pivot (the joint at its top).
function limb(len, radius, material) {
  const pivot = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, len - 2 * radius, 4, 10), material);
  mesh.position.y = -len / 2;
  pivot.add(mesh);
  return pivot;
}

function buildPerson() {
  const skin = new THREE.MeshStandardMaterial({ color: SKIN.clone(), roughness: 0.75 });
  const shirt = new THREE.MeshStandardMaterial({ color: '#4f7cac', roughness: 0.8 });
  const pants = new THREE.MeshStandardMaterial({ color: '#37474f', roughness: 0.8 });
  const shoe = new THREE.MeshStandardMaterial({ color: '#222222' });

  const root = new THREE.Group(); // origin at the hips
  const torso = new THREE.Group();
  root.add(torso);
  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.32, 4, 12), shirt);
  chest.position.y = 0.3;
  torso.add(chest);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 16), skin);
  head.position.y = 0.72;
  torso.add(head);

  const legs = [];
  const arms = [];
  for (const side of [-1, 1]) {
    const hip = limb(0.45, 0.07, pants);
    hip.position.set(0, 0, side * 0.1);
    root.add(hip);
    const knee = limb(0.45, 0.06, pants);
    knee.position.y = -0.45;
    hip.add(knee);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.09), shoe);
    foot.position.set(-0.05, -0.47, 0);
    knee.add(foot);
    legs.push({ hip, knee });

    const shoulder = limb(0.3, 0.05, shirt);
    shoulder.position.set(0, 0.52, side * 0.23);
    torso.add(shoulder);
    const elbow = limb(0.28, 0.045, skin);
    elbow.position.y = -0.3;
    shoulder.add(elbow);
    arms.push({ shoulder, elbow, side });
  }
  return { root, torso, legs, arms, skin };
}

function beltTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 8;
  const x = c.getContext('2d');
  x.fillStyle = '#2b2f33';
  x.fillRect(0, 0, 128, 8);
  x.fillStyle = '#3d444b';
  x.fillRect(0, 0, 10, 8);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(12, 1);
  return t;
}

function buildTreadmill() {
  const g = new THREE.Group();
  const frame = new THREE.MeshStandardMaterial({ color: '#5f6b73', roughness: 0.6 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.16, 0.86), frame);
  base.position.y = 0.08;
  g.add(base);
  const tex = beltTexture();
  const belt = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.6), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
  belt.rotation.x = -Math.PI / 2;
  belt.position.y = BELT_TOP;
  g.add(belt);
  for (const z of [-0.4, 0.4]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1), frame);
    post.position.set(-0.98, 0.7, z);
    g.add(post);
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.9), frame);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(-0.5, 1.05, z);
    g.add(rail);
  }
  const consoleBox = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.86), frame);
  consoleBox.position.set(-1.0, 1.25, 0);
  g.add(consoleBox);
  return { group: g, tex, beltLength: 1.8 };
}

export function createScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e9eef2');
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(1.2, 1.7, 4.2);
  camera.lookAt(-0.1, 1.0, 0);
  scene.add(new THREE.HemisphereLight('#ffffff', '#8a9aa8', 1.2));
  const sun = new THREE.DirectionalLight('#ffffff', 1.4);
  sun.position.set(3, 5, 2);
  scene.add(sun);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({ color: '#cfd8dc' }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const tm = buildTreadmill();
  scene.add(tm.group);
  const person = buildPerson();
  person.root.position.set(0.1, BELT_TOP + HIP_HEIGHT, 0);
  scene.add(person.root);

  new ResizeObserver(() => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }).observe(container);

  let phase = 0;

  return {
    update(dt, { speed, cues }) {
      const v = speed / 3.6; // m/s
      tm.tex.offset.x += ((v * dt) / tm.beltLength) * tm.tex.repeat.x;
      const strideHz = speed > 0 ? 0.75 + speed * 0.06 : 0;
      phase += 2 * Math.PI * strideHz * dt;
      const amp = speed > 0 ? Math.min(0.55, 0.18 + speed * 0.06) : 0;

      person.legs.forEach((leg, i) => {
        const ph = phase + i * Math.PI;
        leg.hip.rotation.z = -amp * Math.sin(ph);
        leg.knee.rotation.z = speed > 0 ? 0.08 + 0.75 * Math.max(0, -Math.cos(ph)) : 0;
      });

      const grab = cues.includes('grabRail');
      const clutch = cues.includes('chestClutch');
      person.arms.forEach((arm, i) => {
        const ph = phase + i * Math.PI;
        if (clutch && arm.side === 1) {
          arm.shoulder.rotation.set(0, -0.9, -0.3); // twist so the forearm folds across the body: hand on the sternum
          arm.elbow.rotation.z = -1.9;
        } else if (grab) {
          arm.shoulder.rotation.set(-arm.side * 0.28, 0, -0.45); // reach out to the rail
          arm.elbow.rotation.z = -0.5;
        } else {
          arm.shoulder.rotation.set(0, 0, amp * 0.7 * Math.sin(ph));
          arm.elbow.rotation.z = -0.35;
        }
      });

      person.torso.rotation.z = grab || clutch ? 0.12 : 0.04; // lean forward when distressed
      person.root.position.y = BELT_TOP + HIP_HEIGHT + 0.015 * Math.abs(Math.cos(phase));

      const sweat = cues.includes('sweat');
      person.skin.color.lerp(sweat ? SKIN_PALE : SKIN, Math.min(1, dt * 2));
      person.skin.roughness = sweat ? 0.3 : 0.75; // shiny = sweaty
    },
    render() {
      renderer.render(scene, camera);
    },
  };
}
