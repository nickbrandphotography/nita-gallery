(() => {
const $ = s => document.querySelector(s);
const id = new URLSearchParams(location.search).get('session_id');
const title = $('#tyTitle'), msg = $('#tyMsg');
if (!id) {
  title.textContent = 'Your bag is waiting.';
  msg.textContent = 'There is no order to show here. Head back to the shop whenever you are ready.';
} else {
  fetch('/api/session?id=' + encodeURIComponent(id)).then(r => r.ok ? r.json() : Promise.reject()).then(d => {
    if (d.paid) {
      if (window.BAG) window.BAG.clear();
      title.textContent = 'Thank you.';
      msg.textContent = `Your order is confirmed${d.total ? ` (${d.currency} $${d.total.toFixed(2)})` : ''}.${d.email ? ` A receipt is on its way to ${d.email}.` : ''} We will be in touch about delivery. Questions? Write to studio@nickbrandphotography.com.`;
    } else {
      title.textContent = 'Payment not completed.';
      msg.textContent = 'Your card has not been charged. Your bag is still saved, so you can try again from the shop.';
    }
  }).catch(() => {
    title.textContent = 'Thank you.';
    msg.textContent = 'If your payment went through, you will get a receipt from Stripe by email. If you are unsure, write to studio@nickbrandphotography.com and we will check.';
  });
}
})();
