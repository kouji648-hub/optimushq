# WhatsApp Bot for OptimusHQ

Chat with your OptimusHQ agents via WhatsApp.

## Setup

1. **Configure your phone number** (optional):
   ```bash
   export WHATSAPP_ADMIN_NUMBER="1234567890"  # Your number (country code, no +)
   export WHATSAPP_ALLOWED_NUMBERS=""          # Leave empty to allow all
   ```

2. **Start the bot**:
   ```bash
   cd /root/claude-chat/whatsapp
   node dist/index.js
   ```

3. **Scan the QR code** with your old phone's WhatsApp

4. **Send a message** to test:
   - "How are my projects doing?"
   - "What's the status of VIP Nightlife?"
   - "Show me recent activity"

## Running with PM2

```bash
pm2 start ecosystem.config.cjs
pm2 logs whatsapp-bot
```

## Notes

- Uses whatsapp-web.js (linked device mode)
- Phone must come online every ~14 days to maintain session
- Session data stored in `.wwebjs_auth/`
- Bot has access to all project-manager MCP tools
