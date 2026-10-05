const Stripe = require('stripe');
const { Resend } = require('resend');
const crypto = require('crypto');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks);

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      raw,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (e) {
    return res.status(400).send('Signature invalide');
  }

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object;
    const email = s.customer_details && s.customer_details.email;
    if (s.payment_status === 'paid' && email) {
      const token = crypto
        .createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET)
        .update(s.id)
        .digest('hex');
      const lien =
        'https://fatomes.vercel.app/api/acces?s=' +
        encodeURIComponent(s.id) +
        '&t=' + token;
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Fantômes <onboarding@resend.dev>',
        to: email,
        subject: 'Ton audit Fantômes',
        html:
          '<p>Merci pour ton achat !</p>' +
          '<p><a href="' + lien + '">Ouvrir mon audit</a></p>' +
          '<p>Garde cet email : ce lien est ton accès personnel.</p>'
      });
    }
  }

  res.status(200).json({ received: true });
};
