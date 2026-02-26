import { test, expect } from '@playwright/test';
import { PresentationPage } from '../fixtures/page-objects';
import { waitForApiCall, verifyDownload } from '../utils/test-helpers';

test.describe('PDF Export Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to presentation create page
    await page.goto('/presentation/create');
    await page.waitForLoadState('networkidle');
  });

  test('should export presentation as PDF with default theme', async ({ page }) => {
    // Skip if not authenticated - this test requires auth
    test.skip(!process.env.TEST_USER_EMAIL, 'Authentication required for this test');

    // Wait for presentation to load
    await page.waitForSelector('[data-testid="presentation-editor"], [contenteditable="true"]', {
      timeout: 10000,
    });

    const presentationPage = new PresentationPage(page);
    // Click export button
    await presentationPage.clickExport();

    // Verify export dialog opened
    await expect(page.getByText(/export presentation/i)).toBeVisible();

    // Select PDF format
    await presentationPage.selectExportFormat('pdf');

    // Verify PDF option is selected
    const pdfButton = page.getByRole('button', { name: /pdf/i }).first();
    await expect(pdfButton).toBeVisible();

    // Start download
    const downloadPromise = presentationPage.waitForDownload();
    await presentationPage.confirmExport();

    // Wait for download to complete
    const download = await downloadPromise;

    // Verify download
    const isValid = await verifyDownload(download, '.pdf');
    expect(isValid).toBe(true);

    // Verify filename
    const fileName = download.suggestedFilename();
    expect(fileName).toMatch(/\.pdf$/);

    // Verify success message
    await expect(page.getByText(/export successful/i)).toBeVisible({ timeout: 5000 });
  });

  test('should export presentation as PowerPoint', async ({ page }) => {
    // Skip if not authenticated
    test.skip(!process.env.TEST_USER_EMAIL, 'Authentication required for this test');

    // Wait for presentation to load
    await page.waitForSelector('[data-testid="presentation-editor"], [contenteditable="true"]', {
      timeout: 10000,
    });

    const presentationPage = new PresentationPage(page);
    // Click export button
    await presentationPage.clickExport();

    // Verify export dialog opened
    await expect(page.getByText(/export presentation/i)).toBeVisible();

    // Select PPTX format (default)
    await presentationPage.selectExportFormat('pptx');

    // Start download
    const downloadPromise = presentationPage.waitForDownload();
    await presentationPage.confirmExport();

    // Wait for download to complete
    const download = await downloadPromise;

    // Verify download
    const isValid = await verifyDownload(download, '.pptx');
    expect(isValid).toBe(true);

    // Verify filename
    const fileName = download.suggestedFilename();
    expect(fileName).toMatch(/\.pptx$/);

    // Verify success message
    await expect(page.getByText(/export successful/i)).toBeVisible({ timeout: 5000 });
  });

  test('should handle export errors gracefully', async ({ page }) => {
    // Mock API to return error
    await page.route('**/api/presentation/**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    const presentationPage = new PresentationPage(page);
    // Try to export
    await presentationPage.clickExport();
    await presentationPage.selectExportFormat('pdf');
    await presentationPage.confirmExport();

    // Verify error message appears
    await expect(page.getByText(/export failed|error/i)).toBeVisible({ timeout: 5000 });
  });

  test('should switch between export formats', async ({ page }) => {
    const presentationPage = new PresentationPage(page);
    // Click export button
    await presentationPage.clickExport();

    // Select PDF
    await presentationPage.selectExportFormat('pdf');
    const pdfButton = page.getByRole('button', { name: /pdf/i }).first();
    await expect(pdfButton).toHaveClass(/border-primary/);

    // Switch to PowerPoint
    await presentationPage.selectExportFormat('pptx');
    const pptxButton = page.getByRole('button', { name: /powerpoint/i }).first();
    await expect(pptxButton).toHaveClass(/border-primary/);

    // Close dialog
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByText(/export presentation/i)).not.toBeVisible();
  });

  test('should show loading state during export', async ({ page }) => {
    // Skip if not authenticated
    test.skip(!process.env.TEST_USER_EMAIL, 'Authentication required for this test');

    const presentationPage = new PresentationPage(page);
    await presentationPage.clickExport();
    await presentationPage.selectExportFormat('pdf');

    // Click export button
    const exportButton = page.getByRole('button', { name: /export as pdf/i });
    await exportButton.click();

    // Verify loading state
    await expect(page.getByText(/exporting/i)).toBeVisible({ timeout: 1000 });
  });
});

test.describe('Export Button Visibility', () => {
  test('should show export button on presentation page', async ({ page }) => {
    // Navigate to create page
    await page.goto('/presentation/create');
    await page.waitForLoadState('networkidle');

    // Verify export button exists
    const exportButton = page.getByRole('button', { name: /export/i });
    await expect(exportButton).toBeVisible({ timeout: 10000 });
  });

  test('should not show export button on non-presentation pages', async ({ page }) => {
    // Navigate to home or other page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify export button doesn't exist
    const exportButton = page.getByRole('button', { name: /export/i });
    await expect(exportButton).not.toBeVisible();
  });
});
