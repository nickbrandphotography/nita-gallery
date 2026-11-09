// Creates a Stripe Checkout session for the items in the bag.
// Prices, names and photos come from catalog.json on the server, never from the browser,
// so a visitor cannot change a price. Delivery comes from shipping.json (the zone for their country).
const catalog = require('../catalog.json');
const shipping = require('../shipping.json');

const byId = Object.fromEntries(catalog.items.map(i => [i.id, i]));
const CURRENCY = (catalog.currency || 'aud').toLowerCase();
const BRAND = { 'second-skin': 'Second Skin', 'nikki-b': 'nikkib', 'ritushka': 'Ritushka', 'nick-brand': 'Nick Brand Photography' };
const isArt = it => it.brand === 'ritushka' || it.brand === 'nick-brand';

function zoneFor(code) {
  return shipping.zones.find(z => z.countries.includes(code)) || shipping.zones.find(z => z.countries.includes('*'));
}
const priced = it => typeof it.price === 'number' && it.price > 0;

function siteOrigin(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method' }); }
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(503).json({ error: 'not_configured' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  const items = Array.isArray(body && body.items) ? body.items : [];
  const seen = new Set(), lines = [], unpriced = [], soldOut = [];
  for (const it of items) {
    const id = String(it && it.id), qty = Math.floor(Number(it && it.qty)), pc = byId[id];
    if (!pc || seen.has(id) || !(qty >= 1)) continue;
    seen.add(id);
    if (pc.sold) { soldOut.push(pc.name); continue; }
    if (!priced(pc)) { unpriced.push(pc.name); continue; }
    lines.push({ id, qty: Math.min(qty, pc.max || 5) });
  }
  if (soldOut.length) return res.status(422).json({ error: 'sold', names: soldOut });
  if (unpriced.length) return res.status(422).json({ error: 'unpriced', names: unpriced });
  if (!lines.length) return res.status(400).json({ error: 'empty' });

  const country = String((body && body.country) || '').toUpperCase();
  if (!shipping.countries[country]) return res.status(400).json({ error: 'bad_country' });
  const zone = zoneFor(country);
  // jewellery and scarves ship at the zone's "amount", framed artworks at its "artwork" price; a mixed cart pays the higher
  const needs = [];
  if (lines.some(l => !isArt(byId[l.id]))) needs.push(zone && zone.amount);
  if (lines.some(l => isArt(byId[l.id]))) needs.push(zone && zone.artwork);
  if (!zone || needs.some(v => typeof v !== 'number' || !(v >= 0))) {
    return res.status(422).json({ error: 'shipping_unavailable', country: shipping.countries[country] });
  }
  const shipAmount = Math.max(...needs);
  const hasFramedPhoto = lines.some(l => byId[l.id].brand === 'nick-brand');

  const origin = siteOrigin(req), p = new URLSearchParams();
  p.set('mode', 'payment'); p.set('locale', 'en-AU');
  p.set('billing_address_collection', 'auto');
  p.set('phone_number_collection[enabled]', 'true');
  p.set('allow_promotion_codes', 'true');
  // only the chosen country is allowed, so the address always matches the delivery price
  p.set('shipping_address_collection[allowed_countries][0]', country);
  p.set('shipping_options[0][shipping_rate_data][type]', 'fixed_amount');
  p.set('shipping_options[0][shipping_rate_data][display_name]', zone.label);
  p.set('shipping_options[0][shipping_rate_data][fixed_amount][amount]', String(Math.round(shipAmount * 100)));
  p.set('shipping_options[0][shipping_rate_data][fixed_amount][currency]', shipping.currency || CURRENCY);
  if (hasFramedPhoto) {   // photographs are framed to order, so ask which frame at checkout
    p.set('custom_fields[0][key]', 'frame');
    p.set('custom_fields[0][label][type]', 'custom');
    p.set('custom_fields[0][label][custom]', 'Frame colour (photographs)');
    p.set('custom_fields[0][type]', 'dropdown');
    [['Black', 'black'], ['Natural oak', 'oak'], ['White', 'white']].forEach(([lab, val], k) => {
      p.set(`custom_fields[0][dropdown][options][${k}][label]`, lab);
      p.set(`custom_fields[0][dropdown][options][${k}][value]`, val);
    });
  }
  lines.forEach((l, i) => {
    const pc = byId[l.id], b = `line_items[${i}]`;
    const desc = [pc.type, pc.desc || (pc.brand === 'second-skin' ? pc.alt : ''), pc.place].filter(Boolean).join(' · ');
    p.set(`${b}[quantity]`, String(l.qty));
    p.set(`${b}[price_data][currency]`, CURRENCY);
    p.set(`${b}[price_data][unit_amount]`, String(Math.round(pc.price * 100)));
    p.set(`${b}[price_data][product_data][name]`, `${BRAND[pc.brand] || 'NITA Gallery'} ${pc.name}`);
    if (desc) p.set(`${b}[price_data][product_data][description]`, desc.slice(0, 480));
    p.set(`${b}[price_data][product_data][images][0]`, `${origin}/${pc.img}`);
    p.set(`${b}[price_data][product_data][metadata][item]`, l.id);
  });
  p.set('success_url', `${origin}/thanks?session_id={CHECKOUT_SESSION_ID}`);
  p.set('cancel_url', `${origin}/shop`);
  p.set('metadata[source]', 'nitagallery.com.au');
  p.set('metadata[ship_zone]', zone.id);

  try {
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: p
    });
    const data = await r.json();
    if (!r.ok || !data.url) { console.error('Stripe error:', data && data.error && data.error.message); return res.status(502).json({ error: 'stripe' }); }
    return res.status(200).json({ url: data.url });
  } catch (e) {
    console.error('Checkout failed:', e && e.message);
    return res.status(502).json({ error: 'network' });
  }
};
