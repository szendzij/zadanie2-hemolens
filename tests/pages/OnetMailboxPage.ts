import { Locator, Page } from '@playwright/test'

export interface ComposeOptions {
  to: string
  subject: string
  body: string
}

export class OnetMailboxPage {
  readonly composeButton: Locator
  readonly recipientInput: Locator
  readonly subjectInput: Locator
  readonly bodyEditor: Locator
  readonly sendButton: Locator
  readonly closeOverlayButton: Locator
  readonly userMenuHeader: Locator
  readonly logoutButton: Locator
  readonly inboxFolderButton: Locator

  constructor(private readonly page: Page) {
    this.composeButton = page.getByRole('button', { name: 'Napisz wiadomość' })
    this.recipientInput = page
      .getByPlaceholder(/do:|odbiorca/i)
      .or(page.locator('input[type="email"]'))
      .first()
    this.subjectInput = page
      .getByPlaceholder(/temat/i)
      .or(page.locator('input[name="subject"]'))
      .or(page.getByLabel(/temat/i))
      .first()
    this.bodyEditor = page
      .locator(
        '.mail-composer [contenteditable="true"], [role="textbox"][contenteditable="true"]',
      )
      .or(page.locator('[contenteditable="true"]'))
      .first()
    this.sendButton = page
      .getByRole('button', { name: 'Wyślij', exact: true })
      .or(page.locator('button:has-text("Wyślij")').first())
    this.closeOverlayButton = page.locator(
      'button:has-text("✕"), [aria-label*="zamknij" i], [class*="close"]',
    )
    this.userMenuHeader = page.locator('header').getByText(/@/).first()
    this.logoutButton = page
      .locator('button, a, span')
      .filter({ hasText: /^Wyloguj$/i })
      .first()
    this.inboxFolderButton = page
      .locator('.side-menu-item__link, [role="button"]')
      .filter({ hasText: 'Odebrane' })
      .first()
  }

  async dismissOverlays() {
    try {
      const isVisible = await this.closeOverlayButton
        .first()
        .isVisible({ timeout: 2500 })
      if (isVisible) {
        await this.closeOverlayButton.first().click()
        await this.closeOverlayButton
          .first()
          .waitFor({ state: 'hidden', timeout: 3000 })
          .catch(() => {})
      }
    } catch {}
  }

  async composeAndSend({ to, subject, body }: ComposeOptions) {
    await this.composeButton.click()
    await this.recipientInput.waitFor({ state: 'visible', timeout: 10_000 })
    await this.recipientInput.fill(to)
    await this.recipientInput.press('Enter')
    await this.subjectInput.fill(subject)
    await this.bodyEditor.click()
    await this.bodyEditor.fill(body)
    await this.sendButton.click()
    await this.bodyEditor.waitFor({ state: 'hidden', timeout: 15_000 })
  }

  async waitForEmail(subject: string, timeoutMs = 30_000): Promise<Locator> {
    const emailItem = this.page.getByText(subject).first()
    try {
      await emailItem.waitFor({ state: 'visible', timeout: 10_000 })
    } catch {
      if (await this.inboxFolderButton.isVisible().catch(() => false)) {
        await this.inboxFolderButton.click()
      }
      await emailItem.waitFor({ state: 'visible', timeout: timeoutMs - 10_000 })
    }
    return emailItem
  }

  async logout() {
    if (
      await this.userMenuHeader.isVisible({ timeout: 5000 }).catch(() => false)
    ) {
      await this.userMenuHeader.click()
    }
    await this.logoutButton.waitFor({ state: 'visible', timeout: 10_000 })
    await this.logoutButton.click()

    await this.page.waitForURL(
      (url) =>
        !url.pathname.startsWith('/poczta') ||
        url.hostname !== 'poczta.onet.pl',
      {
        timeout: 20_000,
      },
    )
  }
}
