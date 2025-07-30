import puppeteer from "puppeteer"

export async function generatePDFfromHTML(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({ headless: "new" })
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: "networkidle0" })
  const pdfBuffer = await page.pdf({ format: "Letter", printBackground: true })
  await browser.close()
  return pdfBuffer
}
