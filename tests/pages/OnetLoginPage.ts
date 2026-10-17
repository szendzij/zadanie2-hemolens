import { Locator, Page } from '@playwright/test'

export class OnetLoginPage {
  readonly emailInput: Locator
  readonly nextButton: Locator
  readonly passwordInput: Locator
  readonly loginSubmitButton: Locator
  readonly cookieAcceptButton: Locator
  readonly trustedDeviceSkipButton: Locator
  readonly accountNotFoundMsg: Locator

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
        await this.page.waitForTimeout(500)
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
        await this.page.waitForTimeout(1000)
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

    if (
      await this.trustedDeviceSkipButton
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await this.trustedDeviceSkipButton.first().click()
    }

    await this.page.waitForURL(
      (url) => url.hostname.includes('poczta.onet.pl'),
      {
        timeout: 30_000,
      },
    )
  }

  async isLoggedOut(): Promise<boolean> {
    await this.page.waitForTimeout(2000)
    const currentUrl = this.page.url()
    const pageText = await this.page.locator('body').innerText()
    const isOnetPortal = currentUrl.includes('onet.pl')
    const hasLoginPrompt =
      pageText.includes('LOGOWANIE') ||
      pageText.includes('Zaloguj się') ||
      pageText.includes('Adres email') ||
      currentUrl.includes('signin')
    return isOnetPortal && hasLoginPrompt
  }
}
