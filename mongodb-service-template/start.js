#!/usr/bin/env node

/**
 * Simple startup script for MongoDB Service Template
 * Validates environment and starts the service with helpful guidance
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🚀 Starting MongoDB Service Template...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('⚠️  No .env file found. Creating from example...');

  const examplePath = path.join(__dirname, '.env.example');
  if (fs.existsSync(examplePath)) {
    try {
      fs.copyFileSync(examplePath, envPath);
      console.log('✅ Created .env file from .env.example');
      console.log('📝 Please edit .env file with your MongoDB connection settings\n');
    } catch (error) {
      console.log('❌ Could not create .env file:', error.message);
      console.log('📝 Please manually copy .env.example to .env\n');
    }
  } else {
    console.log('❌ No .env.example file found');
    console.log('📝 Please create .env file with required environment variables\n');
  }
}

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('📦 Installing dependencies...');
  const npmInstall = spawn('npm', ['install'], {
    stdio: 'inherit',
    shell: true,
  });

  npmInstall.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Dependencies installed successfully\n');
      startService();
    } else {
      console.log('❌ Failed to install dependencies');
      process.exit(1);
    }
  });
} else {
  startService();
}

function startService() {
  console.log('🏗️  Building TypeScript...');

  const buildProcess = spawn('npm', ['run', 'build'], {
    stdio: 'inherit',
    shell: true,
  });

  buildProcess.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Build successful\n');
      console.log('🌟 Starting MongoDB service in development mode...\n');

      // Start the service
      const devProcess = spawn('npm', ['run', 'dev'], {
        stdio: 'inherit',
        shell: true,
      });

      // Handle cleanup on exit
      process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down service...');
        devProcess.kill('SIGINT');
      });

      process.on('SIGTERM', () => {
        console.log('\n🛑 Shutting down service...');
        devProcess.kill('SIGTERM');
      });
    } else {
      console.log('❌ Build failed. Please check TypeScript errors.');
      console.log('💡 You can run "npm run dev" to see detailed errors.\n');
      process.exit(1);
    }
  });
}

// Display helpful information
console.log('📋 Service Information:');
console.log('  • Port: 3002 (default)');
console.log('  • Database: MongoDB');
console.log('  • Features: REST API with TypeScript');
console.log('  • Health check: http://localhost:3002/health');
console.log('  • API Documentation: http://localhost:3002/api-docs');
console.log('  • Documentation: See README.md and docs/\n');