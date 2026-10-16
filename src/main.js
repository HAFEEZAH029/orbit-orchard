// Base project: the garden preview. Gameplay and start.ng integration follow next.
const status = document.getElementById('render-status');

async function boot() {
  const THREE = await import('three');
  const canvas = document.getElementById('garden');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#102e29');
  scene.fog = new THREE.Fog('#102e29', 20, 48);
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
  scene.add(new THREE.HemisphereLight('#eaffdc', '#294f46', 2.5));
  const sun = new THREE.DirectionalLight('#fff0cf', 3);
  sun.position.set(5, 9, 6);
  scene.add(sun);

  const garden = new THREE.Group();
  scene.add(garden);
  const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .8, ...extra });
  const grass = material('#84aa68');
  const earth = material('#786950');
  const leaves = material('#c0d77d');
  const trunk = material('#826544');
  const seedMaterial = material('#e9ed99', { emissive: '#d3de66', emissiveIntensity: .7, metalness: .2 });
  function add(geometry, mat, x, y, z, parent = garden) {
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  add(new THREE.CylinderGeometry(4.5, 3.1, 1.4, 9), earth, 0, -.7, 0);
  add(new THREE.CylinderGeometry(4.55, 4.5, .25, 9), grass, 0, .08, 0);
  const ring = add(new THREE.TorusGeometry(5.45, .025, 6, 100), material('#81936a'), 0, -.55, 0);
  ring.rotation.x = Math.PI / 2;
  for (const [x, z, scale] of [[-2.5, -1.8, 1], [1.9, -2, 1.2], [2.9, .4, .75]]) {
    const tree = new THREE.Group();
    tree.position.set(x, .2, z);
    tree.scale.setScalar(scale);
    garden.add(tree);
    add(new THREE.CylinderGeometry(.12, .19, 1.3, 7), trunk, 0, .65, 0, tree);
    add(new THREE.IcosahedronGeometry(.85, 0), leaves, 0, 1.65, 0, tree);
    add(new THREE.IcosahedronGeometry(.55, 0), material('#9ebd6b'), .4, 1.3, .15, tree);
  }
  // A neutral placeholder character, ready to be replaced by the profile-driven character.
  const hero = new THREE.Group();
  hero.position.set(-.3, .22, .7);
  garden.add(hero);
  add(new THREE.BoxGeometry(.48, .65, .34), material('#f3bc71'), 0, .7, 0, hero);
  add(new THREE.BoxGeometry(.4, .4, .4), material('#d4a27a'), 0, 1.25, 0, hero);
  for (const x of [-.14, .14]) add(new THREE.BoxGeometry(.18, .4, .22), material('#3c625d'), x, .2, 0, hero);
  const seeds = [];
  for (let i = 0; i < 8; i++) {
    const angle = i / 8 * Math.PI * 2;
    const seed = add(new THREE.OctahedronGeometry(.17), seedMaterial, Math.cos(angle) * 2.7, .6, Math.sin(angle) * 2.7);
    seeds.push(seed);
  }
  const pebbles = material('#b9bd96');
  for (let i = 0; i < 5; i++) add(new THREE.DodecahedronGeometry(.18 + i * .02), pebbles, -2.8 + i * .35, .25, 1.8);
  const dust = new THREE.Group();
  scene.add(dust);
  for (let i = 0; i < 35; i++) {
    add(new THREE.SphereGeometry(.025, 5, 4), seedMaterial, Math.sin(i * 13) * 9, Math.cos(i * 7) * 4, Math.sin(i * 5) * 7, dust);
  }
  function resize() {
    const mobile = innerWidth < 700;
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.position.set(10, 10, 14);
    camera.lookAt(mobile ? 0 : -3.8, mobile ? 3.5 : .1, 0);
    camera.fov = mobile ? 54 : 38;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const t = reducedMotion ? 0 : clock.getElapsedTime();
    garden.position.y = Math.sin(t * .7) * .1;
    garden.rotation.y = -.35 + Math.sin(t * .12) * .12;
    seeds.forEach((seed, i) => {
      seed.position.y = .65 + Math.sin(t * 1.7 + i) * .12;
      seed.rotation.y = t + i;
    });
    dust.rotation.y = t * .025;
    renderer.render(scene, camera);
  });
}

boot().catch((error) => {
  console.error('Garden preview failed:', error);
  status.textContent = 'The 3D preview could not load. Check your internet connection and that WebGL is enabled, then refresh.';
});
