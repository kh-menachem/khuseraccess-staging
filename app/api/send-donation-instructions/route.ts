import { type NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"

export async function POST(req: NextRequest) {
  try {
    const { name, accountNumber, email } = await req.json()

    console.log("Email request received:", { name, accountNumber, email })

    if (!name || !accountNumber || !email) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Validate environment variables
    const requiredEnvVars = {
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS,
    }

    console.log("Environment variables check:", {
      SMTP_HOST: !!requiredEnvVars.SMTP_HOST,
      SMTP_PORT: !!requiredEnvVars.SMTP_PORT,
      SMTP_USER: !!requiredEnvVars.SMTP_USER,
      SMTP_PASS: !!requiredEnvVars.SMTP_PASS,
    })

    if (!requiredEnvVars.SMTP_HOST || !requiredEnvVars.SMTP_USER || !requiredEnvVars.SMTP_PASS) {
      console.error("Missing SMTP configuration")
      return NextResponse.json(
        {
          success: false,
          error: "Email service not configured properly. Please contact administrator.",
        },
        { status: 500 },
      )
    }

    const subject = `${name} / ${accountNumber}`
    const donationURL = `https://secure.cardknox.com/kerenhatzedaka?xCustom03=${encodeURIComponent(
      `${name} / ${accountNumber}`,
    )}&xCustom04=${encodeURIComponent(email)}`

    // Generate QR code URL using a free service
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(donationURL)}`

    const html = `
      <div style="font-family: Arial, sans-serif; color: #000; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="${qrCodeUrl}" alt="QR Code" width="200" style="margin-bottom: 20px;" />
          <h2 style="color: #20B2AA; margin: 0;">Keren Hatzedakah</h2>
          <p style="color: #666; margin: 10px 0;">Donation Instructions for ${name}</p>
        </div>

        <h3 style="color: #20B2AA; border-bottom: 2px solid #20B2AA; padding-bottom: 10px;">
          Here's How To Donate: איך לתרום
        </h3>

        <div style="margin: 20px 0;">
          <ol style="line-height: 1.8; padding-left: 20px;">
            <li style="margin-bottom: 15px;">
              <strong>Chase Quickpay / Zelle</strong> - 
              <a href="mailto:kerenhatzedaka@gmail.com" style="color: #20B2AA;">kerenhatzedaka@gmail.com</a> 
              זעל קוויק פאי<br>
              <em>You MUST note it's in honor of <strong>${name} / ${accountNumber}</strong></em>
            </li>

            <li style="margin-bottom: 15px;">
              <strong>Cheques</strong> - על ידי צ'ק<br>
              Written out to Congregation Tiferes Yaakov<br>
              422 Monmouth Ave, Lakewood NJ 08701<br>
              <em>You MUST note it's in honor of <strong>${name} / ${accountNumber}</strong></em>
            </li>

            <li style="margin-bottom: 15px;">
              <strong>OJC, Fidelity, The Donors Fund</strong> - Tax ID# 83-4411630 דרך חברת דונורס<br>
              Congregation Tiferes Yaakov<br>
              6 Shoshana Dr Lakewood, NJ 08701<br>
              <em>You MUST note it's in honor of <strong>${name} / ${accountNumber}</strong></em>
            </li>

            <li style="margin-bottom: 15px;">
              <strong>Bank Wires</strong> - העברת בנק<br>
              Congregation Tiferes Yaakov<br>
              6 Shoshana Dr Lakewood NJ 08701<br>
              Account # 4392635765<br>
              Fedwire # 031201360<br>
              <em>You MUST note it's in honor of <strong>${name} / ${accountNumber}</strong></em>
            </li>

            <li style="margin-bottom: 15px;">
              <strong>Credit Card Donations</strong> - אשראי<br>
              <a href="${donationURL}" 
                 style="background:#e60000;color:white;padding:12px 24px;border-radius:5px;text-decoration:none;display:inline-block;margin-top:10px;">
                Donate Here →
              </a>
            </li>

            <li style="margin-bottom: 15px;">
              <strong>Donation Hotline</strong> - Call 
              <a href="tel:7328009840" style="color: #20B2AA;">732-800-9840</a> 
              and enter campaign ID <strong>${accountNumber}</strong> דרך הטלפון
            </li>

            <li style="margin-bottom: 15px;">
              <strong>Donate by SMS</strong> - Text 
              <a href="sms:7328009840" style="color: #20B2AA;">732-800-9840</a> 
              with: <strong>${accountNumber}/amount</strong> דרך SMS
            </li>
          </ol>
        </div>

        <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
          <p style="margin: 0 0 15px 0;"><strong>Scan QR to Donate:</strong></p>
          <img src="${qrCodeUrl}" width="180" alt="QR Code for Donations" />
        </div>

        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #856404; font-size: 14px;">
            <strong>Important:</strong> Please ensure to include the correct campaign name and ID in your memo. 
            If missing, funds will be distributed at the discretion of Keren Hatzedakah.
          </p>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            This email was sent to ${email} for account ${accountNumber}
          </p>
        </div>
      </div>
    `

    console.log("Creating SMTP transporter...")

    // Create SMTP transporter with multiple fallback configurations
    let transporter

    try {
      // Primary configuration - Gmail with explicit settings
      transporter = nodemailer.createTransporter({
        host: requiredEnvVars.SMTP_HOST || "smtp.gmail.com",
        port: Number.parseInt(requiredEnvVars.SMTP_PORT || "587"),
        secure: false, // true for 465, false for other ports
        auth: {
          user: requiredEnvVars.SMTP_USER,
          pass: requiredEnvVars.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      })

      console.log("SMTP transporter created successfully")

      // Verify connection
      console.log("Verifying SMTP connection...")
      await transporter.verify()
      console.log("SMTP connection verified successfully")
    } catch (verifyError) {
      console.error("SMTP verification failed:", verifyError)

      // Fallback: Try Gmail service shorthand
      try {
        console.log("Trying Gmail service fallback...")
        transporter = nodemailer.createTransporter({
          service: "gmail",
          auth: {
            user: requiredEnvVars.SMTP_USER,
            pass: requiredEnvVars.SMTP_PASS,
          },
        })

        await transporter.verify()
        console.log("Gmail service fallback successful")
      } catch (fallbackError) {
        console.error("Gmail service fallback also failed:", fallbackError)
        throw new Error(`SMTP configuration failed: ${fallbackError.message}`)
      }
    }

    console.log("Sending email...")

    // Send email
    const info = await transporter.sendMail({
      from: `"Keren Hatzedakah" <${requiredEnvVars.SMTP_USER}>`,
      to: email,
      subject: `Donation Instructions - ${subject}`,
      html,
    })

    console.log(`Email sent successfully to ${email}`)
    console.log(`Message ID: ${info.messageId}`)

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      message: "Donation instructions sent successfully!",
    })
  } catch (error) {
    console.error("Email sending failed:", error)

    // Provide more specific error messages
    let errorMessage = "Failed to send email"
    let debugInfo = ""

    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      })

      if (error.message.includes("Invalid login") || error.message.includes("Username and Password not accepted")) {
        errorMessage = "Gmail authentication failed. Please check your email and app password."
        debugInfo = "Make sure you're using a Gmail App Password, not your regular password."
      } else if (error.message.includes("self signed certificate")) {
        errorMessage = "SSL certificate error. Please check your SMTP configuration."
      } else if (error.message.includes("ECONNREFUSED") || error.message.includes("ETIMEDOUT")) {
        errorMessage = "Cannot connect to email server. Please check your network connection."
      } else if (error.message.includes("ENOTFOUND")) {
        errorMessage = "Email server not found. Please check SMTP host configuration."
      } else {
        errorMessage = `Email error: ${error.message}`
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        debugInfo: debugInfo,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
