import { NextResponse } from "next/server"
import nodemailer from "nodemailer"

export async function POST(req: Request) {
  try {
    const { email, temporaryPassword, accountNumber, name } = await req.json()

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #20B2AA;">Welcome to Keren Hatzedakah!</h2>
        
        <p>Your account has been created for <strong>${name}</strong> (Account #${accountNumber})</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Your Login Credentials:</h3>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Temporary Password:</strong> <code style="background: #fff; padding: 5px 10px; border-radius: 4px;">${temporaryPassword}</code></p>
        </div>
        
        <p><strong>⚠️ Important Security Steps:</strong></p>
        <ol>
          <li>Login at: <a href="${process.env.NEXT_PUBLIC_SITE_URL}/login">${process.env.NEXT_PUBLIC_SITE_URL}/login</a></li>
          <li>Change your password immediately after first login</li>
          <li>Do not share your password with anyone</li>
        </ol>
        
        <p>If you have any questions, please contact the administrator.</p>
        
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This is an automated message from Keren Hatzedakah Portal.
        </p>
      </div>
    `

    await transporter.sendMail({
      from: `"Keren Hatzedakah" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Welcome to Keren Hatzedakah - Your Account is Ready",
      html,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to send welcome email:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
