import { apiFetch, formatPrice, session } from './api.js';

if (!session.token) location.href = '/';

const countEl = document.querySelector('[data-testid="product-count"]');
const listEl = document.querySelector('[data-testid="product-list"]');
const form = document.getElementById('product-form');
const errorEl = document.querySelector('[data-testid="form-error"]');
const successEl = document.querySelector('[data-testid="form-success"]');

document.querySelector('[data-testid="current-user"]').textContent = session.username;
document.querySelector('[data-testid="logout-btn"]').addEventListener('click', () => {
  session.clear();
  location.href = '/';
});

function renderRow(product) {
  const tr = document.createElement('tr');
  tr.dataset.testid = 'product-row';
  tr.dataset.productId = product.id;
  for (const value of [product.id, product.name, formatPrice(product.price), product.category, product.createdBy]) {
    const td = document.createElement('td');
    td.textContent = value;
    tr.append(td);
  }
  return tr;
}

async function loadProducts() {
  const products = await apiFetch('/products');
  if (!products) return;
  listEl.replaceChildren(...products.map(renderRow));
  countEl.textContent = products.length;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorEl.hidden = true;
  successEl.hidden = true;

  const data = Object.fromEntries(new FormData(form));
  try {
    const product = await apiFetch('/products', {
      method: 'POST',
      // Empty price is sent as null so the BE rejects it (Number('') would silently be 0)
      body: { name: data.name, price: data.price === '' ? null : Number(data.price), category: data.category },
    });
    form.reset();
    await loadProducts();
    successEl.textContent = `Added "${product.name}"`;
    successEl.hidden = false;
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  }
});

loadProducts();
