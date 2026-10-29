import { test as base } from '@playwright/test';
import { deleteProductsByName } from './utils/db';

export type TestProduct = {
  name: string;
  price: number;
  category: string;
};

export const TEST_USER = {
  username: process.env.TEST_USERNAME ?? 'testuser',
  password: process.env.TEST_PASSWORD ?? 'Test@123',
};

export const test = base.extend<{ testProduct: TestProduct }>({
  // Unique product per test run; removed from the DB afterwards even if the test fails
  testProduct: async ({}, use, testInfo) => {
    const product: TestProduct = {
      name: `E2E-Product-${Date.now()}-${testInfo.workerIndex}`,
      price: 100000,
      category: 'Electronics',
    };
    await use(product);
    await deleteProductsByName(product.name);
  },
});

export { expect } from '@playwright/test';
