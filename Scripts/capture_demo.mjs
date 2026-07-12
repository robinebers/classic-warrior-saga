import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve('Docs')
mkdirSync(`${ROOT}/Screenshots/M5`, { recursive: true })
mkdirSync(`${ROOT}/Screenshots/M7`, { recursive: true })
mkdirSync(`${ROOT}/Screenshots/M8`, { recursive: true })
mkdirSync(`${ROOT}/Screenshots/M9-e2e`, { recursive: true })
mkdirSync(`${ROOT}/Recordings`, { recursive: true })
mkdirSync('/opt/cursor/artifacts/screenshots', { recursive: true })

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader'],
  })
  const context = await browser.newContext({
    viewport: { width: 1728, height: 1080 },
    recordVideo: { dir: 'Docs/Recordings', size: { width: 1728, height: 1080 } },
  })
  const page = await context.newPage()
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({ path: 'Docs/Screenshots/M0/01_title.png', fullPage: true })

  await page.getByTestId('btn-new').click()
  await page.waitForSelector('[data-testid="game-root"]', { timeout: 15000 })
  await page.waitForTimeout(2000)
  await page.screenshot({ path: 'Docs/Screenshots/M2/03_world_loaded.png' })

  // Move + combat
  await page.keyboard.down('KeyW')
  await page.waitForTimeout(1200)
  await page.keyboard.up('KeyW')
  await page.keyboard.press('Tab')
  await page.waitForTimeout(200)
  await page.keyboard.press('KeyT')
  await page.waitForTimeout(3500)
  await page.screenshot({ path: 'Docs/Screenshots/M3/02_combat_live.png' })

  // Quest log
  await page.keyboard.press('KeyL')
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'Docs/Screenshots/M7/01_quest_log.png' })
  await page.keyboard.press('Escape')

  // Trainer
  await page.keyboard.press('KeyK')
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'Docs/Screenshots/M5/01_trainer.png' })
  await page.keyboard.press('Escape')

  // Talents at L10 via console
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('cws-console', { detail: { cmd: 'setlevel', args: ['10'] } }))
  })
  await page.waitForTimeout(400)
  await page.keyboard.press('KeyN')
  await page.waitForTimeout(600)
  await page.screenshot({ path: 'Docs/Screenshots/M8/01_talents.png' })
  await page.keyboard.press('Escape')

  // Ding demo
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('cws-console', { detail: { cmd: 'setlevel', args: ['3'] } }))
  })
  await page.waitForTimeout(200)
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('cws-console', { detail: { cmd: 'addxp', args: ['1400'] } }))
  })
  await page.waitForTimeout(800)
  await page.screenshot({ path: 'Docs/Screenshots/M4/01_ding.png' })
  mkdirSync('Docs/Screenshots/M4', { recursive: true })
  await page.screenshot({ path: 'Docs/Screenshots/M4/01_ding.png' })

  await page.screenshot({ path: 'Docs/Screenshots/M9-e2e/02_panels.png' })

  // Copy key shots to artifacts for chat
  const { copyFileSync } = await import('node:fs')
  const shots = [
    'Docs/Screenshots/M0/01_title.png',
    'Docs/Screenshots/M2/03_world_loaded.png',
    'Docs/Screenshots/M3/02_combat_live.png',
    'Docs/Screenshots/M5/01_trainer.png',
    'Docs/Screenshots/M7/01_quest_log.png',
    'Docs/Screenshots/M8/01_talents.png',
    'Docs/Screenshots/M4/01_ding.png',
  ]
  for (const s of shots) {
    try {
      copyFileSync(s, `/opt/cursor/artifacts/screenshots/${s.split('/').pop()}`)
    } catch {
      /* ignore */
    }
  }

  await context.close()
  await browser.close()
  console.log('capture complete')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
