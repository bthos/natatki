#!/usr/bin/env node
/**
 * Setup script for mobile package dependencies
 * 
 * This script creates symlinks from root node_modules to local node_modules
 * for React Native dependencies that need to be accessible locally.
 * 
 * This is necessary because:
 * - npm workspaces hoist dependencies to root node_modules
 * - React Native CLI and Gradle expect dependencies in local node_modules
 * - Symlinks allow dependencies to be shared without duplication
 */

const fs = require('fs');
const path = require('path');

// Get the directory where this script is located
const scriptDir = __dirname;
// Project root is one level up from scripts/
const projectRoot = path.resolve(scriptDir, '..');
// Workspace root is two levels up from project root
const workspaceRoot = path.resolve(projectRoot, '../..');
const localNodeModules = path.join(projectRoot, 'node_modules');
const rootNodeModules = path.join(workspaceRoot, 'node_modules');

// Dependencies that need to be symlinked for React Native to work properly
const dependenciesToLink = [
  '@react-native/gradle-plugin',
  'react-native',
  '@react-native-community/cli-platform-android',
  'react-native-svg',
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createSymlink(src, dst) {
  // Remove existing file/directory if it exists
  if (fs.existsSync(dst)) {
    const stats = fs.lstatSync(dst);
    if (stats.isSymbolicLink()) {
      fs.unlinkSync(dst);
    } else if (stats.isDirectory()) {
      fs.rmSync(dst, { recursive: true, force: true });
    } else {
      fs.unlinkSync(dst);
    }
  }

  // Create parent directories
  ensureDir(path.dirname(dst));

  // Create symlink
  try {
    // Use relative path for symlink to make it portable
    const relativeSrc = path.relative(path.dirname(dst), src);
    
    // On Windows, use 'junction' for directories (doesn't require admin)
    // On Unix, use regular symlink
    if (process.platform === 'win32') {
      // Try to create directory junction (works without admin on Windows)
      try {
        fs.symlinkSync(relativeSrc, dst, 'junction');
        console.log(`✓ Linked ${path.basename(dst)} -> ${relativeSrc}`);
      } catch (error) {
        // If junction fails, try regular symlink (requires admin)
        fs.symlinkSync(relativeSrc, dst, 'dir');
        console.log(`✓ Linked ${path.basename(dst)} -> ${relativeSrc} (admin symlink)`);
      }
    } else {
      fs.symlinkSync(relativeSrc, dst, 'dir');
      console.log(`✓ Linked ${path.basename(dst)} -> ${relativeSrc}`);
    }
  } catch (error) {
    console.error(`✗ Failed to link ${path.basename(dst)}:`, error.message);
    console.error(`  Source: ${src}`);
    console.error(`  Destination: ${dst}`);
    
    // On Windows, if symlink fails, provide helpful message
    if (process.platform === 'win32' && error.code === 'EPERM') {
      console.error('\n  Note: Creating symlinks on Windows may require administrator privileges.');
      console.error('  You can either:');
      console.error('  1. Run this command as administrator');
      console.error('  2. Enable Developer Mode in Windows Settings');
      console.error('  3. The postinstall script will fall back to copying files\n');
    }
    throw error;
  }
}

// Main execution
console.log('Setting up React Native dependencies...\n');

// Create node_modules if it doesn't exist
ensureDir(localNodeModules);

let successCount = 0;
let failCount = 0;

// Create symlinks for all dependencies
dependenciesToLink.forEach(dep => {
  const src = path.join(rootNodeModules, dep);
  const dst = path.join(localNodeModules, dep);

  if (fs.existsSync(src)) {
    try {
      createSymlink(src, dst);
      successCount++;
    } catch (error) {
      failCount++;
      // Continue with other dependencies even if one fails
    }
  } else {
    console.warn(`⚠ Source not found: ${dep}`);
    console.warn(`  Expected at: ${src}`);
    failCount++;
  }
});

// ReactAndroid needs to be explicitly linked as a subdirectory
// Some build tools expect it to be directly accessible, and on Windows
// junctions may not properly expose subdirectories
const reactNativeDst = path.join(localNodeModules, 'react-native');
const reactAndroidDst = path.join(reactNativeDst, 'ReactAndroid');
const reactAndroidSrc = path.join(rootNodeModules, 'react-native', 'ReactAndroid');

if (fs.existsSync(reactNativeDst)) {
  if (fs.existsSync(reactAndroidSrc)) {
    // ReactAndroid exists in root node_modules, try to link it
    if (!fs.existsSync(reactAndroidDst)) {
      try {
        createSymlink(reactAndroidSrc, reactAndroidDst);
        successCount++;
      } catch (error) {
        // This is optional - try to continue anyway
        console.warn(`⚠ Could not link ReactAndroid separately: ${error.message}`);
        console.warn(`  It should be accessible through react-native symlink`);
      }
    } else {
      // Check if it's already a symlink or a real directory
      try {
        const stats = fs.lstatSync(reactAndroidDst);
        if (stats.isSymbolicLink()) {
          console.log(`✓ ReactAndroid is already linked`);
        } else if (stats.isDirectory()) {
          console.log(`✓ ReactAndroid exists (may be accessible through react-native symlink)`);
        }
      } catch (error) {
        // If we can't check, try to create the symlink anyway
        try {
          createSymlink(reactAndroidSrc, reactAndroidDst);
          successCount++;
        } catch (linkError) {
          console.warn(`⚠ Could not verify or link ReactAndroid: ${linkError.message}`);
        }
      }
    }
  } else {
    // ReactAndroid doesn't exist in root node_modules
    // This might be normal for some React Native versions or installations
    // Check if it's accessible through the react-native symlink
    if (fs.existsSync(reactAndroidDst)) {
      console.log(`✓ ReactAndroid is accessible through react-native symlink`);
    } else {
      console.warn(`⚠ ReactAndroid not found in root node_modules`);
      console.warn(`  Expected at: ${reactAndroidSrc}`);
      console.warn(`  This may be normal for your React Native version.`);
      console.warn(`  If build fails, ensure react-native is properly installed.`);
    }
  }
}

console.log(`\n✓ Dependencies setup complete: ${successCount} linked, ${failCount} failed`);

// Only exit with error if critical dependencies failed
const criticalDeps = ['@react-native/gradle-plugin', 'react-native', '@react-native-community/cli-platform-android'];
const criticalFailed = dependenciesToLink.filter((dep, idx) => {
  const src = path.join(rootNodeModules, dep);
  return !fs.existsSync(src) && criticalDeps.includes(dep);
});

if (criticalFailed.length > 0) {
  console.warn('\n⚠ Critical dependencies could not be linked. The build will fail.');
  console.warn('  Try running: npm install --workspace=@natatki/mobile');
  process.exit(1);
} else if (failCount > 0) {
  console.warn('\n⚠ Some optional dependencies could not be linked, but build may still work.');
}

// Final check: if ReactAndroid is missing and react-native is linked, warn about potential build issues
const finalReactAndroidCheck = path.join(localNodeModules, 'react-native', 'ReactAndroid');
if (fs.existsSync(path.join(localNodeModules, 'react-native')) && !fs.existsSync(finalReactAndroidCheck)) {
  console.warn('\n⚠ ReactAndroid is not accessible. Android builds may fail.');
  console.warn('  If build fails, try:');
  console.warn('  1. npm install react-native@0.74.5 --workspace=@natatki/mobile');
  console.warn('  2. Or manually copy ReactAndroid from root node_modules if it exists there');
  // Don't exit with error - let the build try and fail with a clearer error message
}
