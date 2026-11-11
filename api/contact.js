// Sends the contact-form message to the gallery's inbox using Resend (https://resend.com).
// Needs RESEND_API_KEY in Vercel. Optional: CONTACT_TO, CONTACT_FROM.
const TO = process.env.CONTACT_TO || 'studio@nitagallery.com.au';
const FROM = process.env.CONTACT_FROM || 'NITA Gallery <studio@nickbrandphotography.com>';

const clean = (s, max) => String(s == null ? '' : s).replace(/[\r\n]+/g, ' ').trim().slice(0, max);

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method' }); }
  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(503).json({ error: 'not_configured' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'bad_request' });

  if (body.website) return res.status(200).json({ ok: true });            // hidden field: bots fill it, people don't

  const name = clean(body.name, 100), email = clean(body.email, 200);
  const message = String(body.message == null ? '' : body.message).trim().slice(0, 4000);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !message) return res.status(400).json({ error: 'invalid' });

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM, to: [TO], reply_to: email,
        subject: `NITA Gallery message from ${name}`,
        text: `From: ${name} <${email}>\n\n${message}\n\n(Sent from the contact form on nitagallery.com.au)`
      })
    });
    if (!r.ok) { const d = await r.json().catch(() => ({})); console.error('Resend error:', d && (d.message || d.name)); return res.status(502).json({ error: 'send_failed' }); }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Contact failed:', e && e.message);
    return res.status(502).json({ error: 'network' });
  }
};
