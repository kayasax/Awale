import { createCanvas } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';

// Create color icon (192x192)
function createColorIcon() {
  const canvas = createCanvas(192, 192);
  const ctx = canvas.getContext('2d');
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 192, 192);
  gradient.addColorStop(0, '#8B4513'); // Brown
  gradient.addColorStop(1, '#D2691E'); // Orange brown
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 192, 192);
  
  // Border
  ctx.strokeStyle = '#654321';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 188, 188);
  
  // Game board representation
  ctx.fillStyle = '#F4A460';
  // Top row of pits
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(32 + i * 26, 48, 10, 0, 2 * Math.PI);
    ctx.fill();
  }
  // Bottom row of pits
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(32 + i * 26, 144, 10, 0, 2 * Math.PI);
    ctx.fill();
  }
  
  // Title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('AWALE', 96, 100);
  
  return canvas.toBuffer('image/png');
}

// Create outline icon (32x32)
function createOutlineIcon() {
  const canvas = createCanvas(32, 32);
  const ctx = canvas.getContext('2d');
  
  // Transparent background
  ctx.clearRect(0, 0, 32, 32);
  
  // White outline board
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, 28, 28);
  
  // Small pits
  ctx.fillStyle = '#FFFFFF';
  // Top row
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(8 + i * 8, 10, 2, 0, 2 * Math.PI);
    ctx.fill();
  }
  // Bottom row
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(8 + i * 8, 22, 2, 0, 2 * Math.PI);
    ctx.fill();
  }
  
  return canvas.toBuffer('image/png');
}

// Generate icons
const colorIcon = createColorIcon();
const outlineIcon = createOutlineIcon();

// Save icons
fs.writeFileSync(path.join(__dirname, '../../teams-app/color.png'), colorIcon);
fs.writeFileSync(path.join(__dirname, '../../teams-app/outline.png'), outlineIcon);

console.log('✅ Icons created successfully!');
console.log('📁 color.png (192x192) - Full color app icon');
console.log('📁 outline.png (32x32) - Transparent outline icon');