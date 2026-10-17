import { test as base, expect } from '@playwright/test'
import { OnetLoginPage } from '../pages/OnetLoginPage'
import { OnetMailboxPage } from '../pages/OnetMailboxPage'

export interface Credentials {
  email: string
  password: string
}

export const test = base.extend<{
  loginPage: OnetLoginPage
  mailboxPage: OnetMailboxPage
  credentials: Credentials
}>({
  credentials: async ({}, use) => {
    const email = process.env.ONET_EMAIL
    const password = process.env.ONET_PASSWORD

    if (!email || !password) {
      throw new Error(
        'Brak danych logowania! Skonfiguruj plik .env (na podstawie .env.example) ' +
          'lub ustaw zmienne środowiskowe ONET_EMAIL i ONET_PASSWORD przed uruchomieniem testów.',
      )
    }

    await use({ email, password })
  },

  loginPage: async ({ page }, use) => {
    await use(new OnetLoginPage(page))
  },

  mailboxPage: async ({ page }, use) => {
    await use(new OnetMailboxPage(page))
  },
})

export { expect } from '@playwright/test'
