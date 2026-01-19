import { test, expect } from '@playwright/test';

/**
 * Smoke Tests for CampaignOS
 * These tests verify that critical features are working
 * They run against Vercel preview deployments via GitHub Actions
 */

test.describe('Smoke Tests', () => {

  // Test 1: Login page loads correctly
  test('login page loads and displays form', async ({ page }) => {
    await page.goto('/login');

    // Check page title/heading
    await expect(page.getByText('CampaignOS')).toBeVisible();
    await expect(page.getByText('Sign in to continue')).toBeVisible();

    // Check form elements exist
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

    // Check register link exists
    await expect(page.getByRole('link', { name: /create one/i })).toBeVisible();
  });

  // Test 2: Invalid login shows error message
  test('invalid login shows error message', async ({ page }) => {
    await page.goto('/login');

    // Fill in invalid credentials
    await page.getByPlaceholder('you@company.com').fill('invalid@test.com');
    await page.getByPlaceholder('••••••••').fill('wrongpassword');

    // Click sign in
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for error message (either "Invalid credentials" or similar)
    await expect(page.getByText(/invalid|error|failed/i)).toBeVisible({ timeout: 10000 });
  });

  // Test 3: Register page loads correctly
  test('register page loads and displays form', async ({ page }) => {
    await page.goto('/register');

    // Check page loads
    await expect(page.getByText('CampaignOS')).toBeVisible();

    // Check form has email and password fields
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  // Test 4: Navigate from login to register
  test('can navigate from login to register', async ({ page }) => {
    await page.goto('/login');

    // Click the register link
    await page.getByRole('link', { name: /create one/i }).click();

    // Should be on register page
    await expect(page).toHaveURL(/\/register/);
  });

  // Test 5: Unauthenticated user is redirected to login
  test('unauthenticated access to dashboard redirects to login', async ({ page }) => {
    // Try to access the main dashboard without auth
    await page.goto('/');

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

});

/**
 * NOTE: To add authenticated tests, you'll need to:
 * 1. Create a test user in your database
 * 2. Add a login helper function
 *
 * Example:
 *
 * async function login(page, email, password) {
 *   await page.goto('/login');
 *   await page.getByPlaceholder('you@company.com').fill(email);
 *   await page.getByPlaceholder('••••••••').fill(password);
 *   await page.getByRole('button', { name: /sign in/i }).click();
 *   await page.waitForURL('/');
 * }
 *
 * Then use it in tests:
 *
 * test('can create activity', async ({ page }) => {
 *   await login(page, 'test@example.com', 'testpassword');
 *   // ... rest of test
 * });
 */
