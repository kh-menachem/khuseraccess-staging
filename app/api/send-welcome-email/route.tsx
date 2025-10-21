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
      <div style="font-family: Arial, sans-serif; color: #000; max-width: 650px; margin: 0 auto; background-color: #fff; direction: ltr;">

        <!-- Clickable Logo -->
        <div style="text-align: center; margin-top: 20px;">
          <a href="${siteUrl}" target="_blank" style="text-decoration: none;">
            <img src="${logoUrl}" alt="Keren Hatzedakah Logo" style="max-width: 180px; height: auto; margin-bottom: 5px;" />
          </a>
        </div>

        <!-- Headings -->
        <h2 style="color: #20B2AA; text-align: center; margin-bottom: 0;">Welcome to Keren Hatzedakah!</h2>
        <h3 style="text-align: center; direction: rtl; color: #20B2AA; margin-top: 5px;">ברוכים הבאים לקרן הצדקה!</h3>

        <!-- Intro -->
        <p style="text-align: left;">
          Your account has been created for <strong>${name}</strong> (Account #${accountNumber}).
        </p>
        <p style="direction: rtl; text-align: right;">
          החשבון שלך נוצר עבור <strong>${name}</strong> (מספר חשבון ${accountNumber})
        </p>

        <!-- Login Info -->
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Your Login Credentials:</h3>
          <h4 style="direction: rtl; text-align: right;">פרטי הכניסה שלך:</h4>
          <p><strong>Email:</strong> ${email}</p>
          <p style="direction: rtl; text-align: right;"><strong>אימייל:</strong> ${email}</p>
          <p><strong>Temporary Password:</strong>
            <code style="background: #fff; padding: 5px 10px; border-radius: 4px;">${temporaryPassword}</code>
          </p>
          <p style="direction: rtl; text-align: right;"><strong>סיסמה זמנית:</strong>
            <code style="background: #fff; padding: 5px 10px; border-radius: 4px;">${temporaryPassword}</code>
          </p>

          <!-- Login Buttons -->
          <div style="text-align: center; margin-top: 20px;">
            <a href="${siteUrl}/login" 
              style="background-color: #20B2AA; color: #fff; padding: 10px 25px; border-radius: 6px; text-decoration: none; font-weight: bold;">
              Login Now
            </a>
          </div>
          <div style="text-align: center; margin-top: 10px; direction: rtl;">
            <a href="${siteUrl}/login" 
              style="background-color: #20B2AA; color: #fff; padding: 10px 25px; border-radius: 6px; text-decoration: none; font-weight: bold;">
              התחבר עכשיו
            </a>
          </div>
        </div>

        <!-- Security Steps -->
        <p><strong>⚠️ Important Security Steps:</strong></p>
        <p style="direction: rtl; text-align: right;"><strong>⚠️ צעדים חשובים לשמירה על אבטחה:</strong></p>
        <ol>
          <li>Login at: <a href="${siteUrl}/login" style="color:#20B2AA;">${siteUrl}</a></li>
          <li>Change your password immediately after first login</li>
          <li>Do not share your password with anyone</li>
        </ol>
        <ol style="direction: rtl; text-align: right;">
          <li>היכנס למערכת בכתובת: <a href="${siteUrl}/login" style="color:#20B2AA;">${siteUrl}</a></li>
          <li>שנה את הסיסמה מיד לאחר הכניסה הראשונה</li>
          <li>אל תשתף את הסיסמה עם אף אחד</li>
        </ol>

        <p>If you have any questions, please contact the administrator.</p>
        <p style="direction: rtl; text-align: right;">אם יש לך שאלות, אנא פנה למנהל המערכת.</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />

        <!-- Footer -->
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
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Failed to send welcome email:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
