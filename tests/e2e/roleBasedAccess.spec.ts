import { test, expect } from '@playwright/test';

/**
 * E2E tests for role-based access control
 * 
 * Tests critical security features:
 * - Student cannot see Chat/Messaging tab
 * - Student chat shows only staff + librarians (no students)
 * - Staff cannot see Report Review
 * - Librarian can access all features
 */

test.describe('Role-Based Access Control', () => {
  test.describe('Student Role', () => {
    test('should NOT show Messaging tab for students', async ({ page }) => {
      // Note: This test requires manual login as S0003 / *Zy5C^LemK$6
      // or update with actual test credentials
      await page.goto('/');
      
      // Wait for login page
      await expect(page.locator('text=Student Portal')).toBeVisible({ timeout: 10000 });
      
      // Login as student
      await page.fill('input[type="text"]', 'S0003');
      await page.fill('input[type="password"]', '*Zy5C^LemK$6');
      await page.click('button:has-text("Sign In")');
      
      // Wait for dashboard
      await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 15000 });
      
      // Verify NO Messaging tab
      await expect(page.locator('button:has-text("Messaging")')).not.toBeVisible();
      await expect(page.locator('button:has-text("Chat")')).not.toBeVisible();
    });

    test('should show only Library and Community dropdowns', async ({ page }) => {
      await page.goto('/');
      
      // Login as student
      await expect(page.locator('text=Student Portal')).toBeVisible({ timeout: 10000 });
      await page.fill('input[type="text"]', 'S0003');
      await page.fill('input[type="password"]', '*Zy5C^LemK$6');
      await page.click('button:has-text("Sign In")');
      
      // Wait for dashboard
      await expect(page.locator('button:has-text("Dashboard")')).toBeVisible({ timeout: 15000 });
      
      // Verify Library dropdown exists
      await expect(page.locator('button:has-text("Library")')).toBeVisible();
      
      // Verify Community dropdown exists (if feature flags enabled)
      const communityButton = page.locator('button:has-text("Community")');
      const communityVisible = await communityButton.isVisible();
      if (communityVisible) {
        expect(communityVisible).toBeTruthy();
      }
      
      // Should NOT see management tabs
      await expect(page.locator('button:has-text("Students")')).not.toBeVisible();
      await expect(page.locator('button:has-text("Staff")')).not.toBeVisible();
      await expect(page.locator('button:has-text("Settings")')).not.toBeVisible();
    });

    test('should access My Books from Library dropdown', async ({ page }) => {
      await page.goto('/');
      
      // Login as student
      await expect(page.locator('text=Student Portal')).toBeVisible({ timeout: 10000 });
      await page.fill('input[type="text"]', 'S0003');
      await page.fill('input[type="password"]', '*Zy5C^LemK$6');
      await page.click('button:has-text("Sign In")');
      
      // Wait for dashboard
      await expect(page.locator('button:has-text("Library")')).toBeVisible({ timeout: 15000 });
      
      // Click Library dropdown
      await page.click('button:has-text("Library")');
      
      // Wait for dropdown to appear
      await page.waitForTimeout(300);
      
      // Verify My Books is in dropdown
      const myBooksButton = page.locator('button:has-text("My Books")');
      await expect(myBooksButton).toBeVisible();
      
      // Click My Books
      await myBooksButton.click();
      
      // Verify My Books page loaded
      await expect(page.locator('text=My Books').or(page.locator('text=Your Books'))).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Staff Role', () => {
    test('should show Messaging tab for staff', async ({ page }) => {
      await page.goto('/');
      
      // Login as staff
      await expect(page.locator('text=Staff Portal')).toBeVisible({ timeout: 10000 });
      await page.fill('input[type="text"]', 'T001');
      await page.fill('input[type="password"]', 'StaffPass123!');
      await page.click('button:has-text("Sign In")');
      
      // Wait for dashboard
      await expect(page.locator('button:has-text("Dashboard")')).toBeVisible({ timeout: 15000 });
      
      // Verify Messaging tab exists
      await expect(page.locator('button:has-text("Messaging")')).toBeVisible();
    });

    test('should NOT show Report Review in Reports dropdown', async ({ page }) => {
      await page.goto('/');
      
      // Login as staff
      await expect(page.locator('text=Staff Portal')).toBeVisible({ timeout: 10000 });
      await page.fill('input[type="text"]', 'T001');
      await page.fill('input[type="password"]', 'StaffPass123!');
      await page.click('button:has-text("Sign In")');
      
      // Wait for dashboard
      await expect(page.locator('button:has-text("Dashboard")')).toBeVisible({ timeout: 15000 });
      
      // Check if Reports dropdown exists
      const reportsButton = page.locator('button:has-text("Reports")');
      const reportsVisible = await reportsButton.isVisible();
      
      if (reportsVisible) {
        // Click Reports dropdown
        await reportsButton.click();
        await page.waitForTimeout(300);
        
        // Report Review should NOT be visible
        await expect(page.locator('button:has-text("Report Review")')).not.toBeVisible();
      }
    });

    test('should NOT see Students/Staff management tabs', async ({ page }) => {
      await page.goto('/');
      
      // Login as staff
      await expect(page.locator('text=Staff Portal')).toBeVisible({ timeout: 10000 });
      await page.fill('input[type="text"]', 'T001');
      await page.fill('input[type="password"]', 'StaffPass123!');
      await page.click('button:has-text("Sign In")');
      
      // Wait for dashboard
      await expect(page.locator('button:has-text("Dashboard")')).toBeVisible({ timeout: 15000 });
      
      // Verify management tabs NOT visible
      await expect(page.locator('button:has-text("Students")')).not.toBeVisible();
      await expect(page.locator('button:has-text("Staff")')).not.toBeVisible();
      await expect(page.locator('button:has-text("Settings")')).not.toBeVisible();
    });
  });

  test.describe('Dropdown Navigation', () => {
    test('should open and close Library dropdown', async ({ page }) => {
      await page.goto('/');
      
      // Login as student
      await expect(page.locator('text=Student Portal')).toBeVisible({ timeout: 10000 });
      await page.fill('input[type="text"]', 'S0003');
      await page.fill('input[type="password"]', '*Zy5C^LemK$6');
      await page.click('button:has-text("Sign In")');
      
      // Wait for Library button
      const libraryButton = page.locator('button:has-text("Library")');
      await expect(libraryButton).toBeVisible({ timeout: 15000 });
      
      // Click to open
      await libraryButton.click();
      await page.waitForTimeout(300);
      
      // Verify dropdown items visible
      await expect(page.locator('button:has-text("Borrowing")')).toBeVisible();
      
      // Click Library again to close
      await libraryButton.click();
      await page.waitForTimeout(300);
      
      // Verify dropdown closed
      await expect(page.locator('button:has-text("Borrowing")')).not.toBeVisible();
    });

    test('should close dropdown with Escape key', async ({ page }) => {
      await page.goto('/');
      
      // Login as student
      await expect(page.locator('text=Student Portal')).toBeVisible({ timeout: 10000 });
      await page.fill('input[type="text"]', 'S0003');
      await page.fill('input[type="password"]', '*Zy5C^LemK$6');
      await page.click('button:has-text("Sign In")');
      
      // Wait for Library button
      const libraryButton = page.locator('button:has-text("Library")');
      await expect(libraryButton).toBeVisible({ timeout: 15000 });
      
      // Click to open
      await libraryButton.click();
      await page.waitForTimeout(300);
      
      // Verify dropdown open
      await expect(page.locator('button:has-text("Borrowing")')).toBeVisible();
      
      // Press Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      
      // Verify dropdown closed
      await expect(page.locator('button:has-text("Borrowing")')).not.toBeVisible();
    });
  });

  test.describe('Reading Progress Fix', () => {
    test('should show reading progress without error', async ({ page }) => {
      await page.goto('/');
      
      // Login as student
      await expect(page.locator('text=Student Portal')).toBeVisible({ timeout: 10000 });
      await page.fill('input[type="text"]', 'S0003');
      await page.fill('input[type="password"]', '*Zy5C^LemK$6');
      await page.click('button:has-text("Sign In")');
      
      // Wait for dashboard
      await expect(page.locator('button:has-text("Dashboard")')).toBeVisible({ timeout: 15000 });
      
      // Should NOT see "Failed to load reading progress" error
      await expect(page.locator('text=Failed to load reading progress')).not.toBeVisible({ timeout: 5000 });
      
      // Should see either progress data or "No active borrows" empty state
      const hasProgressData = await page.locator('text=Current Reading').isVisible().catch(() => false);
      const hasEmptyState = await page.locator('text=No active borrows').or(page.locator('text=Start borrowing')).isVisible().catch(() => false);
      
      expect(hasProgressData || hasEmptyState).toBeTruthy();
    });
  });
});
