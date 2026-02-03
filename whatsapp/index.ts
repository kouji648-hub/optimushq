import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MCP_CONFIG_PATH = path.join(__dirname, '..', 'mcp-config.json');

// Config - which numbers can talk to the bot
const ALLOWED_NUMBERS = process.env.WHATSAPP_ALLOWED_NUMBERS?.split(',') || [];
const ADMIN_NUMBER = process.env.WHATSAPP_ADMIN_NUMBER || '';

// Track active conversations to avoid duplicate processing
const processing = new Set<string>();

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

client.on('qr', (qr) => {
  console.log('Scan this QR code with your WhatsApp:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('WhatsApp bot is ready!');
  console.log('Allowed numbers:', ALLOWED_NUMBERS.length ? ALLOWED_NUMBERS : 'ALL');
});

client.on('message', async (msg) => {
  // Ignore group messages, only handle direct messages
  if (msg.from.includes('@g.us')) return;

  // Extract phone number (remove @c.us suffix)
  const phone = msg.from.replace('@c.us', '');

  // Check if number is allowed (if whitelist is set)
  if (ALLOWED_NUMBERS.length > 0 && !ALLOWED_NUMBERS.includes(phone) && phone !== ADMIN_NUMBER) {
    console.log(`[IGNORED] Message from unauthorized number: ${phone}`);
    return;
  }

  // Avoid duplicate processing
  if (processing.has(msg.id._serialized)) return;
  processing.add(msg.id._serialized);

  console.log(`[MESSAGE] From ${phone}: ${msg.body}`);

  try {
    // Send typing indicator
    const chat = await msg.getChat();
    await chat.sendStateTyping();

    // Process with Claude
    const response = await askClaude(msg.body, phone);

    // Reply
    await msg.reply(response);
    console.log(`[REPLY] To ${phone}: ${response.substring(0, 100)}...`);
  } catch (err: any) {
    console.error(`[ERROR] ${err.message}`);
    await msg.reply('Sorry, I encountered an error processing your request.');
  } finally {
    processing.delete(msg.id._serialized);
  }
});

async function askClaude(question: string, userPhone: string): Promise<string> {
  const systemPrompt = `You are a helpful assistant that provides status updates on projects.
You have access to the project-manager MCP tools to check project status, recent sessions, and activity.

When asked about projects:
- Use get_project_status to check specific project activity
- Use list_projects to see all available projects
- Use search_memory to find relevant information

Keep responses concise and suitable for WhatsApp (under 1000 chars when possible).
Use simple formatting - no markdown, just plain text with line breaks.

The user is contacting you via WhatsApp from phone: ${userPhone}`;

  return new Promise((resolve, reject) => {
    const args = [
      '--print',
      '--model', 'sonnet',
      '--dangerously-skip-permissions',
      '--mcp-config', MCP_CONFIG_PATH,
      '--system-prompt', systemPrompt,
      '--max-turns', '5',
      '--', question,
    ];

    const child = spawn('claude', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      env: { ...process.env, HOME: process.env.HOME || '/home/claude' },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0 && stdout.trim()) {
        resolve(stdout.trim());
      } else {
        reject(new Error(stderr || `Claude exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });

    // Timeout after 2 minutes
    setTimeout(() => {
      child.kill();
      reject(new Error('Request timed out'));
    }, 120000);
  });
}

client.on('auth_failure', (msg) => {
  console.error('Authentication failed:', msg);
});

client.on('disconnected', (reason) => {
  console.log('Client disconnected:', reason);
  process.exit(1);
});

console.log('Starting WhatsApp bot...');
client.initialize();
