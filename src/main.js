import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let model, mixer;
let animations = [];
let currentAction = null;

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(2, 2, 3);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 7);
  scene.add(directionalLight);

  const fileInput = document.getElementById('fileInput');
  fileInput.addEventListener('change', handleFileSelect);

  const renameBtn = document.getElementById('renameBtn');
  renameBtn.addEventListener('click', renameAnimation);

  const saveBtn = document.getElementById('saveBtn');
  saveBtn.addEventListener('click', saveGLB);

  window.addEventListener('resize', onWindowResize);
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const arrayBuffer = e.target.result;
    loadGLBFromArrayBuffer(arrayBuffer);
  };
  reader.readAsArrayBuffer(file);
}

function loadGLBFromArrayBuffer(arrayBuffer) {
  const loader = new GLTFLoader();
  
  loader.parse(arrayBuffer, '', function(gltf) {
    if (model) {
      scene.remove(model);
      if (mixer) mixer.stopAllAction();
    }
    
    model = gltf.scene;
    scene.add(model);

    animations = gltf.animations || [];
    populateAnimationList();
    
    if (animations.length > 0) {
      playAnimation(0);
    }

    centerModel();
  }, function(error) {
    console.error('Error loading GLB:', error);
  });
}

function centerModel() {
  if (!model) return;
  
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  
  controls.target.set(0, 0, 0);
}

function populateAnimationList() {
  const select = document.getElementById('animationSelect');
  select.innerHTML = '';
  
  animations.forEach((clip, i) => {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = clip.name || `Animation ${i}`;
    select.appendChild(option);
  });
  
  select.addEventListener('change', function() {
    playAnimation(parseInt(this.value));
  });
}

function playAnimation(index) {
  if (index < 0 || index >= animations.length) return;
  
  if (mixer) {
    mixer.stopAllAction();
  }
  
  mixer = new THREE.AnimationMixer(model);
  currentAction = mixer.clipAction(animations[index]);
  currentAction.play();
  
  document.getElementById('animationSelect').value = index;
}

function renameAnimation() {
  const select = document.getElementById('animationSelect');
  const newName = document.getElementById('newName').value;
  
  if (select.value === '' || !newName) return;
  
  const index = parseInt(select.value);
  animations[index].name = newName;
  
  const option = select.options[select.selectedIndex];
  option.textContent = newName;
  
  document.getElementById('newName').value = '';
}

function saveGLB() {
  if (!model) return;
  
  const exporter = new GLTFExporter();
  
  exporter.parse(
    model,
    function(result) {
      let blob;
      if (result instanceof ArrayBuffer) {
        blob = new Blob([result], { type: 'model/gltf-binary' });
      } else {
        blob = new Blob([JSON.stringify(result, null, 2)], { type: 'model/gltf+json' });
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'modified.glb';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    function(error) {
      console.error('Error exporting GLB:', error);
    },
    { binary: true, animations: animations }
  );
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  
  if (mixer) {
    mixer.update(0.016);
  }
  
  controls.update();
  renderer.render(scene, camera);
}

document.getElementById('playBtn').addEventListener('click', function() {
  if (currentAction) {
    currentAction.play();
  }
});

document.getElementById('pauseBtn').addEventListener('click', function() {
  if (currentAction) {
    currentAction.stop();
  }
});