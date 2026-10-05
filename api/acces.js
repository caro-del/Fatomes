const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  const s = String(req.query.s || '');
  const t = String(req.query.t || '');

  const attendu = crypto
    .createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET)
    .update(s)
    .digest('hex');

  const a = Buffer.from(t);
  const b = Buffer.from(attendu);
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!s || !ok) {
    res.status(403).setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(
      '<p style="font-family:sans-serif;padding:2rem">Lien invalide. ' +
      'Utilise le lien reçu par email après ton achat, ou ' +
      '<a href="/">retourne à l\'accueil</a>.</p>'
    );
  }

  const html = fs.readFileSync(
    path.join(process.cwd(), 'private', 'outil.html'),
    'utf-8'
  );
  res.status(200);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(html);
};
