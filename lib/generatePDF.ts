export async function generatePDFfromHTML(html: string): Promise<Buffer> {
  const isDev = !process.env.AWS_REGION // true if running locally

  let browser

  if (isDev) {
    // Local development - use regular puppeteer
    const puppeteer = require("puppeteer")
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })
  } else {
    // Production - use puppeteer-core with chrome-aws-lambda
    const chromium = require("chrome-aws-lambda")
    const puppeteer = require("puppeteer-core")

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    })
  }

  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: "networkidle0" })

  const pdfBuffer = await page.pdf({
    format: "A4",
    landscape: true, // Landscape for 2-column layout
    printBackground: true,
    margin: {
      top: "15px",
      bottom: "15px",
      left: "15px",
      right: "15px",
    },
  })

  await browser.close()
  return pdfBuffer
}
