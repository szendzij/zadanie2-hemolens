import { test, expect } from '../fixtures/base'
import { generateTestEmailData } from '../helpers/dataGenerator'

test.describe('Email Onet E2E Webmail Flow', () => {
  test('Full cycle: login, send email to yourself, check delivery and logout', async ({ loginPage, mailboxPage, credentials }) => {
    await loginPage.open()
    await loginPage.acceptCookies()
    await loginPage.login(credentials.email, credentials.password)
    const { subject, body } = generateTestEmailData()
    await mailboxPage.dismissOverlays()
    await mailboxPage.composeAndSend({
      to: credentials.email,
      subject,
      body,
    })
    const receivedItem = await mailboxPage.waitForEmail(subject)
    await expect(receivedItem).toBeVisible()
    await mailboxPage.logout()
    expect(await loginPage.isLoggedOut()).toBe(true)
  })
})
