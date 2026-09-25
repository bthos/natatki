#!/usr/bin/env node

/**
 * Setup verification script
 * Checks if all required files and configurations are in place
 */

const fs = require('fs');
const path = require('path');

const checks = [];
const errors = [];
const warnings = [];

// Check if required directories exist
function checkDirectory(dir, name) {
  if (fs.existsSync(dir)) {
    checks.push(`✓ ${name} directory exists`);
    return true;
  } else {
    errors.push(`✗ ${name} directory missing: ${dir}`);
    return false;
  }
}

// Check if required files exist
function checkFile(file, name, optional = false) {
  if (fs.existsSync(file)) {
    checks.push(`✓ ${name} exists`);
    return true;
  } else {
    if (optional) {
      warnings.push(`⚠ ${name} missing (optional): ${file}`);
    } else {
      errors.push(`✗ ${name} missing: ${file}`);
    }
    return false;
  }
}

// Check package.json files
function checkPackageJson(pkgPath, name) {
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.dependencies || pkg.devDependencies) {
        checks.push(`✓ ${name} package.json is valid`);
        return true;
      } else {
        warnings.push(`⚠ ${name} package.json has no dependencies`);
        return true;
      }
    } catch (e) {
      errors.push(`✗ ${name} package.json is invalid: ${e.message}`);
      return false;
    }
  } else {
    errors.push(`✗ ${name} package.json missing: ${pkgPath}`);
    return false;
  }
}

console.log('🔍 Verifying natatki setup...\n');

// Check root structure
checkDirectory('packages', 'Packages');
checkFile('package.json', 'Root package.json');
checkFile('README.md', 'README');
checkFile('SETUP.md', 'SETUP guide');

// Check packages
const packages = ['shared', 'backend', 'web', 'mobile'];

packages.forEach(pkg => {
  const pkgDir = path.join('packages', pkg);
  checkDirectory(pkgDir, `Package: ${pkg}`);
  checkPackageJson(path.join(pkgDir, 'package.json'), pkg);
  
  // Package-specific checks
  if (pkg === 'backend') {
    checkFile(path.join(pkgDir, '.env.example'), 'Backend .env.example', true);
    checkFile(path.join(pkgDir, 'src', 'index.ts'), 'Backend entry point');
  }
  
  if (pkg === 'web') {
    checkFile(path.join(pkgDir, 'next.config.js'), 'Next.js config');
    checkFile(path.join(pkgDir, 'src', 'app', 'page.tsx'), 'Web app entry point');
  }
  
  if (pkg === 'mobile') {
    checkFile(path.join(pkgDir, 'babel.config.js'), 'Babel config');
    checkFile(path.join(pkgDir, 'src', 'App.tsx'), 'Mobile app entry point');
  }
  
  if (pkg === 'shared') {
    checkFile(path.join(pkgDir, 'src', 'index.ts'), 'Shared package entry point');
  }
});

// Check if node_modules exist (optional - might not be installed yet)
packages.forEach(pkg => {
  const nodeModules = path.join('packages', pkg, 'node_modules');
  if (!fs.existsSync(nodeModules)) {
    warnings.push(`⚠ ${pkg} dependencies not installed (run: npm install)`);
  }
});

// Summary
console.log('\n📋 Summary:\n');
checks.forEach(check => console.log(check));

if (warnings.length > 0) {
  console.log('\n⚠️  Warnings:');
  warnings.forEach(warning => console.log(warning));
}

if (errors.length > 0) {
  console.log('\n❌ Errors:');
  errors.forEach(error => console.log(error));
  console.log('\n❌ Setup incomplete. Please fix the errors above.');
  process.exit(1);
} else {
  console.log('\n✅ Setup verification passed!');
  if (warnings.length > 0) {
    console.log('⚠️  Some optional items are missing, but setup is valid.');
  }
  process.exit(0);
}

