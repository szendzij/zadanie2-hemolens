import { faker } from '@faker-js/faker'

export interface EmailData {
  subject: string
  body: string
  uniqueId: string
}

export function generateTestEmailData(): EmailData {
  const uniqueId = faker.string.alphanumeric(8)
  const words = faker.lorem.words(3)

  return {
    uniqueId,
    subject: `[E2E Test] ${words} - ${uniqueId}`,
    body: `Automated test email sent by Playwright.\n\nRun ID: ${uniqueId}\nSent at: ${new Date().toISOString()}`,
  }
}
