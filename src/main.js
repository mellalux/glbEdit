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
  const copyJsonBtn = document.getElementById('copyJsonBtn');
  exportSkeletonBtn.addEventListener('click', exportSkeletonToJson);
  importSkeletonBtn.addEventListener('click', importSkeletonFromJson);
  copyJsonBtn.addEventListener('click', copyJsonToClipboard);

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

    // Extract bones from the model
    extractBones();
    populateBoneList();
    displayBoneNamesList();

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
    alert('Cannot use "idle" as animation name.');
    return;
  }

  // Check for duplicate names
  const existingNames = animations.map(anim => anim.name.toLowerCase());
  if (existingNames.includes(newName.toLowerCase())) {
    alert('Animation name already exists. Please choose a different name.');
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

function saveGLB() {
  if (!model) return;

  const confirmed = confirm('Save modified GLB file?');
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
    alert('Please select a bone first');
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
    alert('Please select a bone first');
    return;
  }

  if (!copiedRotation) {
    alert('No rotation copied yet');
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
    alert('No skeleton found. Please load a GLB file first.');
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
  document.getElementById('skeletonJson').value = jsonString;

  console.log('Exported skeleton:', skeletonData);

  // Visual feedback
  const exportBtn = document.getElementById('exportSkeletonBtn');
  const originalText = exportBtn.textContent;
  exportBtn.textContent = 'Exported!';
  setTimeout(() => {
    exportBtn.textContent = originalText;
  }, 1000);
}

function importSkeletonFromJson() {
  const jsonString = document.getElementById('skeletonJson').value;

  if (!jsonString.trim()) {
    alert('Please paste JSON data first');
    return;
  }

  try {
    const skeletonData = JSON.parse(jsonString);

    if (!skeletonData.bones || !Array.isArray(skeletonData.bones)) {
      throw new Error('Invalid skeleton JSON format');
    }

    // Apply rotations to bones
    skeletonData.bones.forEach(boneData => {
      const bone = bones.find(b => b.name === boneData.name);
      if (bone && boneData.rotation) {
        bone.rotation.x = boneData.rotation.x;
        bone.rotation.y = boneData.rotation.y;
        bone.rotation.z = boneData.rotation.z;
      }
    });

    // Update sliders if a bone is selected
    if (selectedBone) {
      updateSliders();
    }

    console.log('Imported skeleton:', skeletonData);

    // Visual feedback
    const importBtn = document.getElementById('importSkeletonBtn');
    const originalText = importBtn.textContent;
    importBtn.textContent = 'Imported!';
    setTimeout(() => {
      importBtn.textContent = originalText;
    }, 1000);

  } catch (error) {
    alert('Error importing JSON: ' + error.message);
    console.error('Import error:', error);
  }
}

function copyJsonToClipboard() {
  const jsonTextarea = document.getElementById('skeletonJson');
  const jsonString = jsonTextarea.value;

  if (!jsonString.trim()) {
    alert('No JSON to copy. Please export skeleton first.');
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
    alert('Failed to copy to clipboard: ' + err);
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
    alert('Failed to copy: ' + err);
  });
}

function copyAllBoneNames() {
  if (bones.length === 0) {
    alert('No bones found. Load a GLB file first.');
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
    alert('Failed to copy: ' + err);
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
    alert('No bones found.');
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
    alert('Hierarchy copied to clipboard!');
  }).catch(err => {
    console.error('Failed to copy hierarchy:', err);
    alert('Failed to copy: ' + err);
  });
}