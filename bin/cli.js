#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const port = process.env.PORT || 3001;
const authUser = process.env.AUTH_USER || 'admin';
const authPass = process.env.AUTH_PASS || 'admin';

// Find the package root (where server/dist is)
const pkgRoot = path.resolve(__dirname, '..');
const serverEntry = path.join(pkgRoot, 'server', 'dist', 'index.js');

if (!fs.existsSync(serverEntry)) {
  console.error('Error: Server not built. Run "npm run build" first.');
  process.exit(1);
}

console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║   OptimusHQ - Multi-Agent Platform                        ║
  ║                                                           ║
  ║   Starting server on http://localhost:${port}               ║
  ║                                                           ║
  ║   Login: ${authUser} / ${'*'.repeat(authPass.length)}
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
`);

const server = spawn('node', [serverEntry], {
  cwd: pkgRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: port,
    AUTH_USER: authUser,
    AUTH_PASS: authPass,
  },
});

server.on('error', (err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});

server.on('close', (code) => {
  process.exit(code || 0);
});

// Handle termination
process.on('SIGINT', () => {
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  server.kill('SIGTERM');
});
