# E2E Testing Setup - Playwright

## Overview

End-to-end testing infrastructure using Playwright for testing critical user flows in the presentation platform.

**Status:** ✅ Complete and Ready  
**Last Updated:** January 2025

---

## Installation

### Dependencies Installed

```bash
pnpm add -D @playwright/test@latest
```

### Browsers

Install Playwright browsers:

```bash
npx playwright install
```

Install system dependencies (if needed):

```bash
npx playwright install-deps
```

---

## Configuration

### Playwright Config (`playwright.config.ts`)

- **Test Directory:** `./e2e`
- **Base URL:** `http://localhost:3000`
- **Browsers:** Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Retries:** 2 on CI, 0 locally
- **Workers:** 1 on CI, parallel locally
- **Reporters:** HTML, List, JSON

### Web Server

- Automatically starts `pnpm dev` before tests
- Reuses existing server in development
- Timeout: 120 seconds

---

## Project Structure

```
e2e/
├── fixtures/
│   └── page-objects.ts      # Page object models & custom fixtures
├── utils/
│   └── test-helpers.ts      # Helper functions and utilities
├── export.spec.ts           # Export functionality tests
└── presentation-create.spec.ts  # Creation flow tests
```

---

## Page Objects

### PresentationPage

Encapsulates presentation editor interactions:

- `navigateToCreate()` - Navigate to create page
- `navigateToPresentation(id)` - Navigate to specific presentation
- `clickExport()` - Open export dialog
- `selectExportFormat(format)` - Select PDF or PPTX
- `confirmExport()` - Confirm export
- `waitForDownload()` - Wait for file download
- `typeInEditor(text)` - Type in editor
- `waitForSave()` - Wait for autosave
- `selectTheme(name)` - Change theme
- `getSlideCount()` - Get number of slides

### AuthPage

Handles authentication:

- `navigateToSignIn()` - Go to sign in page
- `signIn(email, password)` - Sign in user
- `isSignedIn()` - Check auth status

---

## Test Utilities

### Helper Functions (`test-helpers.ts`)

- `waitForNetworkIdle()` - Wait for network to be idle
- `waitForApiCall()` - Wait for specific API call
- `takeFullPageScreenshot()` - Capture screenshot
- `verifyDownload()` - Verify file download
- `getDownloadBuffer()` - Get downloaded file as buffer
- `mockApiResponse()` - Mock API responses
- `waitForText()` - Wait for text to appear
- `retryAction()` - Retry failed actions
- `isVisible()` - Check element visibility
- `fillField()` - Fill form field with retry
- `getTextContent()` - Get element text
- `waitForImagesLoad()` - Wait for all images
- `getLocalStorage()` - Get localStorage item
- `setLocalStorage()` - Set localStorage item
- `clearLocalStorage()` - Clear localStorage
- `hover()` - Hover over element
- `scrollIntoView()` - Scroll to element
- `pressKey()` - Press keyboard key
- `typeWithDelay()` - Type with delay between keys

---

## Running Tests

### Run All Tests

```bash
pnpm test:e2e
```

### Run with UI Mode (Recommended for Development)

```bash
pnpm test:e2e:ui
```

### Run in Headed Mode (See Browser)

```bash
pnpm test:e2e:headed
```

### Debug Mode (Step Through Tests)

```bash
pnpm test:e2e:debug
```

### View Test Report

```bash
pnpm test:e2e:report
```

### Run Specific Test File

```bash
npx playwright test export.spec.ts
```

### Run Specific Test

```bash
npx playwright test -g "should export presentation as PDF"
```

### Run on Specific Browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

---

## Test Suites

### 1. Export Flow Tests (`export.spec.ts`)

**Coverage:**

- ✅ PDF export with default theme
- ✅ PowerPoint export
- ✅ Error handling
- ✅ Format switching
- ✅ Loading states
- ✅ Button visibility

**Test Count:** 6 tests

### 2. Presentation Creation Tests (`presentation-create.spec.ts`)

**Coverage:**

- ✅ Page loading
- ✅ Input area presence
- ✅ Text entry
- ✅ Generate button
- ✅ Navigation
- ✅ Responsive design (mobile/tablet)

**Test Count:** 9 tests

---

## Environment Variables

### Required for Full Testing

```bash
# Test user credentials
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword123

# Base URL (optional, defaults to localhost:3000)
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

### Setting Environment Variables

Create `.env.test` file:

```bash
TEST_USER_EMAIL=your-test-email@example.com
TEST_USER_PASSWORD=your-test-password
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install pnpm
        uses: pnpm/action-setup@v2

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: pnpm test:e2e
        env:
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}

      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Best Practices

### 1. Test Isolation

