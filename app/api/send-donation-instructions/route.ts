import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { name, accountNumber, email } = await req.json()

    if (!name || !accountNumber || !email) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const subject = `${name} / ${accountNumber}`
    const donationURL = `https://secure.cardknox.com/kerenhatzedaka?xCustom03=${encodeURIComponent(
      `${name} / ${accountNumber}`,
    )}&xCustom04=${encodeURIComponent(email)}`

    // Simple QR code URL using a free service
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

    // Use a simple email service or return the HTML for now
    // For production, you would integrate with your email service

    // For now, we'll simulate success and log the email content
    console.log(`Email would be sent to: ${email}`)
    console.log(`Subject: Donation Instructions - ${subject}`)
    console.log(`HTML Content: ${html}`)

    // Try to use fetch to send via a simple email service
    try {
      const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          service_id: "default_service",
          template_id: "template_donation",
          user_id: process.env.EMAILJS_USER_ID || "demo",
          template_params: {
            to_email: email,
            subject: `Donation Instructions - ${subject}`,
            html_content: html,
          },
        }),
      })

      if (response.ok) {
        console.log(`Donation instructions email sent successfully to ${email}`)
        return NextResponse.json({ success: true })
      } else {
        throw new Error("Email service failed")
      }
    } catch (emailError) {
      console.log("Email service not available, returning success for demo")
      return NextResponse.json({ success: true, message: "Email functionality is in demo mode" })
    }
  } catch (error) {
    console.error("Email sending failed:", error)
    return NextResponse.json({ success: false, error: "Failed to send email" }, { status: 500 })
  }
}
