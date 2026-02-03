#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const port = process.env.PORT || 3001;
const authUser = process.env.AUTH_USER || 'admin';
const authPass = process.env.AUTH_PASS || 'admin';

// Find the package root (where server/dist is)
const pkgRoot = path.resolve(__dirname, '..');
const serverEntry = path.join(pkgRoot, 'server', 'dist', 'index.js');
const whatsappDir = path.join(pkgRoot, 'whatsapp');

// Handle --with-whatsapp flag
if (args.includes('--with-whatsapp') || args.includes('--install-whatsapp')) {
  console.log('\nInstalling WhatsApp integration...\n');

  // Create whatsapp directory if it doesn't exist
  if (!fs.existsSync(whatsappDir)) {
    fs.mkdirSync(whatsappDir, { recursive: true });
  }

  // Create package.json for whatsapp module
  const whatsappPkg = {
    name: "optimushq-whatsapp",
    version: "1.0.0",
    type: "module",
    dependencies: {
      "whatsapp-web.js": "^1.26.0",
      "qrcode-terminal": "^0.12.0"
    }
  };

  fs.writeFileSync(
    path.join(whatsappDir, 'package.json'),
    JSON.stringify(whatsappPkg, null, 2)
  );

  // Download service.ts from GitHub and compile
  const serviceUrl = 'https://raw.githubusercontent.com/goranefbl/optimushq/main/whatsapp/service.ts';

  try {
    console.log('Downloading WhatsApp service...');
    execSync(`curl -sL "${serviceUrl}" -o "${path.join(whatsappDir, 'service.ts')}"`, { stdio: 'inherit' });

    console.log('Installing dependencies (this may take a while due to Puppeteer)...');
    execSync('npm install', { cwd: whatsappDir, stdio: 'inherit' });

    console.log('Compiling TypeScript...');
    execSync('npx tsc service.ts --module ESNext --moduleResolution node --esModuleInterop --skipLibCheck --outDir .', {
      cwd: whatsappDir,
      stdio: 'inherit'
    });

    console.log('\nWhatsApp integration installed successfully!');
    console.log('Restart OptimusHQ to enable WhatsApp in Settings.\n');
  } catch (err) {
    console.error('Failed to install WhatsApp:', err.message);
    process.exit(1);
  }

  // If only installing, exit
  if (args.includes('--install-whatsapp')) {
    process.exit(0);
  }
}

// Check if just showing help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
OptimusHQ - Multi-Agent Platform

Usage: optimushq [options]

Options:
  --with-whatsapp      Install WhatsApp integration and start server
  --install-whatsapp   Install WhatsApp integration only (don't start server)
  --help, -h           Show this help message

Environment Variables:
  PORT                 Server port (default: 3001)
  AUTH_USER            Admin username (default: admin)
  AUTH_PASS            Admin password (default: admin)

Examples:
  npx @goranefbl/optimushq                    Start the server
  npx @goranefbl/optimushq --with-whatsapp    Install WhatsApp and start
  optimushq --install-whatsapp                Install WhatsApp only
`);
  process.exit(0);
}

if (!fs.existsSync(serverEntry)) {
  console.error('Error: Server not built. Run "npm run build" first.');
  process.exit(1);
}

// Check WhatsApp status
const whatsappInstalled = fs.existsSync(path.join(whatsappDir, 'service.js'));

console.log(`
  +-----------------------------------------------------------+
  |                                                           |
  |   OptimusHQ - Multi-Agent Platform                        |
  |                                                           |
  |   Server: http://localhost:${port}                          |
  |   Login:  ${authUser} / ${'*'.repeat(authPass.length)}                                   |
  |   WhatsApp: ${whatsappInstalled ? 'Installed' : 'Not installed (--with-whatsapp)'}                       |
  |                                                           |
  +-----------------------------------------------------------+
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
