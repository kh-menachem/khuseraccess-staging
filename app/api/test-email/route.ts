import { NextResponse } from "next/server"
import nodemailer from "nodemailer"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    console.log("🧪 Testing email configuration...")

    // Check environment variables
    const config = {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    }

    console.log("📋 Config check:", {
      host: !!config.host,
      port: !!config.port,
      user: !!config.user,
      pass: !!config.pass,
      userPreview: config.user ? config.user.substring(0, 3) + "***@gmail.com" : "missing",
    })

    if (!config.user || !config.pass) {
      return NextResponse.json({
        success: false,
        error: "Missing SMTP_USER or SMTP_PASS environment variables",
        config: {
          host: !!config.host,
          port: !!config.port,
          user: !!config.user,
          pass: !!config.pass,
        },
      })
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: config.user,
        pass: config.pass,
      },
    })

    console.log("🔍 Verifying connection...")

    // Test connection
    await transporter.verify()

    console.log("✅ Connection successful!")

    // Send test email
    const testInfo = await transporter.sendMail({
      from: `"Keren Hatzedakah Test" <${config.user}>`,
      to: config.user, // Send to self
      subject: "✅ Email Test Successful",
      html: `
        <h2>🎉 Email Configuration Working!</h2>
        <p>This test email confirms that your Gmail SMTP setup is working correctly.</p>
        <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>From:</strong> ${config.user}</p>
      `,
    })

    return NextResponse.json({
      success: true,
      message: "Email test successful!",
      messageId: testInfo.messageId,
      from: config.user,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Email test failed:", error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      details: error instanceof Error ? error.stack : null,
    })
  }
}
