# Plan Refaktoringu Testów Playwright (Punkty 1, 2, 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wyeliminowanie twardych uśpień (`waitForTimeout`), zastąpienie kruchych selektorów indeksowych semantycznymi/scoped locatorami oraz wdrożenie Web-First Auto-Retrying Assertions zgodnie ze standardami Senior QA w Playwright.

**Architecture:** 
1. Usunięcie wszystkich sztucznych opóźnień `page.waitForTimeout()` na rzecz asynchronicznych oczekiwań opartych o stan DOM (`waitFor({ state: 'hidden' | 'visible' })`) oraz wbudowany auto-waiting Playwrighta.
2. Zastąpienie selektorów `.last()` i generycznych tagów semantycznymi locatorami (`getByPlaceholder`, `getByRole`, scoped locators) oraz aktywne wykorzystanie `inboxFolderButton` do niezawodnego odświeżania skrzynki.
3. Zastąpienie synchronicznych asercji boolean (`expect(boolean).toBe(true)`) natywnymi asercjami Playwright (`expect(locator).toBeVisible()`, `expect(page).toHaveURL()`) zapewniającymi automatyczne ponawianie (auto-retry poll).

**Tech Stack:** `@playwright/test` (^1.64.1), `TypeScript` (^7.0.2), POM (Page Object Model).

**Spec:** Audyt techniczny w sesji `/grillme` (punkty 1, 2, 3).

## Global Constraints
- Żadnych wywołań `page.waitForTimeout()` w całym kodzie testowym i POM.
- Zero błędów typowania (`npm.cmd run typecheck`).
- Kod sformatowany zgodnie z Prettier (`npm.cmd run format:check`).
- Brak martwego kodu (nieużywane lokatory i metody usunięte lub zintegrowane).
- Zachowanie kompatybilności wstecznej interfejsów fixture'ów (`tests/fixtures/base.ts`).

## Review Focus
1. **Zamykanie modal/overlayów:** Kliknięcie `cookieAcceptButton` lub `closeOverlayButton` musi oczekiwać na ukrycie elementu, a nie pauzę czasową.
2. **Formularz nowej wiadomości:** Wprowadzanie odbiorcy i tematu nie może bazować na indeksie `.last()`, lecz na semantycznych atrybutach formularza.
3. **Odświeżanie skrzynki:** Oczekiwanie na nową wiadomość (`waitForEmail`) powinno obsłużyć sytuację, gdy Onet nie odświeża listy automatycznie (użycie `inboxFolderButton` jako fallback refresh).
4. **Weryfikacja wylogowania:** Test musi raportować precyzyjny stan asercji z auto-retry w Trace Viewerze, zamiast błędu `expected true, received false`.
5. **Odporność na timeouty CI:** Wszystkie asercje webowe muszą respektować timeout zdefiniowany globalnie w konfiguracji Playwright (15s).

---

### Task 1: Eliminacja `waitForTimeout` i refaktoring cookie / trusted device w `OnetLoginPage.ts`

**Files:**
- Modify: `tests/pages/OnetLoginPage.ts:41-64`
- Test: `tests/spec/onet-mail.spec.ts`

**Interfaces:**
- Produces: 
  - `acceptCookies(): Promise<void>` (czeka na `state: 'hidden'` banera cookie zamiast `waitForTimeout(500)`)
  - `handleTrustedDeviceScreen(): Promise<void>` (czeka na zniknięcie promptu zamiast `waitForTimeout(1000)`)

- [ ] **Step 1: Zastąpienie `waitForTimeout` w `acceptCookies()`**
W `OnetLoginPage.ts` w metodzie `acceptCookies` zastąp `await this.page.waitForTimeout(500)` przez:
```typescript
await this.cookieAcceptButton.first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
```

- [ ] **Step 2: Zastąpienie `waitForTimeout` w `handleTrustedDeviceScreen()`**
W `OnetLoginPage.ts` w metodzie `handleTrustedDeviceScreen` zastąp `await this.page.waitForTimeout(1000)` przez oczekiwanie na odłączenie/ukrycie elementu:
```typescript
await this.trustedDeviceSkipButton.first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
```

- [ ] **Step 3: Usunięcie duplikacji w `login()`**
W metodzie `login()` w `OnetLoginPage.ts` zastąp powtórzony blok obsługi `trustedDeviceSkipButton` wywołaniem `await this.handleTrustedDeviceScreen()`.

- [ ] **Step 4: Weryfikacja statyczna**
Run: `npm.cmd run typecheck`  
Expected: PASS (exit code 0)

- [ ] **Step 5: Commit**
```bash
git add tests/pages/OnetLoginPage.ts
git commit -m "refactor(login): replace waitForTimeout with locator state waits and deduplicate trusted device handling"
```

---

### Task 2: Refaktoring selektorów, usunięcie martwego kodu i `waitForTimeout` w `OnetMailboxPage.ts`

**Files:**
- Modify: `tests/pages/OnetMailboxPage.ts:20-92`
- Test: `tests/spec/onet-mail.spec.ts`

**Interfaces:**
- Produces:
  - `recipientInput: Locator` (dostępna po roli lub placeholderze)
  - `subjectInput: Locator` (zastąpienie `input[type="text"].last()` przez `getByPlaceholder(/temat/i).or(...)`)
  - `bodyEditor: Locator` (scoped do edytora wiadomości)
  - `inboxFolderButton: Locator` (użyty w logice `waitForEmail` jako refresh)
  - `dismissOverlays(): Promise<void>` (czeka na `state: 'hidden'`)
  - `composeAndSend(options: ComposeOptions): Promise<void>` (bez `waitForTimeout(500)`)
  - `logout(): Promise<void>` (bez zbędnego `waitForTimeout(500)`)

