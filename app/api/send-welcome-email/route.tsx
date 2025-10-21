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

    // ✅ Real live URLs
    const siteUrl = "https://6301926.com"
    const logoUrl = "https://www.6301926.com/images/logo-new.png"

    const html = `
    <div style="font-family: Arial, sans-serif; color: #000; max-width: 650px; margin: 0 auto; background-color: #fff;">
      <div style="text-align: center; margin-top: 20px;">
        <a href="https://6301926.com" target="_blank" style="text-decoration: none;">
          <img src="/images/design-mode/logo-new(3).png" alt="Keren Hatzedakah Logo"
            style="max-width: 180px; height: auto; margin-bottom: 5px;" />
        </a>
      </div>

      <h2 style="color: #20B2AA; text-align: center; margin: 10px 0;">Welcome to Keren Hatzedakah! | <span dir="rtl">ברוכים הבאים לקרן הצדקה!</span></h2>

      <table width="100%" cellspacing="0" cellpadding="8" style="border-collapse: collapse;">
        <tr>
          <td valign="top" style="width: 50%; text-align: left;">
            <p>Your account has been created for <strong>${name}</strong> (Account #${accountNumber}).</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Temporary Password:</strong></p>
            <div style="background:#fff; border:1px solid #ccc; border-radius:6px; padding:8px 12px; display:inline-block; font-family:monospace;">
              ${temporaryPassword}
            </div>
            <div style="margin-top:8px;">
              <button onclick="navigator.clipboard.writeText('${temporaryPassword}')"
                style="background-color:#20B2AA;color:#fff;border:none;padding:6px 14px;border-radius:5px;font-weight:bold;cursor:pointer;">
                Copy Password
              </button>
            </div>
            <p style="margin-top:20px;">
              Login at: <a href="https://6301926.com/login" style="color:#20B2AA;">https://6301926.com</a>
            </p>
            <p>Change your password immediately after first login.</p>
            <p>Do not share your password with anyone.</p>
          </td>

          <td valign="top" dir="rtl" style="width: 50%; text-align: right; border-left: 1px solid #ddd;">
            <p>החשבון שלך נוצר עבור <strong>${name}</strong> (מספר חשבון ${accountNumber})</p>
            <p><strong>אימייל:</strong> ${email}</p>
            <p><strong>סיסמה זמנית:</strong></p>
            <div style="background:#fff; border:1px solid #ccc; border-radius:6px; padding:8px 12px; display:inline-block; font-family:monospace;">
              ${temporaryPassword}
            </div>
            <div style="margin-top:8px;">
              <button onclick="navigator.clipboard.writeText('${temporaryPassword}')"
                style="background-color:#20B2AA;color:#fff;border:none;padding:6px 14px;border-radius:5px;font-weight:bold;cursor:pointer;">
                העתק סיסמה
              </button>
            </div>
            <p style="margin-top:20px;">היכנס למערכת בכתובת: 
              <a href="https://6301926.com/login" style="color:#20B2AA;">https://6301926.com</a>
            </p>
            <p>שנה את הסיסמה מיד לאחר הכניסה הראשונה.</p>
            <p>אל תשתף את הסיסמה עם אף אחד.</p>
          </td>
        </tr>
      </table>

      <hr style="margin: 25px 0; border: none; border-top: 1px solid #ddd;" />

      <div style="text-align: center; font-size: 13px; color: #555;">
        <p style="margin: 0;">Keren Hatzedakah | Congregation Tiferes Yaakov</p>
        <p style="margin: 0;">🏢 422 Monmouth Ave, Lakewood, NJ 08701</p>
        <p style="margin: 0;">📞 USA: <a href="tel:7326301924" style="color:#20B2AA;">732-630-1924</a> | 🇮🇱 Israel: <a href="tel:0543530084" style="color:#20B2AA;">054-353-0084</a></p>
        <p style="margin: 0;">🌐 <a href="https://6301926.com" style="color:#20B2AA;">6301926.com</a></p>
        <p style="margin-top: 10px; font-size: 12px; color: #888;">
          This is an automated message from Keren Hatzedakah Portal.<br/>
          זו הודעה אוטומטית ממערכת קרן הצדקה.
        </p>
      </div>
    </div>
  `

    await transporter.sendMail({
      from: `"Keren Hatzedakah" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Welcome | ברוכים הבאים - Keren Hatzedakah",
      html,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Failed to send welcome email:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