- Each test should be independent
- Use `test.beforeEach()` for setup
- Clean up after tests if needed

### 2. Waiting Strategies

✅ **Good:**

```typescript
await page.waitForLoadState("networkidle");
await expect(element).toBeVisible();
```

❌ **Bad:**

```typescript
await page.waitForTimeout(5000); // Flaky
```

### 3. Selectors

**Priority:**

1. Role selectors: `page.getByRole('button', { name: 'Export' })`
2. Text selectors: `page.getByText('Export')`
3. Test IDs: `page.getByTestId('export-button')`
4. CSS selectors: `page.locator('.export-btn')` (last resort)

### 4. Assertions

```typescript
// Explicit expectations
await expect(element).toBeVisible();
await expect(element).toHaveText("Expected Text");
await expect(element).toHaveClass(/active/);

// With timeout
await expect(element).toBeVisible({ timeout: 10000 });
```

### 5. Page Objects

- Encapsulate page interactions
- Keep tests readable
- Reuse common actions

---

## Debugging

### Visual Debugging

```bash
# UI Mode - Best for development
pnpm test:e2e:ui

# Headed mode - See browser
pnpm test:e2e:headed

# Debug mode - Step through
pnpm test:e2e:debug
```

### Screenshots on Failure

Automatically captured in `test-results/` directory.

### Videos on Failure

Automatically recorded and saved to `test-results/`.

### Traces

View traces in Playwright UI:

```bash
npx playwright show-trace trace.zip
```

---

## Performance

### Test Execution Times

- **Export tests:** ~30-60 seconds
- **Creation tests:** ~20-40 seconds
- **Full suite (parallel):** ~2-3 minutes

### Optimization Tips

1. Run tests in parallel (default)
2. Use `test.skip()` for slow tests in development
3. Use page object models to reduce duplication
4. Mock external API calls when possible

---

## Known Issues

### 1. Authentication Required

Some tests require valid user credentials:

```typescript
test.skip(!process.env.TEST_USER_EMAIL, "Authentication required");
```

### 2. Slow Generation

Presentation generation tests may timeout:

- Increase timeout: `{ timeout: 60000 }`
- Or skip in CI: `test.skip(process.env.CI)`

### 3. Flaky Network Tests

Use retry logic:

```typescript
await retryAction(
  async () => {
    // Your action here
  },
  3,
  1000,
);
```

---

## Extending Tests

### Adding New Test File

1. Create file in `e2e/` directory
2. Name with `.spec.ts` extension
3. Import fixtures: `import { test, expect } from './fixtures/page-objects'`
4. Write tests using `test.describe()` and `test()`

### Adding New Page Object

1. Open `e2e/fixtures/page-objects.ts`
2. Create new class extending base functionality
3. Add to custom fixtures
4. Export for use in tests

### Adding New Helper

1. Open `e2e/utils/test-helpers.ts`
2. Add new exported function
3. Document with JSDoc comments
4. Import in test files

---

## Coverage Goals

### Current Coverage

- ✅ Export flows (PDF & PPTX)
- ✅ Presentation creation
- ✅ Basic navigation
- ✅ Responsive design

### Planned Coverage

- ⏳ Authentication flows
- ⏳ Presentation editing
- ⏳ Theme switching
- ⏳ Sharing functionality
- ⏳ Presentation mode
- ⏳ Slide operations (add/delete/reorder)
- ⏳ Image upload
- ⏳ Chart creation
- ⏳ Collaboration features

---

## Resources

### Documentation

- [Playwright Docs](https://playwright.dev/docs/intro)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)

### Learning

- [Playwright University](https://playwright.dev/docs/intro)
- [Examples](https://github.com/microsoft/playwright/tree/main/examples)
- [Community Recipes](https://playwright.dev/docs/examples)

---

## Troubleshooting

### Browsers Not Installing

```bash
# Install with deps
npx playwright install --with-deps

# Specific browser
npx playwright install chromium
```

### Port Already in Use

Change port in `playwright.config.ts`:

```typescript
baseURL: "http://localhost:3001";
```

And update webServer command:

```typescript
command: "PORT=3001 pnpm dev";
```

### Tests Timing Out

Increase timeout in test:

```typescript
test("slow test", async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // ...
});
```

---

## Maintenance

### Regular Tasks

1. Update Playwright: `pnpm update @playwright/test`
2. Update browsers: `npx playwright install`
3. Review flaky tests weekly
4. Update page objects when UI changes
5. Add tests for new features

### Test Health Metrics

Monitor:

- Pass rate (target: >95%)
- Flaky tests (target: <5%)
- Average execution time
- Coverage percentage

---

**Status:** Production Ready ✅  
**Maintainer:** Development Team  
**Last Review:** January 2025