- [ ] **Step 1: Poprawa selektorów w konstruktorze `OnetMailboxPage`**
Zastąp kruche selektory:
```typescript
// Temat wiadomości: semantyczny placeholder i atrybuty zamiast .last()
this.subjectInput = page
  .getByPlaceholder(/temat/i)
  .or(page.locator('input[name="subject"]'))
  .or(page.getByLabel(/temat/i))
  .first()

// Odbiorca: semantyczny placeholder i rola zamiast ogólnego input[type="email"]
this.recipientInput = page
  .getByPlaceholder(/do:|odbiorca/i)
  .or(page.locator('input[type="email"]'))
  .first()

// Treść: dedykowany kontener edytora wiadomości
this.bodyEditor = page
  .locator('.mail-composer [contenteditable="true"], [role="textbox"][contenteditable="true"]')
  .or(page.locator('[contenteditable="true"]'))
  .first()
```

- [ ] **Step 2: Usunięcie `waitForTimeout` z `dismissOverlays()`, `composeAndSend()` i `logout()`**
- W `dismissOverlays()`: zastąp `waitForTimeout(500)` przez `await this.closeOverlayButton.first().waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {})`.
- W `composeAndSend()`: usuń `await this.page.waitForTimeout(500)` po `press('Enter')` (Playwright auto-waits przed wpisaniem tematu w `subjectInput.fill(subject)`).
- W `logout()`: usuń `await this.page.waitForTimeout(500)` po kliknięciu nagłówka profilu (wywołanie `await this.logoutButton.waitFor({ state: 'visible' })` gwarantuje auto-waiting).

- [ ] **Step 3: Aktywacja `inboxFolderButton` w `waitForEmail()`**
Wykorzystaj zdefiniowany wcześniej przycisk `inboxFolderButton` do ewentualnego odświeżenia widoku skrzynki, jeśli wiadomość nie pojawi się natychmiast:
```typescript
async waitForEmail(subject: string, timeoutMs = 30_000): Promise<Locator> {
  const emailItem = this.page.getByText(subject).first()
  try {
    await emailItem.waitFor({ state: 'visible', timeout: 10_000 })
  } catch {
    // Jeśli wiadomość nie przyszła natychmiast, kliknij folder Odebrane, aby wymusić odświeżenie
    if (await this.inboxFolderButton.isVisible().catch(() => false)) {
      await this.inboxFolderButton.click()
    }
    await emailItem.waitFor({ state: 'visible', timeout: timeoutMs - 10_000 })
  }
  return emailItem
}
```

- [ ] **Step 4: Weryfikacja statyczna**
Run: `npm.cmd run typecheck`  
Expected: PASS (exit code 0)

- [ ] **Step 5: Commit**
```bash
git add tests/pages/OnetMailboxPage.ts
git commit -m "refactor(mailbox): replace fragile locators, remove waitForTimeout and integrate inboxFolderButton"
```

---

### Task 3: Przepisanie weryfikacji wylogowania na Web-First Assertions

**Files:**
- Modify: `tests/pages/OnetLoginPage.ts:112-124`
- Modify: `tests/spec/onet-mail.spec.ts:18-20`
- Test: `tests/spec/onet-mail.spec.ts`

**Interfaces:**
- Produces:
  - `OnetLoginPage.expectLoggedOut(): Promise<void>` (używa `expect(locator).toBeVisible()` oraz `expect(page).toHaveURL()`)
  - Usunięcie metody boolean `isLoggedOut(): Promise<boolean>` oraz jej twardego `waitForTimeout(2000)`

- [ ] **Step 1: Dodanie metody `expectLoggedOut()` w `OnetLoginPage` i usunięcie `isLoggedOut()`**
W `OnetLoginPage.ts`:
Dodaj lokator login promptu w konstruktorze:
```typescript
readonly loginHeading: Locator
// w konstruktorze:
this.loginHeading = page
  .getByRole('heading', { name: /zaloguj|logowanie/i })
  .or(page.getByText(/zaloguj się do poczty|adres e-mail/i))
  .first()
```
Zastąp metodę `isLoggedOut` asercją web-first:
```typescript
async expectLoggedOut() {
  await expect(this.page).toHaveURL(/.*(poczta\.onet\.pl|onet\.pl.*login|konto\.onet\.pl).*/, {
    timeout: 15_000,
  })
  await expect(this.emailInput.or(this.loginHeading).first()).toBeVisible({
    timeout: 15_000,
  })
}
```
*Uwaga:* Import `expect` z `@playwright/test` w `OnetLoginPage.ts`.

- [ ] **Step 2: Aktualizacja asercji w `tests/spec/onet-mail.spec.ts`**
W `onet-mail.spec.ts`:
Zastąp:
```typescript
await mailboxPage.logout()
expect(await loginPage.isLoggedOut()).toBe(true)
```
Przez:
```typescript
await mailboxPage.logout()
await loginPage.expectLoggedOut()
```

- [ ] **Step 3: Weryfikacja statyczna i formatowanie**
Run: `npm.cmd run typecheck`  
Expected: PASS  
Run: `npm.cmd run format`  
Expected: Sformatowany kod zgodny z Prettier

- [ ] **Step 4: Commit**
```bash
git add tests/pages/OnetLoginPage.ts tests/spec/onet-mail.spec.ts
git commit -m "refactor(assertions): replace boolean isLoggedOut check with Playwright web-first retrying assertions"
```
