import type { Page, Download } from '@playwright/test';

/**
 * Wait for network to be idle
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Wait for a specific API call to complete
 */
export async function waitForApiCall(
  page: Page,
  url: string | RegExp,
  method: string = 'GET'
) {
  return page.waitForResponse(
    (response) => {
      const matchesUrl = typeof url === 'string'
        ? response.url().includes(url)
        : url.test(response.url());
      const matchesMethod = response.request().method() === method;
      return matchesUrl && matchesMethod;
    },
    { timeout: 30000 }
  );
}

/**
 * Take a full page screenshot
 */
export async function takeFullPageScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `./test-results/screenshots/${name}.png`,
    fullPage: true,
  });
}

/**
 * Verify download completed successfully
 */
export async function verifyDownload(
  download: Download,
  expectedExtension: string
): Promise<boolean> {
  const fileName = download.suggestedFilename();
  const hasCorrectExtension = fileName.endsWith(expectedExtension);

  // Verify file was actually downloaded
  const path = await download.path();
  const fileExists = path !== null;

  return hasCorrectExtension && fileExists;
}

/**
 * Get download file buffer
 */
export async function getDownloadBuffer(download: Download): Promise<Buffer> {
  const path = await download.path();
  if (!path) {
    throw new Error('Download path is null');
  }

  const fs = require('fs');
  return fs.readFileSync(path);
}

/**
 * Mock API response
 */
export async function mockApiResponse(
  page: Page,
  url: string | RegExp,
  response: any,
  status = 200
) {
  await page.route(url, (route) => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Wait for element with text
 */
export async function waitForText(page: Page, text: string | RegExp, timeout = 5000) {
  await page.getByText(text).waitFor({ timeout });
}

/**
 * Retry action until it succeeds or max retries reached
 */
export async function retryAction<T>(
  action: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await action();
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error('Max retries exceeded');
}

/**
 * Check if element is visible
 */
export async function isVisible(page: Page, selector: string): Promise<boolean> {
  try {
    await page.locator(selector).waitFor({ state: 'visible', timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Fill form field with retry
 */
export async function fillField(page: Page, label: string, value: string) {
  await retryAction(async () => {
    const field = page.getByLabel(label);
    await field.clear();
    await field.fill(value);
    await field.blur();
  });
}

/**
 * Get element text content
 */
export async function getTextContent(page: Page, selector: string): Promise<string> {
  const element = page.locator(selector);
  return (await element.textContent()) || '';
}

/**
 * Wait for all images to load
 */
export async function waitForImagesLoad(page: Page) {
  await page.evaluate(() => {
    return Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete)
        .map(
          (img) =>
            new Promise((resolve) => {
              img.onload = img.onerror = resolve;
            })
        )
    );
  });
}

/**
 * Get local storage item
 */
export async function getLocalStorage(page: Page, key: string): Promise<string | null> {
  return page.evaluate((key) => localStorage.getItem(key), key);
}

/**
 * Set local storage item
 */
export async function setLocalStorage(page: Page, key: string, value: string) {
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, value),
    { key, value }
  );
}

/**
 * Clear local storage
 */
export async function clearLocalStorage(page: Page) {
  await page.evaluate(() => localStorage.clear());
}

/**
 * Get session storage item
 */
export async function getSessionStorage(page: Page, key: string): Promise<string | null> {
  return page.evaluate((key) => sessionStorage.getItem(key), key);
}

/**
 * Hover over element
 */
export async function hover(page: Page, selector: string) {
  await page.locator(selector).hover();
}

/**
 * Scroll element into view
 */
export async function scrollIntoView(page: Page, selector: string) {
  await page.locator(selector).scrollIntoViewIfNeeded();
}

/**
 * Wait for selector to be removed
 */
export async function waitForRemoval(page: Page, selector: string, timeout = 5000) {
  await page.locator(selector).waitFor({ state: 'detached', timeout });
}

/**
 * Press keyboard key
 */
export async function pressKey(page: Page, key: string) {
  await page.keyboard.press(key);
}

/**
 * Type text with delay
 */
export async function typeWithDelay(page: Page, selector: string, text: string, delay = 50) {
  const element = page.locator(selector);
  await element.click();
  await element.pressSequentially(text, { delay });
}
