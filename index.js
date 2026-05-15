const { readFile, writeFile } = require('fs/promises');
const { Document, NodeIO } = require('@gltf-transform/core');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => rl.question(question, answer => resolve(answer)));
}

async function loadGLB(filePath) {
  const io = new NodeIO();
  const document = await io.read(filePath);
  return document;
}

function listAnimations(document) {
  const animations = document.getRoot().listAnimations();
  console.log('\nAnimations:');
  animations.forEach((anim, i) => {
    console.log(`  ${i}: "${anim.getName()}"`);
  });
  return animations;
}

function renameAnimation(document, index, newName) {
  const animations = document.getRoot().listAnimations();
  if (index < 0 || index >= animations.length) {
    throw new Error(`Animation index ${index} out of range`);
  }
  const animation = animations[index];
  animation.setName(newName);
  console.log(`Renamed animation ${index} to "${newName}"`);
  return animation;
}

async function saveGLB(document, outputPath) {
  const io = new NodeIO();
  await io.write(outputPath, document);
  console.log(`Saved to ${outputPath}`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args[0]) {
    const command = args[0];
    
    if (command === 'list' && args[1]) {
      const document = await loadGLB(args[1]);
      listAnimations(document);
      rl.close();
      return;
    } else if (command === 'rename' && args[1] && args[2] !== undefined && args[3]) {
      const document = await loadGLB(args[1]);
      const index = parseInt(args[2], 10);
      renameAnimation(document, index, args[3]);
      const outputPath = args[4] || args[1];
      await saveGLB(document, outputPath);
      rl.close();
      return;
    }
  }
  
  console.log('GLB Animation Editor\n');
  
  const inputFile = await ask('Enter GLB file path: ');
  const document = await loadGLB(inputFile);
  listAnimations(document);
  
  while (true) {
    const choice = await ask('\nOptions:\n  1. Rename animation\n  2. List animations\n  3. Save\n  4. Exit\n> ');
    
    if (choice === '1') {
      const index = parseInt(await ask('Animation index: '), 10);
      const newName = await ask('New name: ');
      try {
        renameAnimation(document, index, newName);
      } catch (e) {
        console.log(e.message);
      }
    } else if (choice === '2') {
      listAnimations(document);
    } else if (choice === '3') {
      const outputFile = await ask('Output file path (blank to overwrite): ') || inputFile;
      await saveGLB(document, outputFile);
    } else if (choice === '4') {
      break;
    }
  }
  
  rl.close();
}

main().catch(console.error);