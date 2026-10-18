import { test, expect } from '../fixtures/base'
import { generateTestEmailData } from '../helpers/dataGenerator'

test.describe('Email Onet E2E Webmail Flow', () => {
  test('Full cycle: login, send email to yourself, check delivery and logout', async ({ loginPage, mailboxPage, credentials }) => {
    await loginPage.open()
    await loginPage.acceptCookies()
    await loginPage.login(credentials.email, credentials.password)
    await mailboxPage.dismissOverlays()

    await expect(mailboxPage.composeButton).toBeVisible()
    await expect(mailboxPage.inboxFolderButton).toBeVisible()

    const { subject, body } = generateTestEmailData()
    await mailboxPage.openCompose()

    await expect(mailboxPage.recipientInput).toBeVisible()
    await expect(mailboxPage.subjectInput).toBeVisible()
    await expect(mailboxPage.bodyEditor).toBeVisible()

    await mailboxPage.sendMail({
      to: credentials.email,
      subject,
      body,
    })

    const receivedItem = await mailboxPage.waitForEmail(subject)
    await expect(receivedItem).toBeVisible()
    await mailboxPage.logout()
    await loginPage.expectLoggedOut()
  })
})
