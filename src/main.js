import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let model, mixer;
let animations = [];
let currentAction = null;
let savedNames = [];
let bones = [];
let selectedBone = null;
let boneOriginalRotations = new Map();
let copiedRotation = null;
let skeletonHelper = null;
let jsonUpdateTimeout = null;

// Modal functions
function showModal(message, title = 'Message', type = 'alert') {
  return new Promise((resolve) => {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalConfirm = document.getElementById('modalConfirm');
    const modalCancel = document.getElementById('modalCancel');

    modalTitle.textContent = title;
    modalMessage.textContent = message;

    if (type === 'confirm') {
      modalConfirm.textContent = 'OK';
      modalCancel.style.display = 'inline-block';

      const handleConfirm = () => {
        modal.style.display = 'none';
        modalConfirm.removeEventListener('click', handleConfirm);
        modalCancel.removeEventListener('click', handleCancel);
        resolve(true);
      };

      const handleCancel = () => {
        modal.style.display = 'none';
        modalConfirm.removeEventListener('click', handleConfirm);
        modalCancel.removeEventListener('click', handleCancel);
        resolve(false);
      };

      modalConfirm.addEventListener('click', handleConfirm);
      modalCancel.addEventListener('click', handleCancel);
    } else {
      modalConfirm.textContent = 'OK';
      modalCancel.style.display = 'none';

      const handleOk = () => {
        modal.style.display = 'none';
        modalConfirm.removeEventListener('click', handleOk);
        resolve(true);
      };

      modalConfirm.addEventListener('click', handleOk);
    }

    modal.style.display = 'block';

    // Close modal when clicking outside
    modal.onclick = (event) => {
      if (event.target === modal) {
        modal.style.display = 'none';
        resolve(false);
      }
    };
  });
}

function showAlert(message, title = 'Message') {
  return showModal(message, title, 'alert');
}

function showConfirm(message, title = 'Confirm') {
  return showModal(message, title, 'confirm');
}

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  // Use very small near plane to handle tiny models
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.0001, 10000);
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

  // Drag and drop support
  const dropZone = document.getElementById('dropZone');

  dropZone.addEventListener('click', () => {
    fileInput.click();
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileDrop(files[0]);
    }
  });

  const renameBtn = document.getElementById('renameBtn');
  renameBtn.addEventListener('click', renameAnimation);

  const saveBtn = document.getElementById('saveBtn');
  saveBtn.addEventListener('click', saveGLB);

  window.addEventListener('resize', onWindowResize);

  // Prevent default drag-and-drop behavior on the document
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
  });
  document.addEventListener('drop', (e) => {
    e.preventDefault();
  });

  // Skeleton editor event listeners
  const boneSelect = document.getElementById('boneSelect');
  boneSelect.addEventListener('change', handleBoneSelect);

  const xSlider = document.getElementById('xSlider');
  const ySlider = document.getElementById('ySlider');
  const zSlider = document.getElementById('zSlider');

  const xInput = document.getElementById('xInput');
  const yInput = document.getElementById('yInput');
  const zInput = document.getElementById('zInput');

  xSlider.addEventListener('input', handleSliderChange);
  ySlider.addEventListener('input', handleSliderChange);
  zSlider.addEventListener('input', handleSliderChange);

  xInput.addEventListener('input', handleInputChange);
  yInput.addEventListener('input', handleInputChange);
  zInput.addEventListener('input', handleInputChange);

  const resetBoneBtn = document.getElementById('resetBoneBtn');
  resetBoneBtn.addEventListener('click', resetBone);

  const copyBoneBtn = document.getElementById('copyBoneBtn');
  const pasteBoneBtn = document.getElementById('pasteBoneBtn');
  copyBoneBtn.addEventListener('click', copyBoneRotation);
  pasteBoneBtn.addEventListener('click', pasteBoneRotation);

  const exportSkeletonBtn = document.getElementById('exportSkeletonBtn');
  const importSkeletonBtn = document.getElementById('importSkeletonBtn');
  const resetSkeletonBtn = document.getElementById('resetSkeletonBtn');
  const copyJsonBtn = document.getElementById('copyJsonBtn');
  const skeletonJsonTextarea = document.getElementById('skeletonJson');
  exportSkeletonBtn.addEventListener('click', exportSkeletonToJson);
  importSkeletonBtn.addEventListener('click', importSkeletonFromJson);
  resetSkeletonBtn.addEventListener('click', resetSkeleton);
  copyJsonBtn.addEventListener('click', copyJsonToClipboard);

  // Auto-apply skeleton JSON changes with debounce
  skeletonJsonTextarea.addEventListener('input', handleSkeletonJsonInput);

  // Zoom controls
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  zoomInBtn.addEventListener('click', zoomIn);
  zoomOutBtn.addEventListener('click', zoomOut);

  // Bone names list controls
  const copyAllBoneNamesBtn = document.getElementById('copyAllBoneNamesBtn');
  const refreshBoneListBtn = document.getElementById('refreshBoneListBtn');
  const toggleHierarchyBtn = document.getElementById('toggleHierarchyBtn');
  copyAllBoneNamesBtn.addEventListener('click', copyAllBoneNames);
  refreshBoneListBtn.addEventListener('click', displayBoneNamesList);
  toggleHierarchyBtn.addEventListener('click', toggleHierarchyView);

  loadSavedNames();
  populateNewNameSelect();
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  loadFile(file);
}

