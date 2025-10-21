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

    // Real live URLs
    const siteUrl = "https://6301926.com"
    const logoUrl = "https://www.6301926.com/images/logo-new.png"

    // ✅ Fetch logo and embed as inline attachment (most reliable across Gmail/Outlook)
    const resp = await fetch(logoUrl)
    if (!resp.ok) throw new Error(`Failed to fetch logo: ${resp.status} ${resp.statusText}`)
    const arrayBuf = await resp.arrayBuffer()
    const logoBuffer = Buffer.from(arrayBuf)
    const logoCid = "kh-logo@6301926" // any unique id

    const html = `
      <div style="font-family: Arial, sans-serif; color: #000; max-width: 650px; margin: 0 auto; background-color: #fff;">
        <div style="text-align: center; margin-top: 20px;">
          <a href="${siteUrl}" target="_blank" style="text-decoration: none;">
            <img src="cid:${logoCid}" alt="Keren Hatzedakah Logo"
              style="max-width: 180px; height: auto; margin-bottom: 5px;" />
          </a>
        </div>

        <h2 style="color: #20B2AA; text-align: center; margin: 10px 0;">
          Welcome to Keren Hatzedakah! | <span dir="rtl">ברוכים הבאים לקרן הצדקה!</span>
        </h2>

        <table width="100%" cellspacing="0" cellpadding="8" style="border-collapse: collapse;">
          <tr>
            <td valign="top" style="width: 50%; text-align: left;">
              <p>Your account has been created for <strong>${name}</strong> (Account #${accountNumber}).</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Temporary Password:</strong></p>
              <input
                value="${temporaryPassword}"
                readonly
                style="
                  width: auto;
                  display: inline-block;
                  background: #f9f9f9;
                  border: 1px solid #ccc;
                  border-radius: 4px;
                  padding: 4px 6px;
                  font-family: Arial, sans-serif;
                  font-size: 14px;
                  color: #000;
                  text-align: center;
                "
                aria-label="Temporary Password"
              />
              <p style="margin-top:20px;">
                Login at: <a href="${siteUrl}/login" style="color:#20B2AA;">https://6301926.com</a>
              </p>
              <p>Change your password immediately after first login.</p>
              <p>Do not share your password with anyone.</p>
            </td>

            <td valign="top" dir="rtl" style="width: 50%; text-align: right; border-left: 1px solid #ddd;">
              <p>החשבון שלך נוצר עבור <strong>${name}</strong> (מספר חשבון ${accountNumber})</p>
              <p><strong>אימייל:</strong> ${email}</p>
              <p><strong>סיסמה זמנית:</strong></p>
              <input
                value="${temporaryPassword}"
                readonly
                style="
                  width: auto;
                  display: inline-block;
                  background: #f9f9f9;
                  border: 1px solid #ccc;
                  border-radius: 4px;
                  padding: 4px 6px;
                  font-family: Arial, sans-serif;
                  font-size: 14px;
                  color: #000;
                  text-align: center;
                "
                aria-label="סיסמה זמנית"
              />
              <p style="margin-top:20px;">היכנס למערכת בכתובת:
                <a href="${siteUrl}/login" style="color:#20B2AA;">https://6301926.com</a>
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
          <p style="margin: 0;">🌐 <a href="${siteUrl}" style="color:#20B2AA;">6301926.com</a></p>
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
      attachments: [
        {
          filename: "logo-new.png",
          content: logoBuffer,            // embed actual bytes
          contentType: "image/png",
          cid: logoCid,                   // must match src="cid:..."
        },
      ],
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Failed to send welcome email:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
