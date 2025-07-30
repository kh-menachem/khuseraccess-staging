import puppeteer from 'puppeteer-core'
import chromium from 'chrome-aws-lambda'

export async function generatePDFfromHTML(html: string): Promise<Buffer> {
  const isDev = !process.env.AWS_REGION // true if running locally

  const chromium = isDev ? null : require("chrome-aws-lambda")
  const puppeteer = isDev ? require("puppeteer") : require("puppeteer-core")

  const browser = await puppeteer.launch({
  args: chromium.args,
  defaultViewport: chromium.defaultViewport,
  executablePath: await chromium.executablePath || '/usr/bin/chromium-browser',
  headless: chromium.headless,
  })

  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: "networkidle0" })

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: {
      top: "20px",
      bottom: "20px",
      left: "20px",
      right: "20px",
    },
  })

  await browser.close()
  return pdfBuffer
}
