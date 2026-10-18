import { expect, Locator, Page } from '@playwright/test'

export class OnetLoginPage {
  readonly emailInput: Locator
  readonly nextButton: Locator
  readonly passwordInput: Locator
  readonly loginSubmitButton: Locator
  readonly cookieAcceptButton: Locator
  readonly trustedDeviceSkipButton: Locator
  readonly accountNotFoundMsg: Locator
  readonly loginHeading: Locator
  readonly accountLoginButton: Locator

  constructor(private readonly page: Page) {
    this.emailInput = page.locator('input[name="email"], input#email')
    this.nextButton = page.getByRole('button', { name: /dalej|next/i })
    this.passwordInput = page.locator(
      'input[type="password"], input[name="password"]',
    )
    this.loginSubmitButton = page
      .getByRole('button', { name: /zaloguj|sign in|log in|dalej|next/i })
      .first()
    this.cookieAcceptButton = page.locator(
      'button:has-text("Przejdź do serwisu"), button:has-text("Zaakceptuj"), button:has-text("Zgadzam się"), button:has-text("Accept"), .cmp-intro_acceptAll, [class*="cmp"] button',
    )
    this.trustedDeviceSkipButton = page
      .getByRole('button', {
        name: /przypomnij później|remind later|pomiń|skip/i,
      })
      .or(page.getByText(/pomiń|skip/i))
    this.accountNotFoundMsg = page.locator(
      'text=Konto nie istnieje, text="Account does not exist"',
    )
    this.loginHeading = page
      .getByRole('heading', { name: /zaloguj|logowanie/i })
      .or(page.getByText(/zaloguj się do poczty|adres e-mail/i))
      .first()
    this.accountLoginButton = page
      .locator('button:has-text("Logowanie"), a:has-text("Logowanie")')
      .or(
        page
          .getByRole('button', { name: /konto/i })
          .filter({ hasText: /logowanie/i }),
      )
      .first()
  }

  async open() {
    await this.page.goto('https://poczta.onet.pl', {
      waitUntil: 'domcontentloaded',
    })
    await this.emailInput.waitFor({ state: 'visible', timeout: 30_000 })
  }

  async acceptCookies() {
    try {
      const isVisible = await this.cookieAcceptButton
        .first()
        .isVisible({ timeout: 2500 })
      if (isVisible) {
        await this.cookieAcceptButton.first().click()
        await this.cookieAcceptButton
          .first()
          .waitFor({ state: 'hidden', timeout: 5000 })
          .catch(() => {})
      }
    } catch {}
  }

  async handleTrustedDeviceScreen() {
    try {
      const isVisible = await this.trustedDeviceSkipButton
        .first()
        .isVisible({ timeout: 6000 })
      if (isVisible) {
        await this.trustedDeviceSkipButton.first().click()
        await this.trustedDeviceSkipButton
          .first()
          .waitFor({ state: 'hidden', timeout: 5000 })
          .catch(() => {})
      }
    } catch {}
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.nextButton.click()
    await Promise.race([
      this.passwordInput.waitFor({ state: 'visible', timeout: 10_000 }),
      this.accountNotFoundMsg
        .waitFor({ state: 'visible', timeout: 10_000 })
        .catch(() => {}),
    ])

    if (await this.accountNotFoundMsg.isVisible().catch(() => false)) {
      throw new Error(
        `Błąd logowania: konto "${email}" nie istnieje w usłudze Onet! ` +
          `Upewnij się, że adres e-mail i domena (np. @op.pl vs @onet.pl) są poprawne.`,
      )
    }
    await this.passwordInput.fill(password)
    await this.loginSubmitButton.click()
    await Promise.race([
      this.page
        .waitForURL((url) => url.hostname.includes('poczta.onet.pl'), {
          timeout: 10_000,
        })
        .catch(() => {}),
      this.trustedDeviceSkipButton
        .first()
        .waitFor({ state: 'visible', timeout: 8_000 })
        .catch(() => {}),
    ])

    await this.handleTrustedDeviceScreen()

    await this.page.waitForURL(
      (url) => url.hostname.includes('poczta.onet.pl'),
      {
        timeout: 30_000,
      },
    )
  }

  async expectLoggedOut() {
    await expect(this.page).toHaveURL(
      /^https?:\/\/(www\.|poczta\.|konto\.)?onet\.pl([/?].*)?$/i,
      {
        timeout: 15_000,
      },
    )
    await expect(
      this.emailInput.or(this.loginHeading).or(this.accountLoginButton).first(),
    ).toBeVisible({
      timeout: 15_000,
    })
  }
}
