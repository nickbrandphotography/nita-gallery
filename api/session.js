// Lets the thank-you page confirm that a Stripe Checkout session was really paid.
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const key = process.env.STRIPE_SECRET_KEY;
  const id = String((req.query && req.query.id) || '');
  if (!key) return res.status(503).json({ error: 'not_configured' });
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return res.status(400).json({ error: 'bad_id' });
  try {
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${id}`, { headers: { Authorization: `Bearer ${key}` } });
    const s = await r.json();
    if (!r.ok) return res.status(404).json({ error: 'not_found' });
    return res.status(200).json({
      paid: s.payment_status === 'paid',
      email: (s.customer_details && s.customer_details.email) || null,
      total: typeof s.amount_total === 'number' ? s.amount_total / 100 : null,
      currency: (s.currency || 'aud').toUpperCase()
    });
  } catch (e) { return res.status(502).json({ error: 'network' }); }
};
