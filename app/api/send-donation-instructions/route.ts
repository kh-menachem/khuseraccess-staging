import { type NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"

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
      <div style="font-family: Arial, sans-serif; color: #000; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="https://6301926.com/images/logo-new.png" alt="Keren Hatzedakah Logo" width="200" style="margin-bottom: 20px;" />
          <h2 style="color: #20B2AA; margin: 0;">Keren Hatzedakah</h2>
          <p style="color: #666; margin: 10px 0;">Donation Instructions for</p>
          <p style="color: #666; font-size: 14px;">Fund: ${accountNumber} -  ${name}</p>
        </div>

        <h3 style="color: #20B2AA; border-bottom: 2px solid #20B2AA; padding-bottom: 10px;">
          Here's How To Donate: איך לתרום
        </h3>

        <div style="margin: 20px 0;">
          <ol style="line-height: 1.8; padding-left: 20px;">
            <li style="margin-bottom: 15px;">
              <strong>Chase Quickpay / Zelle</strong> - 
              זעל קוויק פאי<br>

              <!-- Donation reference note -->
              <em style="color: #d63384;">
                You MUST note it's in honor of <strong>${name} / ${accountNumber}</strong>
              </em><br>

              <!-- Emails listed separately -->
              <span style="display: block; margin-top: 8px; font-size: 14px;">
                Send to one of the following email addresses:
                <br />
                <a href="mailto:kerenhatzedaka@gmail.com" style="color: #007bff;">kerenhatzedaka@gmail.com</a><br />
                <a href="mailto:kerenhatzedakah@gmail.com" style="color: #007bff;">kerenhatzedakah@gmail.com</a><br />
                <a  style="color: #007bff;">ozerdalimlakewood@gmail.com</a>
              </span>
            </li>


            <li style="margin-bottom: 15px;">
              <strong>Cheques</strong> - על ידי צ'ק<br>
              Written out to Congregation Tiferes Yaakov<br>
              422 Monmouth Ave, Lakewood NJ 08701<br>
              <em style="color: #d63384;">You MUST note it's in honor of <strong>${name} / ${accountNumber}</strong></em>
            </li>

            <li style="margin-bottom: 15px;">
              <strong>OJC, Fidelity, The Donors Fund</strong> - Tax ID# 83-4411630 דרך חברת דונורס<br>
              Congregation Tiferes Yaakov<br>
              6 Shoshana Dr Lakewood, NJ 08701<br>
              <em style="color: #d63384;">You MUST note it's in honor of <strong>${name} / ${accountNumber}</strong></em>
            </li>

            <li style="margin-bottom: 15px;">
              <strong>Bank Wires</strong> - העברת בנק<br>
              Congregation Tiferes Yaakov<br>
              6 Shoshana Dr Lakewood NJ 08701<br>
              Account # 4392635765<br>
              Fedwire # 031201360<br>
              <em style="color: #d63384;">You MUST note it's in honor of <strong>${name} / ${accountNumber}</strong></em>
            </li>

            <li style="margin-bottom: 15px;">
              <strong>Credit Card Donations</strong> - אשראי<br>

              <!-- Button with full link -->
              <a href="${donationURL}" 
                style="background:#e60000;color:white;padding:12px 24px;border-radius:5px;text-decoration:none;display:inline-block;margin-top:10px;font-weight:bold;">
                💳 Donate Here →
              </a>

              <!-- Display a short version below -->
              <p style="margin-top: 8px; font-size: 13px; color: #555;">
                Or copy this link:<br>
                <a href="${donationURL}" style="color: #007bff; word-break: break-all;">
                  khdonate.org/${accountNumber}
                </a>
              </p>
            </li>


            <li style="margin-bottom: 15px;">
              <strong>Donation Hotline</strong> - Call 
              <a href="tel:7328009840" style="color: #20B2AA; font-weight: bold;">732-800-9840</a> 
              and enter campaign ID <strong>${accountNumber}</strong> דרך הטלפון
            </li>

            <li style="margin-bottom: 15px;">
              <strong>Donate by SMS</strong> - Text 
              <a href="sms:7328009840" style="color: #20B2AA; font-weight: bold;">732-800-9840</a> 
              with: <strong>${accountNumber}/amount</strong> דרך SMS
            </li>
          </ol>
        </div>

        <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border: 2px dashed #20B2AA;">
          <p style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold; color: #20B2AA;">📱 Scan QR to Donate:</p>
          <img src="${qrCodeUrl}" width="180" alt="QR Code for Donations" style="border: 2px solid #20B2AA; border-radius: 8px;" />
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">Point your phone camera at this code</p>
        </div>

        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #856404; font-size: 14px;">
            <strong>⚠️ Important:</strong> Please ensure to include the correct campaign name and ID in your memo. 
            If missing, funds will be distributed at the discretion of Keren Hatzedakah.
          </p>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            This email was sent to ${email} for fund ${accountNumber}<br>
              Generated on ${timestamp} (Eastern Time)
          </p>
        </div>
      </div>
    `

    console.log("🔧 Creating SMTP transporter...")

    // Create Gmail transporter
    const transporter = nodemailer.createTransport({
      service: "gmail", // Use Gmail service
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

    // Send email
    const info = await transporter.sendMail({
      from: `"Keren Hatzedakah" <${smtpConfig.user}>`,
      to: email,
      subject: subject,
      html: html,
      // Add text version as fallback
      text: `
Donation Instructions for ${name} (Account: ${accountNumber})

Here's How To Donate:

1. Chase Quickpay / Zelle: kerenhatzedaka@gmail.com
   You MUST note it's in honor of ${name} / ${accountNumber}

2. Cheques: Written out to Congregation Tiferes Yaakov
   422 Monmouth Ave, Lakewood NJ 08701
   You MUST note it's in honor of ${name} / ${accountNumber}

3. Credit Card: ${donationURL}

4. Donation Hotline: Call 732-800-9840 and enter campaign ID ${accountNumber}

5. SMS: Text 732-800-9840 with: ${accountNumber}/amount

Important: Please ensure to include the correct campaign name and ID in your memo.
      `,
    })

    console.log("✅ Email sent successfully!")
    console.log("📧 Message ID:", info.messageId)
    console.log("📧 Response:", info.response)

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      message: "Donation instructions sent successfully!",
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
