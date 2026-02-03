import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';
import { getDb } from '../db/connection.js';

const router = Router();

// Dynamic import for WhatsApp service (heavy dependency)
let whatsappService: any = null;
let whatsappInitPromise: Promise<void> | null = null;

async function getWhatsAppService() {
  if (!whatsappService) {
    // Import dynamically to avoid loading Puppeteer on every server start
    const module = await import('../../../whatsapp/service.js');
    whatsappService = module.whatsappService;

    // Set up user lookup
    whatsappService.setUserLookup(async (phone: string) => {
      const db = getDb();
      const user = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone) as { id: string } | undefined;
      if (!user) return null;

      // Get user's general project
      const project = db.prepare('SELECT id FROM projects WHERE user_id = ? AND is_general = 1').get(user.id) as { id: string } | undefined;
      return project ? { userId: user.id, projectId: project.id } : null;
    });
  }
  return whatsappService;
}

// Admin only middleware
function adminOnly(req: Request, res: Response, next: Function) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
}

// Get WhatsApp status
router.get('/status', adminOnly, async (req: Request, res: Response) => {
  try {
    const service = await getWhatsAppService();
    const status = service.getStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get QR code as image
router.get('/qr', adminOnly, async (req: Request, res: Response) => {
  try {
    const service = await getWhatsAppService();
    const status = service.getStatus();

    if (status.connected) {
      return res.status(400).json({ error: 'Already connected' });
    }

    if (!status.qrCode) {
      return res.status(202).json({ message: 'QR code not ready yet, try again in a few seconds' });
    }

    // Convert QR string to image
    const qrImage = await QRCode.toDataURL(status.qrCode, { width: 256 });
    res.json({ qrCode: qrImage });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Initialize WhatsApp (start the client)
router.post('/initialize', adminOnly, async (req: Request, res: Response) => {
  try {
    const service = await getWhatsAppService();

    if (service.getStatus().connected) {
      return res.json({ message: 'Already connected' });
    }

    if (service.isInitializing()) {
      return res.json({ message: 'Already initializing' });
    }

    // Start initialization in background
    whatsappInitPromise = service.initialize();
    res.json({ message: 'Initializing WhatsApp, check /qr for QR code' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Disconnect WhatsApp
router.post('/disconnect', adminOnly, async (req: Request, res: Response) => {
  try {
    const service = await getWhatsAppService();
    await service.disconnect();
    res.json({ message: 'Disconnected' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
