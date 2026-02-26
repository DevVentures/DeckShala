import { test as base, expect, type Page } from '@playwright/test';

/**
 * Custom fixture for authenticated user sessions
 */
export type AuthenticatedUser = {
  email: string;
  password: string;
  name: string;
};

/**
 * Page object model for presentation editor
 */
export class PresentationPage {
  constructor(public readonly page: Page) { }

  // Locators
  get createButton() {
    return this.page.getByRole('button', { name: /create/i });
  }

  get exportButton() {
    return this.page.getByRole('button', { name: /export/i });
  }

  get saveStatus() {
    return this.page.getByText(/saved|saving/i);
  }

  get presentButton() {
    return this.page.getByRole('button', { name: /present/i });
  }

  get shareButton() {
    return this.page.getByRole('button', { name: /share/i });
  }

  get editor() {
    return this.page.locator('[data-testid="presentation-editor"]').or(
      this.page.locator('[contenteditable="true"]')
    );
  }

  get slideContainer() {
    return this.page.locator('[data-testid="slide-container"]');
  }

  get themeSelector() {
    return this.page.locator('[data-testid="theme-selector"]');
  }

  // Actions
  async navigateToCreate() {
    await this.page.goto('/presentation/create');
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToPresentation(id: string) {
    await this.page.goto(`/presentation/${id}`);
    await this.page.waitForLoadState('networkidle');
  }

  async clickExport() {
    await this.exportButton.click();
  }

  async selectExportFormat(format: 'pptx' | 'pdf') {
    await this.page.getByRole('button', { name: new RegExp(format, 'i') }).click();
  }

  async confirmExport() {
    const exportButton = this.page.getByRole('button', { name: /export as/i });
    await exportButton.click();
  }

  async waitForDownload() {
    return this.page.waitForEvent('download', { timeout: 30000 });
  }

  async typeInEditor(text: string) {
    await this.editor.first().click();
    await this.editor.first().fill(text);
  }

  async waitForSave() {
    await expect(this.saveStatus).toContainText(/saved/i, { timeout: 10000 });
  }

  async selectTheme(themeName: string) {
    await this.themeSelector.click();
    await this.page.getByText(themeName).click();
  }

  async getSlideCount() {
    return this.slideContainer.count();
  }
}

/**
 * Page object model for authentication
 */
export class AuthPage {
  constructor(public readonly page: Page) { }

  // Locators
  get emailInput() {
    return this.page.getByLabel(/email/i);
  }

  get passwordInput() {
    return this.page.getByLabel(/password/i);
  }

  get signInButton() {
    return this.page.getByRole('button', { name: /sign in/i });
  }

  get signUpButton() {
    return this.page.getByRole('button', { name: /sign up/i });
  }

  // Actions
  async navigateToSignIn() {
    await this.page.goto('/auth/signin');
  }

  async signIn(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
    await this.page.waitForURL(/\/presentation/, { timeout: 10000 });
  }

  async isSignedIn() {
    try {
      // Check for user avatar or profile indicator
      await this.page.getByTestId('user-avatar').waitFor({ timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Custom test fixture with page objects
 */
type CustomFixtures = {
  presentationPage: PresentationPage;
  authPage: AuthPage;
  authenticatedPage: Page;
};

export const test = base.extend<CustomFixtures>({
  presentationPage: async ({ page }, use) => {
    const presentationPage = new PresentationPage(page);
    await use(presentationPage);
  },

  authPage: async ({ page }, use) => {
    const authPage = new AuthPage(page);
    await use(authPage);
  },

  authenticatedPage: async ({ page }, use) => {
    // This fixture automatically signs in before each test
    const authPage = new AuthPage(page);

    // Check if already signed in
    const isSignedIn = await authPage.isSignedIn();

    if (!isSignedIn) {
      // Use test credentials from environment or defaults
      const email = process.env.TEST_USER_EMAIL || 'test@example.com';
      const password = process.env.TEST_USER_PASSWORD || 'testpassword123';

      await authPage.navigateToSignIn();
      await authPage.signIn(email, password);
    }

    await use(page);
  },
});

export { expect };
