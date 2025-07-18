import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createTransport } from "nodemailer";
import * as QRCode from "qrcode";
import { readFileSync } from "fs";
import path from "path";
import sharp from "sharp";
import { Buffer } from "buffer";

// Required to parse base64 and embed logo
async function generateQRCodeWithLogo(url: string): Promise<string> {
  const logoPath = path.join(process.cwd(), "public/logo-new.png"); // Make sure logo.png is placed in /public
  const logoBuffer = readFileSync(logoPath);
  const qrBuffer = await QRCode.toBuffer(url, { errorCorrectionLevel: "H" });

  const qrWithLogo = await sharp(qrBuffer)
    .composite([{ input: logoBuffer, gravity: "centre" }])
    .png()
    .toBuffer();

  return `data:image/png;base64,${qrWithLogo.toString("base64")}`;
}

export async function POST(req: NextRequest) {
  try {
    const { name, accountNumber, email } = await req.json();

    const subject = `${name} / ${accountNumber}`;
    const donationURL = `https://secure.cardknox.com/kerenhatzedaka?xCustom03=${encodeURIComponent(
      `${name} / ${accountNumber}`
    )}&xCustom04=${encodeURIComponent(email)}`;

    const qrDataUrl = await generateQRCodeWithLogo(donationURL);

    const html = `
      <div style="font-family: Arial, sans-serif; color: #000;">
        <div style="text-align: center;">
          <img src="${qrDataUrl}" alt="QR Code" width="180" style="margin-bottom: 20px;" />
          <h2>Keren Hatzedakah</h2>
        </div>

        <h3>Here's How To Donate: איך לתרום</h3>

        <ol>
          <li><strong>Chase Quickpay / Zelle</strong> - <a href="mailto:kerenhatzedaka@gmail.com">kerenhatzedaka@gmail.com</a> זעל קוויק פאי<br>
          You MUST note it's in honor of <strong>${name} / ${accountNumber}</strong></li>

          <li><strong>Cheques</strong> - על ידי צ'ק<br>
          Written out to Congregation Tiferes Yaakov<br>
          422 Monmouth Ave, Lakewood NJ 08701<br>
          You MUST note it's in honor of <strong>${name} / ${accountNumber}</strong></li>

          <li><strong>OJC, Fidelity, The Donors Fund</strong> - Tax ID# 83-4411630 דרך חברת דונורס<br>
          Congregation Tiferes Yaakov<br>
          6 Shoshana Dr Lakewood, NJ 08701<br>
          You MUST note it's in honor of <strong>${name} / ${accountNumber}</strong></li>

          <li><strong>Bank Wires</strong> - העברת בנק<br>
          Congregation Tiferes Yaakov<br>
          6 Shoshana Dr Lakewood NJ 08701<br>
          Account # 4392635765<br>
          Fedwire # 031201360<br>
          You MUST note it's in honor of <strong>${name} / ${accountNumber}</strong></li>

          <li><strong>Credit Card Donations</strong> - אשראי<br>
            <a href="${donationURL}" style="background:#e60000;color:white;padding:10px 20px;border-radius:5px;text-decoration:none;">Donate Here →</a>
          </li>

          <li><strong>Donation Hotline</strong> - Call 7328009840 and enter campaign ID <strong>${accountNumber}</strong> דרך הטלפון</li>

          <li><strong>Donate by SMS</strong> - Text 7328009840 with: <strong>${accountNumber}/amount</strong> דרך SMS</li>
        </ol>

        <p><strong>Scan QR to Donate:</strong><br>
        <img src="${qrDataUrl}" width="180" /></p>

        <p><em>Please ensure to include the correct campaign name and ID in your memo. If missing, funds will be distributed at the discretion of Keren Hatzedakah.</em></p>
      </div>
    `;

    const transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Keren Hatzedakah" <noreply@yourdomain.com>`,
      to: email,
      subject,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email sending failed:", error);
    return NextResponse.json({ success: false, error: "Failed to send email" }, { status: 500 });
  }
}
