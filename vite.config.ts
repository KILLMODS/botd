import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

const CRYPTO_BOT_TOKEN = process.env.CRYPTO_BOT_TOKEN || '662370:AARfAYc3i7xelw6VdEomWOY043wF8cQ4wGb';
const BOT_TOKEN = process.env.BOT_TOKEN || '8345869119:AAGFhcUORebKHj0TeABn_3ZcZIi_BwQr6SE';

function paymentProxyPlugin(): Plugin {
  const setupMiddlewares = (server: any) => {
    // 1. Create CryptoBot Invoice Server-Side (No CORS)
    server.middlewares.use('/api/proxy/cryptobot/createInvoice', async (req: any, res: any) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => (body += chunk));
        req.on('end', async () => {
          try {
            const payload = JSON.parse(body || '{}');
            const cryptRes = await fetch('https://pay.crypt.bot/api/createInvoice', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Crypto-Pay-API-Token': CRYPTO_BOT_TOKEN,
              },
              body: JSON.stringify(payload),
            });
            const data = await cryptRes.json();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
          } catch (err: any) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: err.message || String(err) }));
          }
        });
      } else {
        res.statusCode = 405;
        res.end();
      }
    });

    // 2. Check CryptoBot Invoices Server-Side
    server.middlewares.use('/api/proxy/cryptobot/getInvoices', async (req: any, res: any) => {
      try {
        const url = new URL(req.url, 'http://localhost:3000');
        const invoiceIds = url.searchParams.get('invoice_ids') || '';
        const cryptRes = await fetch(`https://pay.crypt.bot/api/getInvoices?invoice_ids=${invoiceIds}`, {
          method: 'GET',
          headers: {
            'Crypto-Pay-API-Token': CRYPTO_BOT_TOKEN,
          },
        });
        const data = await cryptRes.json();
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
      } catch (err: any) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, error: err.message || String(err) }));
      }
    });

    // 3. Create Telegram Stars Invoice Link Server-Side
    server.middlewares.use('/api/proxy/telegram/createInvoiceLink', async (req: any, res: any) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => (body += chunk));
        req.on('end', async () => {
          try {
            const payload = JSON.parse(body || '{}');
            const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            const data = await tgRes.json();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
          } catch (err: any) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: err.message || String(err) }));
          }
        });
      } else {
        res.statusCode = 405;
        res.end();
      }
    });
  };

  return {
    name: 'payment-proxy-plugin',
    configureServer(server) {
      setupMiddlewares(server);
    },
    configurePreviewServer(server) {
      setupMiddlewares(server);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), paymentProxyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      allowedHosts: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      allowedHosts: true,
    },
  };
});
