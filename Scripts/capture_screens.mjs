import { chromium } from '@playwright/test'
import path from 'node:path'
import { mkdirSync } from 'node:fs'

async function main() {
  mkdirSync('Docs/Screenshots/M0', { recursive: true })
  mkdirSync('Docs/Screenshots/M1', { recursive: true })
  mkdirSync('Docs/Screenshots/M2', { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1728, height: 1080 } })
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  await page.screenshot({ path: 'Docs/Screenshots/M0/00_empty_window.png' })

  // move a bit
  await page.keyboard.down('KeyW')
  await page.waitForTimeout(1500)
  await page.keyboard.up('KeyW')
  await page.screenshot({ path: 'Docs/Screenshots/M1/01_first_steps.png' })

  await page.keyboard.press('Tab')
  await page.waitForTimeout(200)
  await page.keyboard.press('KeyT')
  await page.waitForTimeout(4000)
  await page.screenshot({ path: 'Docs/Screenshots/M2/01_orc_and_boars.png' })
  await page.screenshot({ path: 'Docs/Screenshots/M3/01_combat.png' }).catch(() => {})
  mkdirSync('Docs/Screenshots/M3', { recursive: true })
  await page.screenshot({ path: 'Docs/Screenshots/M3/01_combat.png' })

  await browser.close()
  console.log('screenshots written')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
