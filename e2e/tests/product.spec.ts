import { test, expect, TEST_USER } from '../fixtures';
import { findProductsByName } from '../utils/db';

const formatPrice = (price: number) => `${new Intl.NumberFormat('en-US').format(price)} VND`;

test('add product: verify UI, product count and DB', async ({ page, testProduct }) => {
  await test.step('1. Login', async () => {
    await page.goto('/');
    await page.getByTestId('username').fill(TEST_USER.username);
    await page.getByTestId('password').fill(TEST_USER.password);
    await page.getByTestId('login-btn').click();
    await expect(page).toHaveURL(/\/products\.html$/);
    await expect(page.getByTestId('current-user')).toHaveText(TEST_USER.username);
  });

  const countBefore = await test.step('2. Count current products', async () => {
    const countEl = page.getByTestId('product-count');
    await expect(countEl).toHaveText(/^\d+$/);
    return Number(await countEl.textContent());
  });

  await test.step('3. Add 1 product', async () => {
    await page.getByTestId('product-name').fill(testProduct.name);
    await page.getByTestId('product-price').fill(String(testProduct.price));
    await page.getByTestId('product-category').selectOption(testProduct.category);
    await page.getByTestId('add-btn').click();
    await expect(page.getByTestId('form-success')).toHaveText(`Added "${testProduct.name}"`);
  });

  await test.step('4. Verify the new product is displayed', async () => {
    const row = page.getByTestId('product-row').filter({ hasText: testProduct.name });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(formatPrice(testProduct.price));
    await expect(row).toContainText(testProduct.category);
    await expect(row).toContainText(TEST_USER.username);
  });

  await test.step('5. Verify product count increased by 1', async () => {
    await expect(page.getByTestId('product-count')).toHaveText(String(countBefore + 1));
  });

  await test.step('6. Verify product saved correctly in DB', async () => {
    const rows = await findProductsByName(testProduct.name);
    expect(rows, 'exactly 1 row in DB').toHaveLength(1);
    expect(rows[0]).toMatchObject({
      name: testProduct.name,
      price: testProduct.price,
      category: testProduct.category,
      created_by: TEST_USER.username,
    });
  });
});
