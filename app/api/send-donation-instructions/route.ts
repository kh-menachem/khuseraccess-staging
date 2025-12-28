import { type NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"
// import { generatePDFfromHTML } from "@/lib/generatePDF" // Removed import

export async function POST(req: NextRequest) {
  try {
    const { name, accountNumber, email } = await req.json()

    console.log("📧 Email request received:", { name, accountNumber, email })

    if (!name || !accountNumber || !email) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Validate environment variables
    const smtpConfig = {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    }

    console.log("🔧 SMTP Config Check:", {
      host: !!smtpConfig.host,
      port: !!smtpConfig.port,
      user: !!smtpConfig.user,
      pass: !!smtpConfig.pass,
      userEmail: smtpConfig.user ? smtpConfig.user.substring(0, 3) + "***" : "missing",
    })

    if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
      console.error("❌ Missing SMTP configuration")
      return NextResponse.json(
        {
          success: false,
          error: "Email service not configured. Please contact administrator.",
          details: "Missing SMTP environment variables",
        },
        { status: 500 },
      )
    }

    // Create email content
    const subject = `Donation Instructions - ${name} / ${accountNumber}`
    const donationURL = `https://secure.cardknox.com/kerenhatzedaka?xCustom03=${encodeURIComponent(
      `${name} / ${accountNumber}`,
    )}&xCustom04=${encodeURIComponent(email)}`

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(donationURL)}`

    const timestamp = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      dateStyle: "medium",
      timeStyle: "short",
    })

    const html = `
    <div style="font-family: Arial, sans-serif; color: #000; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fffbe6;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="/images/logo-20transparent-20backgrond-page-0001.jpeg" alt="Keren Hatzedakah Logo" width="130" style="margin-bottom: 10px;" />
        <h2 style="color: #000; margin: 0; text-transform: uppercase;">KEREN HATZEDAKAH</h2>
        <p style="color: #000; font-size: 16px; font-weight: bold;">Donation Instructions for Fund: ${accountNumber} - ${name}</p>
      </div>

      <p style="color: red; font-size: 14px; font-weight: bold; margin-top: -10px; margin-bottom: 30px; text-align: center;">
        IMPORTANT: Please include the note "<em>In honor of ${name} / ${accountNumber}</em>" with your donation. Without this, we cannot guarantee it will be credited to the correct fund.
      </p>

      <ol style="padding-left: 20px; font-size: 14px; line-height: 2;">

        <li style="margin-bottom: 25px;">
          <strong>Zelle / Chase QuickPay - זל</strong><br>
          Email: <a href="mailto:kerenhatzedaka@gmail.com" style="color: #000;">kerenhatzedaka@gmail.com</a>
        </li>

        <li style="margin-bottom: 25px;">
          <strong>By Check - צ׳ק</strong><br>
          Make checks payable to:<br>
          Congregation Tiferes Yaakov<br>
          422 Monmouth Ave, Lakewood, NJ 08701
        </li>

        <li style="margin-bottom: 25px;">
          <strong>Donor-Advised Funds (DAF) - חברת דונורס</strong><br>
          Accepted via: The Donors Fund, OJC, Pledger, Fidelity<br>
          Tax ID: 83-4411630<br>
          Address: Congregation Tiferes Yaakov, 6 Shoshana Dr, Lakewood, NJ
        </li>

        <li style="margin-bottom: 25px;">
          <strong>Bank Wire Transfer - העברה בנקאית</strong><br>
          Congregation Tiferes Yaakov<br>
          Account #: 4392635765<br>
          Fedwire #: 031201360<br>
          Memo: ${name} / ${accountNumber}
        </li>

        <li style="margin-bottom: 25px;">
          <strong>Credit Card Donation - אשראי</strong><br>
          <a href="${donationURL}" 
            style="background:#e60000;color:white;padding:12px 24px;border-radius:5px;text-decoration:none;display:inline-block;margin-top:10px;font-weight:bold;">
            💳 Donate Here
          </a>
          <p style="margin-top: 8px; font-size: 13px; color: #555;">
            Or copy this link:<br>
            <a href="${donationURL}" style="color: #007bff; word-break: break-all;">
              ${donationURL}
            </a>
          </p>
        </li>

        <li style="margin-bottom: 25px;">
          <strong>Donation Hotline - דרך הטלפון</strong><br>
          Call: 732-800-9840<br>
          Use Campaign ID: ${accountNumber}
        </li>

        <li style="margin-bottom: 25px;">
          <strong>SMS (Text Message) Donation - SMS דרך</strong><br>
          Text: 5540/amount to 732-800-9840
        </li>

      </ol>

      <div style="text-align: center; margin-top: 30px;">
        <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: bold; color: #20B2AA;">📱 Scan QR to Donate</p>
        <img src="${qrCodeUrl}" alt="QR Code" width="130" style="border: 2px solid #20B2AA; border-radius: 8px;" />
        <p style="margin: 10px 0 0 0; font-size: 12px; color: #555;">Point your phone camera at this code</p>
      </div>

      <div style="margin: 30px auto 0 auto; background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; font-size: 13px; text-align: center; max-width: 550px;">
        <strong>⚠️ Note:</strong> Please include the correct name and campaign ID in the memo.<br>
        Without it, funds may be distributed at the discretion of Keren Hatzedakah.
      </div>

      <p style="margin-top: 25px; text-align: center; color: #007bff; font-size: 14px;">
        Tizku L'Mitzvos! Your support helps bring comfort and strength to those in need.
      </p>
    </div>
    `

    // console.log("📄 Generating PDF attachment...")
    // let pdfBuffer: Buffer | null = null
    // try {
    //   pdfBuffer = await generatePDFfromHTML(html)
    //   console.log("✅ PDF generated successfully, size:", pdfBuffer.length, "bytes")
    // } catch (pdfError) {
    //   console.error("⚠️ PDF generation failed, continuing without attachment:", pdfError)
    //   // Continue without PDF attachment if generation fails
    // }

    console.log("🔧 Creating SMTP transporter...")

    // Create Gmail transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    })

    console.log("✅ SMTP transporter created")

    // Verify connection
    console.log("🔍 Verifying SMTP connection...")
    try {
      await transporter.verify()
      console.log("✅ SMTP connection verified successfully")
    } catch (verifyError) {
      console.error("❌ SMTP verification failed:", verifyError)
      throw new Error(`SMTP verification failed: ${verifyError.message}`)
    }

    console.log("📤 Sending email...")

    const mailOptions: any = {
      from: `"Keren Hatzedakah" <${smtpConfig.user}>`,
      to: email,
      subject: subject,
      html: html,
      text: `
    Donation Instructions for ${name} (Account: ${accountNumber})

    Here's How To Donate:

    1. Chase Quickpay / Zelle: kerenhatzedaka@gmail.com
      You MUST note it's in honor of ${name} / ${accountNumber}

    2. Checks: Written out to Congregation Tiferes Yaakov
      422 Monmouth Ave, Lakewood NJ 08701
      You MUST note it's in honor of ${name} / ${accountNumber}

    3. Credit Card: ${donationURL}

    4. Donation Hotline: Call 732-800-9840 and enter campaign ID ${accountNumber}

    5. SMS: Text 732-800-9840 with: ${accountNumber}/amount

    Important: Please ensure to include the correct campaign name and ID in your memo.
      `,
    }

    // // Add PDF attachment if available
    // if (pdfBuffer) {
    //   mailOptions.attachments = [
    //     {
    //       filename: `Donation-Instructions-${accountNumber}.pdf`,
    //       content: pdfBuffer,
    //       contentType: "application/pdf",
    //     },
    //   ]
    //   console.log("📎 PDF attachment added to email")
    // }

    // Send email
    const info = await transporter.sendMail(mailOptions)

    console.log("✅ Email sent successfully!")
    console.log("📧 Message ID:", info.messageId)
    console.log("📧 Response:", info.response)

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      message: "Donation instructions sent successfully!",
      // attachmentIncluded: !!pdfBuffer, // Removed attachmentIncluded field
    })
  } catch (error) {
    console.error("❌ Email sending failed:", error)

    let errorMessage = "Failed to send email"
    let helpMessage = ""

    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        name: error.name,
        code: (error as any).code,
      })

      // Specific error handling
      if (error.message.includes("Invalid login") || error.message.includes("Username and Password not accepted")) {
        errorMessage = "Gmail authentication failed"
        helpMessage =
          "Please check your Gmail App Password. Make sure 2FA is enabled and you're using an App Password, not your regular password."
      } else if (error.message.includes("Application-specific password required")) {
        errorMessage = "App Password required"
        helpMessage =
          "You need to use a Gmail App Password. Go to Google Account Settings > Security > 2-Step Verification > App passwords"
      } else if (error.message.includes("ECONNREFUSED") || error.message.includes("ETIMEDOUT")) {
        errorMessage = "Cannot connect to Gmail servers"
        helpMessage = "Network connection issue. Please try again in a few minutes."
      } else if (error.message.includes("ENOTFOUND")) {
        errorMessage = "Gmail server not found"
        helpMessage = "DNS resolution issue. Please check your internet connection."
      } else {
        errorMessage = error.message
        helpMessage = "Please check your SMTP configuration and try again."
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        help: helpMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
