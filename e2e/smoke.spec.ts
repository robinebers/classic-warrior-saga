import { test, expect } from '@playwright/test'

test('CWS boots and shows HUD after New Character', async ({ page }) => {
  await page.goto('http://localhost:5173')
  await expect(page.getByTestId('title-screen')).toBeVisible()
  await page.getByTestId('btn-new').click()
  await expect(page.getByTestId('game-root')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('player-frame')).toBeVisible()
  await expect(page.getByTestId('action-bar')).toBeVisible()
  await expect(page.getByTestId('xp-bar')).toBeVisible()
  await expect(page.getByTestId('player-level')).toHaveText('1')

  await page.keyboard.press('Tab')
  await page.keyboard.press('KeyT')
  await page.waitForTimeout(2000)
  const chat = page.getByTestId('chat-log')
  await expect(chat).toContainText(/Auto Attack|Aggros|Hits|Welcome/i)

  await page.screenshot({ path: 'Docs/Screenshots/M9-e2e/01_boot.png' })
})