function handleFileDrop(file) {
  if (!file) return;

  // Check if file is a GLB
  if (!file.name.toLowerCase().endsWith('.glb')) {
    showAlert('Please drop a .glb file', 'Invalid File');
    return;
  }

  loadFile(file);
}

function loadFile(file) {
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

    // Remove old skeleton helper if it exists
    if (skeletonHelper) {
      scene.remove(skeletonHelper);
      skeletonHelper = null;
    }

    model = gltf.scene;
    scene.add(model);

    // Debug logging
    console.log('GLB loaded successfully');
    console.log('Scene:', gltf.scene);

    // Check for meshes
    let meshCount = 0;
    let skinnedMeshCount = 0;
    model.traverse((object) => {
      if (object.isMesh) {
        meshCount++;
        console.log('Found mesh:', object.name, 'Material:', object.material?.name);

        // Check if material is visible
        if (object.material) {
          if (object.material.transparent && object.material.opacity === 0) {
            console.warn('Mesh has transparent material with 0 opacity:', object.name);
          }
          // Force materials to be visible
          if (object.material.opacity === 0) {
            object.material.opacity = 1;
          }
        }
      }
      if (object.isSkinnedMesh) {
        skinnedMeshCount++;
        console.log('Found skinned mesh:', object.name);

        // Add skeleton helper for the first skinned mesh
        if (!skeletonHelper && object.skeleton) {
          skeletonHelper = new THREE.SkeletonHelper(object);
          skeletonHelper.visible = true;
          scene.add(skeletonHelper);
          console.log('Added skeleton helper');
        }
      }
    });

    console.log(`Total meshes: ${meshCount}, Skinned meshes: ${skinnedMeshCount}`);

    animations = gltf.animations || [];
    console.log(`Animations found: ${animations.length}`);
    populateAnimationList();

    if (animations.length > 0) {
      playAnimation(0);
    }

    // Extract bones from the model
    extractBones();
    populateBoneList();
    displayBoneNamesList();

    centerModel();

    // Adjust camera based on model size
    adjustCamera();
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

function adjustCamera() {
  if (!model) return;

  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  console.log('Model size:', size);
  console.log('Model max dimension:', maxDim);

  if (maxDim === 0) {
    console.warn('Model has zero size! This might indicate missing mesh data.');
    showAlert('Model has zero size! This might indicate missing mesh data.', 'Warning');
    // Set a default camera position if model has no size
    camera.position.set(2, 2, 3);
    return;
  }

  // If model is extremely small (< 0.1 units), scale it up
  if (maxDim < 0.1) {
    const scaleFactor = 2 / maxDim; // Scale to about 2 units
    model.scale.set(scaleFactor, scaleFactor, scaleFactor);

    const message = `Model is very small (${maxDim.toFixed(6)} units).\n\nAutomatically scaled up by ${scaleFactor.toFixed(2)}x for better visibility.\n\nThis scale will be applied when you save the GLB file.`;
    console.warn(`Model is very small (${maxDim.toFixed(6)} units). Scaling up by ${scaleFactor.toFixed(2)}x`);

    // Show modal notification (non-blocking)
    showAlert(message, 'Model Scaled');

    // Recalculate size after scaling
    const newBox = new THREE.Box3().setFromObject(model);
    const newSize = newBox.getSize(new THREE.Vector3());
    const newMaxDim = Math.max(newSize.x, newSize.y, newSize.z);

    console.log('New model size after scaling:', newSize);
    console.log('New max dimension:', newMaxDim);

    // Position camera based on new size
    const distance = newMaxDim * 2.5;
    camera.position.set(distance, distance, distance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    console.log('Camera adjusted to distance:', distance);
  } else {
    // Position camera based on model size
    const distance = maxDim * 2.5;
    camera.position.set(distance, distance, distance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    console.log('Camera adjusted to distance:', distance);
  }
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

  // Update index display
  updateAnimationIndexDisplay();
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
  updateAnimationIndexDisplay(index);
}

function updateAnimationIndexDisplay(index) {
  const indexSpan = document.getElementById('animationIndex');
  const select = document.getElementById('animationSelect');

  if (index !== undefined && index >= 0 && index < animations.length) {
    indexSpan.textContent = `(Index: ${index})`;
  } else if (select.value !== '') {
    indexSpan.textContent = `(Index: ${select.value})`;
  } else {
    indexSpan.textContent = '';
  }
}

function renameAnimation() {
  const select = document.getElementById('animationSelect');
  const newNameInput = document.getElementById('newName');
  const newName = newNameInput.value.trim();

  if (select.value === '' || !newName) return;

  // Check for 'idle' name
  if (newName.toLowerCase() === 'idle') {
    showAlert('Cannot use "idle" as animation name.', 'Invalid Name');
    return;
  }

  // Check for duplicate names
  const existingNames = animations.map(anim => anim.name.toLowerCase());
  if (existingNames.includes(newName.toLowerCase())) {
    showAlert('Animation name already exists. Please choose a different name.', 'Duplicate Name');
    return;
  }

  const index = parseInt(select.value);
  animations[index].name = newName;

  const option = select.options[select.selectedIndex];
  option.textContent = newName;

  saveNewName(newName);
  populateNewNameSelect();

  newNameInput.value = '';
}

function loadSavedNames() {
  const names = localStorage.getItem('glbAnimationNames');
  if (names) {
    savedNames = JSON.parse(names).sort();
  }
}

function saveNewName(name) {
  if (!savedNames.includes(name)) {
    savedNames.push(name);
    savedNames.sort();
    localStorage.setItem('glbAnimationNames', JSON.stringify(savedNames));
  }
}

function populateNewNameSelect() {
  const datalist = document.getElementById('savedNames');
  datalist.innerHTML = '';

  savedNames.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    datalist.appendChild(option);
  });
}

async function saveGLB() {
  if (!model) return;

  const confirmed = await showConfirm('Save modified GLB file?', 'Confirm Save');
  if (!confirmed) return;

  const exportGroup = new THREE.Group();
  exportGroup.add(model);
  exportGroup.animations = animations;

  const exporter = new GLTFExporter();

  exporter.parse(
    exportGroup,
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

// Skeleton editing functions
function extractBones() {
  bones = [];
  boneOriginalRotations.clear();

  if (!model) return;

  model.traverse((object) => {
    if (object.isBone) {
      bones.push(object);
      // Save original rotation
      boneOriginalRotations.set(object.uuid, {
        x: object.rotation.x,
        y: object.rotation.y,
        z: object.rotation.z
      });
    }
  });

  console.log(`Found ${bones.length} bones in the model`);
}

function populateBoneList() {
  const select = document.getElementById('boneSelect');
  select.innerHTML = '<option value="">-- Select Bone --</option>';

  // Simple list with parent info in the name
  bones.forEach((bone, i) => {
    const option = document.createElement('option');
    option.value = i;

    const boneName = bone.name || `Bone_${i}`;

    // Add parent info to help understand hierarchy
    let displayName = boneName;
    if (bone.parent && bone.parent.isBone) {
      const parentName = bone.parent.name || 'UnnamedParent';
      displayName = `${boneName} ← ${parentName}`;
    } else {
      displayName = `${boneName} (ROOT)`;
    }

    option.textContent = displayName;
    select.appendChild(option);
  });

  // Log hierarchy info for debugging
  console.log('Bone hierarchy analysis:');
  const rootBones = bones.filter(bone => !bone.parent || !bone.parent.isBone);
  console.log(`Root bones: ${rootBones.length}`);
  bones.forEach((bone, i) => {
    const children = bone.children.filter(c => c.isBone);
    if (children.length > 0) {
      console.log(`${bone.name} has ${children.length} children:`, children.map(c => c.name));
    }
  });
}

function handleBoneSelect(event) {
  const index = parseInt(event.target.value);

  if (isNaN(index) || index < 0 || index >= bones.length) {
    selectedBone = null;
    return;
  }

  selectedBone = bones[index];
  updateSliders();
}

function updateSliders() {
  if (!selectedBone) return;

  const xSlider = document.getElementById('xSlider');
  const ySlider = document.getElementById('ySlider');
  const zSlider = document.getElementById('zSlider');

  const xInput = document.getElementById('xInput');
  const yInput = document.getElementById('yInput');
  const zInput = document.getElementById('zInput');

  xSlider.value = selectedBone.rotation.x;
  ySlider.value = selectedBone.rotation.y;
  zSlider.value = selectedBone.rotation.z;

  // Convert radians to degrees for display
  const xDeg = (selectedBone.rotation.x * 180 / Math.PI).toFixed(1);
  const yDeg = (selectedBone.rotation.y * 180 / Math.PI).toFixed(1);
  const zDeg = (selectedBone.rotation.z * 180 / Math.PI).toFixed(1);

  xInput.value = xDeg;
  yInput.value = yDeg;
  zInput.value = zDeg;

  document.getElementById('xValue').textContent = xDeg + '°';
  document.getElementById('yValue').textContent = yDeg + '°';
  document.getElementById('zValue').textContent = zDeg + '°';
}

function handleSliderChange(event) {
  if (!selectedBone) return;

  const xSlider = document.getElementById('xSlider');
  const ySlider = document.getElementById('ySlider');
  const zSlider = document.getElementById('zSlider');

  const xInput = document.getElementById('xInput');
  const yInput = document.getElementById('yInput');
  const zInput = document.getElementById('zInput');

  selectedBone.rotation.x = parseFloat(xSlider.value);
  selectedBone.rotation.y = parseFloat(ySlider.value);
  selectedBone.rotation.z = parseFloat(zSlider.value);

  // Convert radians to degrees for display
  const xDeg = (selectedBone.rotation.x * 180 / Math.PI).toFixed(1);
  const yDeg = (selectedBone.rotation.y * 180 / Math.PI).toFixed(1);
  const zDeg = (selectedBone.rotation.z * 180 / Math.PI).toFixed(1);

  xInput.value = xDeg;
  yInput.value = yDeg;
  zInput.value = zDeg;

  document.getElementById('xValue').textContent = xDeg + '°';
  document.getElementById('yValue').textContent = yDeg + '°';
  document.getElementById('zValue').textContent = zDeg + '°';
}

function handleInputChange(event) {
  if (!selectedBone) return;

  const xInput = document.getElementById('xInput');
  const yInput = document.getElementById('yInput');
  const zInput = document.getElementById('zInput');

  const xSlider = document.getElementById('xSlider');
  const ySlider = document.getElementById('ySlider');
  const zSlider = document.getElementById('zSlider');

  // Convert degrees to radians
  const xRad = parseFloat(xInput.value) * Math.PI / 180;
  const yRad = parseFloat(yInput.value) * Math.PI / 180;
  const zRad = parseFloat(zInput.value) * Math.PI / 180;

  selectedBone.rotation.x = xRad;
  selectedBone.rotation.y = yRad;
  selectedBone.rotation.z = zRad;

  xSlider.value = xRad;
  ySlider.value = yRad;
  zSlider.value = zRad;

  document.getElementById('xValue').textContent = parseFloat(xInput.value).toFixed(1) + '°';
  document.getElementById('yValue').textContent = parseFloat(yInput.value).toFixed(1) + '°';
  document.getElementById('zValue').textContent = parseFloat(zInput.value).toFixed(1) + '°';
}

function resetBone() {
  if (!selectedBone) return;

  const originalRot = boneOriginalRotations.get(selectedBone.uuid);
  if (originalRot) {
    selectedBone.rotation.x = originalRot.x;
    selectedBone.rotation.y = originalRot.y;
    selectedBone.rotation.z = originalRot.z;
    updateSliders();
  }
}

// Copy/Paste functions
function copyBoneRotation() {
  if (!selectedBone) {
    showAlert('Please select a bone first', 'No Bone Selected');
    return;
  }

  copiedRotation = {
    x: selectedBone.rotation.x,
    y: selectedBone.rotation.y,
    z: selectedBone.rotation.z
  };

  console.log('Copied rotation:', copiedRotation);

  // Visual feedback
  const copyBtn = document.getElementById('copyBoneBtn');
  const originalText = copyBtn.textContent;
  copyBtn.textContent = 'Copied!';
  setTimeout(() => {
    copyBtn.textContent = originalText;
  }, 1000);
}

function pasteBoneRotation() {
  if (!selectedBone) {
    showAlert('Please select a bone first', 'No Bone Selected');
    return;
  }

  if (!copiedRotation) {
    showAlert('No rotation copied yet', 'No Data');
    return;
  }

  selectedBone.rotation.x = copiedRotation.x;
  selectedBone.rotation.y = copiedRotation.y;
  selectedBone.rotation.z = copiedRotation.z;

  updateSliders();

  console.log('Pasted rotation to:', selectedBone.name);

  // Visual feedback
  const pasteBtn = document.getElementById('pasteBoneBtn');
  const originalText = pasteBtn.textContent;
  pasteBtn.textContent = 'Pasted!';
  setTimeout(() => {
    pasteBtn.textContent = originalText;
  }, 1000);
}

// Skeleton JSON export/import
function exportSkeletonToJson() {
  if (bones.length === 0) {
    showAlert('No skeleton found. Please load a GLB file first.', 'No Skeleton');
    return;
  }

  const skeletonData = {
    metadata: {
      totalBones: bones.length,
      exportDate: new Date().toISOString()
    },
    bones: bones.map((bone, index) => {
      const boneData = {
        index: index,
        name: bone.name,
        uuid: bone.uuid,
        type: bone.type,
        parent: bone.parent ? {
          name: bone.parent.name,
          uuid: bone.parent.uuid,
          type: bone.parent.type
        } : null,
        children: bone.children
          .filter(child => child.isBone)
          .map(child => ({
            name: child.name,
            uuid: child.uuid
          })),
        position: {
          x: bone.position.x,
          y: bone.position.y,
          z: bone.position.z
        },
        rotation: {
          x: bone.rotation.x,
          y: bone.rotation.y,
          z: bone.rotation.z
        },
        quaternion: {
          x: bone.quaternion.x,
          y: bone.quaternion.y,
          z: bone.quaternion.z,
          w: bone.quaternion.w
        },
        scale: {
          x: bone.scale.x,
          y: bone.scale.y,
          z: bone.scale.z
        }
      };

      // Add world position/rotation if available
      if (bone.matrixWorld) {
        const worldPos = new THREE.Vector3();
        bone.getWorldPosition(worldPos);
        boneData.worldPosition = {
          x: worldPos.x,
          y: worldPos.y,
          z: worldPos.z
        };
      }

      return boneData;
    })
  };

  const jsonString = JSON.stringify(skeletonData, null, 2);

  // Temporarily disable auto-update to prevent loop
  const textarea = document.getElementById('skeletonJson');
  const oldHandler = textarea.oninput;
  textarea.oninput = null;

  textarea.value = jsonString;

  // Re-enable auto-update after a short delay
  setTimeout(() => {
    textarea.oninput = oldHandler;
  }, 100);

  console.log('Exported skeleton:', skeletonData);

  // Visual feedback
  const exportBtn = document.getElementById('exportSkeletonBtn');
  const originalText = exportBtn.textContent;
  exportBtn.textContent = 'Exported!';
  setTimeout(() => {
    exportBtn.textContent = originalText;
  }, 1000);
}

async function applySkeletonJson(jsonString, showFeedback = false) {
  // If empty, reset to original positions
  if (!jsonString.trim()) {
    if (showFeedback) {
      // User explicitly tried to import empty - reset skeleton
      resetAllBonesToOriginal();
      return true;
    }
    // Silent return for auto-update
    return false;
  }

  try {
    const skeletonData = JSON.parse(jsonString);

    if (!skeletonData.bones) {
      throw new Error('Invalid skeleton JSON format: missing "bones" field');
    }

    // Support both array and object format
    let boneDataList = [];

    if (Array.isArray(skeletonData.bones)) {
      // Array format: [{ name: "Hips", rotation: {...} }, ...]
      boneDataList = skeletonData.bones;
    } else if (typeof skeletonData.bones === 'object') {
      // Object format: { "Hips": { rotation: {...} }, ... }
      boneDataList = Object.entries(skeletonData.bones).map(([name, data]) => ({
        name: name,
        ...data
      }));
    } else {
      throw new Error('Invalid skeleton JSON format: "bones" must be an array or object');
    }

    // Apply transformations to bones
    let appliedCount = 0;
    let selectedBoneWasUpdated = false;

    boneDataList.forEach(boneData => {
      const bone = bones.find(b => b.name === boneData.name);
      if (bone) {
        // Apply rotation
        if (boneData.rotation) {
          bone.rotation.x = boneData.rotation.x || 0;
          bone.rotation.y = boneData.rotation.y || 0;
          bone.rotation.z = boneData.rotation.z || 0;
          appliedCount++;

          // Check if this is the currently selected bone
          if (selectedBone && selectedBone.uuid === bone.uuid) {
            selectedBoneWasUpdated = true;
          }
        }

        // Apply position (if provided)
        if (boneData.position) {
          bone.position.x = boneData.position.x || 0;
          bone.position.y = boneData.position.y || 0;
          bone.position.z = boneData.position.z || 0;
        }

        // Apply scale (if provided)
        if (boneData.scale) {
          bone.scale.x = boneData.scale.x || 1;
          bone.scale.y = boneData.scale.y || 1;
          bone.scale.z = boneData.scale.z || 1;
        }
      }
    });

    // Always update sliders if a bone is selected and was modified
    if (selectedBone && selectedBoneWasUpdated) {
      updateSliders();
      console.log(`Updated sliders for selected bone: ${selectedBone.name}`);
    }

    console.log(`Applied skeleton JSON: ${appliedCount} bones updated`);
    return true;

  } catch (error) {
    // Only show error feedback if user explicitly clicked import
    if (showFeedback) {
      await showAlert('Error importing JSON: ' + error.message, 'Import Error');
    }
    // For auto-update, silently ignore parse errors (user might still be typing)
    if (!showFeedback && error instanceof SyntaxError) {
      // User is still typing JSON, don't spam console
      return false;
    }
    console.error('Import error:', error);
    return false;
  }
}

function resetAllBonesToOriginal() {
  if (bones.length === 0) return;

  let selectedBoneWasReset = false;

  bones.forEach(bone => {
    const originalRot = boneOriginalRotations.get(bone.uuid);
    if (originalRot) {
      bone.rotation.x = originalRot.x;
      bone.rotation.y = originalRot.y;
      bone.rotation.z = originalRot.z;

      // Check if this is the currently selected bone
      if (selectedBone && selectedBone.uuid === bone.uuid) {
        selectedBoneWasReset = true;
      }
    }
  });

  // Update sliders if the selected bone was reset
  if (selectedBone && selectedBoneWasReset) {
    updateSliders();
    console.log(`Updated sliders after reset for: ${selectedBone.name}`);
  }

  console.log('Reset all bones to original positions');
}

async function importSkeletonFromJson() {
  const jsonString = document.getElementById('skeletonJson').value;
  const success = await applySkeletonJson(jsonString, true);

  if (success) {
    // Visual feedback
    const importBtn = document.getElementById('importSkeletonBtn');
    const originalText = importBtn.textContent;
    importBtn.textContent = 'Imported!';
    setTimeout(() => {
      importBtn.textContent = originalText;
    }, 1000);
  }
}

function resetSkeleton() {
  if (bones.length === 0) {
    showAlert('No skeleton loaded. Load a GLB file first.', 'No Skeleton');
    return;
  }

  // Clear the JSON textarea
  const textarea = document.getElementById('skeletonJson');
  const oldHandler = textarea.oninput;
  textarea.oninput = null; // Prevent auto-update trigger
  textarea.value = '';
  setTimeout(() => {
    textarea.oninput = oldHandler;
  }, 100);

  // Reset all bones to original positions
  resetAllBonesToOriginal();

  // Visual feedback
  const resetBtn = document.getElementById('resetSkeletonBtn');
  const originalText = resetBtn.textContent;
  resetBtn.textContent = 'Reset!';
  setTimeout(() => {
    resetBtn.textContent = originalText;
  }, 1000);

  console.log('Skeleton reset and JSON cleared');
}

function handleSkeletonJsonInput() {
  // Clear previous timeout
  if (jsonUpdateTimeout) {
    clearTimeout(jsonUpdateTimeout);
  }

  // Set new timeout to apply changes after 500ms of no typing
  jsonUpdateTimeout = setTimeout(() => {
    const jsonString = document.getElementById('skeletonJson').value;
    applySkeletonJson(jsonString, false);
  }, 500);
}

function copyJsonToClipboard() {
  const jsonTextarea = document.getElementById('skeletonJson');
  const jsonString = jsonTextarea.value;

  if (!jsonString.trim()) {
    showAlert('No JSON to copy. Please export skeleton first.', 'No Data');
    return;
  }

  navigator.clipboard.writeText(jsonString).then(() => {
    // Visual feedback
    const copyBtn = document.getElementById('copyJsonBtn');
    const originalText = copyBtn.textContent;
    copyBtn.textContent = 'Copied to Clipboard!';
    setTimeout(() => {
      copyBtn.textContent = originalText;
    }, 1000);
  }).catch(err => {
    showAlert('Failed to copy to clipboard: ' + err, 'Clipboard Error');
  });
}

// Zoom functions
function zoomIn() {
  const zoomFactor = 0.9;
  camera.position.multiplyScalar(zoomFactor);
  camera.updateProjectionMatrix();
}

function zoomOut() {
  const zoomFactor = 1.1;
  camera.position.multiplyScalar(zoomFactor);
  camera.updateProjectionMatrix();
}

// Bone names list functions
function displayBoneNamesList() {
  const container = document.getElementById('boneNamesList');

  if (bones.length === 0) {
    container.innerHTML = '<div style="color: #888; padding: 10px;">No bones found. Load a GLB file first.</div>';
    return;
  }

  container.innerHTML = '';

  bones.forEach((bone, index) => {
    const boneItem = document.createElement('div');
    boneItem.className = 'bone-item';

    const boneName = document.createElement('span');
    boneName.className = 'bone-name';
    boneName.textContent = bone.name || `Bone_${index}`;

    const copyBtn = document.createElement('button');
    copyBtn.className = 'bone-copy-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', () => copyBoneName(bone.name || `Bone_${index}`, copyBtn));

    boneItem.appendChild(boneName);
    boneItem.appendChild(copyBtn);
    container.appendChild(boneItem);
  });
}

function copyBoneName(name, button) {
  navigator.clipboard.writeText(name).then(() => {
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    setTimeout(() => {
      button.textContent = originalText;
    }, 1000);
  }).catch(err => {
    console.error('Failed to copy bone name:', err);
    showAlert('Failed to copy: ' + err, 'Clipboard Error');
  });
}

function copyAllBoneNames() {
  if (bones.length === 0) {
    showAlert('No bones found. Load a GLB file first.', 'No Bones');
    return;
  }

  const boneNames = bones.map((bone, index) => bone.name || `Bone_${index}`).join('\n');

  navigator.clipboard.writeText(boneNames).then(() => {
    const btn = document.getElementById('copyAllBoneNamesBtn');
    const originalText = btn.textContent;
    btn.textContent = 'Copied All!';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 1500);
  }).catch(err => {
    console.error('Failed to copy all bone names:', err);
    showAlert('Failed to copy: ' + err, 'Clipboard Error');
  });
}

// Bone hierarchy functions
function toggleHierarchyView() {
  const hierarchyDiv = document.getElementById('boneHierarchy');
  const listDiv = document.getElementById('boneNamesList');
  const btn = document.getElementById('toggleHierarchyBtn');

  if (hierarchyDiv.style.display === 'none') {
    // Show hierarchy, hide list
    hierarchyDiv.style.display = 'block';
    listDiv.style.display = 'none';
    btn.textContent = 'Show List';
    displayBoneHierarchy();
  } else {
    // Show list, hide hierarchy
    hierarchyDiv.style.display = 'none';
    listDiv.style.display = 'block';
    btn.textContent = 'Show Hierarchy';
  }
}

function displayBoneHierarchy() {
  const container = document.getElementById('boneHierarchy');

  if (bones.length === 0) {
    container.innerHTML = '<div style="color: #888; padding: 10px;">No bones found. Load a GLB file first.</div>';
    return;
  }

  container.innerHTML = '';

  // Find root bones (bones without parent or parent is not a bone)
  const rootBones = bones.filter(bone => !bone.parent || !bone.parent.isBone);

  rootBones.forEach(rootBone => {
    const rootDiv = buildBoneHierarchyNode(rootBone, 0, true);
    container.appendChild(rootDiv);
  });

  // Add copy button for hierarchy
  const copyHierarchyBtn = document.createElement('button');
  copyHierarchyBtn.textContent = 'Copy Hierarchy as Text';
  copyHierarchyBtn.style.marginTop = '10px';
  copyHierarchyBtn.addEventListener('click', copyHierarchyAsText);
  container.appendChild(copyHierarchyBtn);
}

function buildBoneHierarchyNode(bone, level, isRoot = false) {
  const nodeDiv = document.createElement('div');
  nodeDiv.className = isRoot ? 'hierarchy-root' : 'hierarchy-item';
  nodeDiv.style.marginLeft = (level * 20) + 'px';

  const indent = '  '.repeat(level);
  const prefix = level > 0 ? '└─ ' : '';

  const nameSpan = document.createElement('span');
  nameSpan.textContent = `${prefix}${bone.name}`;
  nameSpan.style.cursor = 'pointer';
  nameSpan.style.userSelect = 'all';
  nameSpan.title = `UUID: ${bone.uuid}\nChildren: ${bone.children.filter(c => c.isBone).length}`;

  nodeDiv.appendChild(nameSpan);

  // Add copy button for this bone
  const copyBtn = document.createElement('button');
  copyBtn.className = 'bone-copy-btn';
  copyBtn.textContent = 'Copy';
  copyBtn.style.marginLeft = '10px';
  copyBtn.addEventListener('click', () => copyBoneName(bone.name, copyBtn));
  nodeDiv.appendChild(copyBtn);

  const childrenContainer = document.createElement('div');
  childrenContainer.className = 'hierarchy-branch';

  const childBones = bone.children.filter(child => child.isBone);
  childBones.forEach(child => {
    const childNode = buildBoneHierarchyNode(child, level + 1);
    childrenContainer.appendChild(childNode);
  });

  const wrapperDiv = document.createElement('div');
  wrapperDiv.appendChild(nodeDiv);
  if (childBones.length > 0) {
    wrapperDiv.appendChild(childrenContainer);
  }

  return wrapperDiv;
}

function copyHierarchyAsText() {
  if (bones.length === 0) {
    showAlert('No bones found.', 'No Bones');
    return;
  }

  const rootBones = bones.filter(bone => !bone.parent || !bone.parent.isBone);
  let hierarchyText = 'Bone Hierarchy:\n\n';

  function buildTextNode(bone, level) {
    const indent = '  '.repeat(level);
    const prefix = level > 0 ? '└─ ' : '';
    let text = `${indent}${prefix}${bone.name}\n`;

    const childBones = bone.children.filter(child => child.isBone);
    childBones.forEach(child => {
      text += buildTextNode(child, level + 1);
    });

    return text;
  }

  rootBones.forEach(rootBone => {
    hierarchyText += buildTextNode(rootBone, 0);
  });

  navigator.clipboard.writeText(hierarchyText).then(() => {
    showAlert('Hierarchy copied to clipboard!', 'Success');
  }).catch(err => {
    console.error('Failed to copy hierarchy:', err);
    showAlert('Failed to copy: ' + err, 'Clipboard Error');
  });
}

function toggleSkeletonHelper() {
  if (!skeletonHelper) {
    showAlert('No skeleton helper available. Load a GLB file with a skinned mesh first.', 'No Skeleton Helper');
    return;
  }

  skeletonHelper.visible = !skeletonHelper.visible;

  const btn = document.getElementById('toggleSkeletonBtn');
  btn.textContent = skeletonHelper.visible ? 'Hide Skeleton Helper' : 'Show Skeleton Helper';

  console.log('Skeleton helper visibility:', skeletonHelper.visible);
}