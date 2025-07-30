// lib/generatePDF.ts

import chromium from "chrome-aws-lambda"
import { Browser } from "puppeteer-core"

export async function generatePDFfromHTML(html: string): Promise<Buffer> {
  const chromium = require("chrome-aws-lambda")
  const puppeteer = require("puppeteer-core")

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
  })

  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: "networkidle0" })
  const pdf = await page.pdf({ format: "A4", printBackground: true })
  await browser.close()
  return pdf
}
