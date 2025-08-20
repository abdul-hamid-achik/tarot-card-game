#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const sourceDir = path.resolve(__dirname, '../sounds/effects');
const targetDir = path.resolve(__dirname, '../sounds/effects-mp3');

console.log('🎵 Converting WAV files to MP3 for better Safari compatibility...');
console.log(`Source: ${sourceDir}`);
console.log(`Target: ${targetDir}`);

// Create target directory
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

// Get all WAV files
const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.wav'));

console.log(`Found ${files.length} WAV files to convert`);

files.forEach((file, index) => {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file.replace('.wav', '.mp3'));

    try {
        console.log(`[${index + 1}/${files.length}] Converting ${file}...`);

        // Use ffmpeg to convert WAV to MP3 with high quality settings
        execSync(`ffmpeg -i "${sourcePath}" -codec:a libmp3lame -qscale:a 2 "${targetPath}"`, {
            stdio: 'pipe'
        });

        console.log(`✅ ${file} -> ${path.basename(targetPath)}`);
    } catch (error) {
        console.error(`❌ Failed to convert ${file}:`, error.message);
    }
});

console.log('🎵 Conversion complete!');
console.log(`Converted ${files.length} files to ${targetDir}`);
