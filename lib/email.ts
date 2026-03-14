import nodemailer from "nodemailer";
import { env } from "@/lib/env";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE ?? false,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASSWORD,
  },
});

const VERIFY_EMAIL_SUBJECT = "Verify your email address";
const VERIFY_EMAIL_TEXT = (url: string) =>
  `Click the link below to verify your email. This link expires in 10 minutes.\n\nVerify email: ${url}`;
const VERIFY_EMAIL_HTML = (url: string) =>
  `<!DOCTYPE html>
  <html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Email Verification - Postcode Verifier</title>
    <style>
      body { width: 100% !important; height: 100% !important; margin: 0 !important; padding: 0 !important; background-color: #f4f7f9; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
      table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
      img { border: 0; outline: none; text-decoration: none; }
      .wrapper { width: 100%; table-layout: fixed; background-color: #f4f7f9; }
      .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; color: #4a4a4a; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
      .header { background-color: #1a73e8; padding: 40px 0; text-align: center; color: #ffffff; }
      .header h1 { margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; color: #ffffff; }
      .content { padding: 40px 30px; text-align: center; line-height: 1.6; }
      .content h2 { color: #202124; font-size: 22px; margin-top: 0; }
      .content p { font-size: 16px; color: #5f6368; }
      .button-container { padding: 20px 0 30px; text-align: center; }
      .button { background-color: #1a73e8; border-radius: 6px; color: #ffffff !important; display: inline-block; font-size: 16px; font-weight: bold; line-height: 50px; text-align: center; text-decoration: none; width: 220px; -webkit-text-size-adjust: none; mso-padding-alt: 0; }
      .footer { padding: 30px; text-align: center; font-size: 12px; color: #9aa0a6; }
      .url-box { background-color: #f8f9fa; border: 1px solid #e8eaed; padding: 15px; border-radius: 4px; word-break: break-all; margin-top: 20px; font-family: 'Courier New', Courier, monospace; font-size: 13px; color: #1a73e8; text-align: left; }
    </style>
  </head>
  <body>
    <table class="wrapper" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td align="center" style="padding: 20px 0 40px 0;">
          <table class="main" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td class="header">
                <h1>Postcode Verifier</h1>
              </td>
            </tr>
            <tr>
              <td class="content">
                <h2>Verify your email</h2>
                <p>Thanks for signing up! To get started, please confirm your email address by clicking the button below. This link is only valid for <strong>10 minutes</strong>.</p>
                
                <table width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td class="button-container">
                      <!--[if mso]>
                      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:office" href="${url}" style="height:50px;v-text-anchor:middle;width:220px;" arcsize="12%" stroke="f" fillcolor="#1a73e8">
                        <w:anchorlock/>
                        <v:textbox inset="0,0,0,0">
                          <table width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td align="center">
                      <![endif]-->
                      <a href="${url}" class="button">Verify Email Address</a>
                      <!--[if mso]>
                              </td>
                            </tr>
                          </table>
                        </v:textbox>
                      </v:roundrect>
                      <![endif]-->
                    </td>
                  </tr>
                </table>
                
                <p>If the button above doesn't work, copy and paste the following link into your browser:</p>
                <table width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td class="url-box">
                      ${url}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="footer">
                <p>You received this email because you registered for an account with Postcode Verifier. If you didn't do this, you can safely ignore this email.</p>
                <p>&copy; ${new Date().getFullYear()} Postcode Verifier Inc. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;

export async function sendVerificationEmail(
  to: string,
  token: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (env.ALLOW_TEST_ROUTES === "true") {
    return { ok: true };
  }
  const verifyUrl = `${env.APP_URL.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(token)}`;
  try {
    await transporter.sendMail({
      from: env.SMTP_FROM,
      to,
      subject: VERIFY_EMAIL_SUBJECT,
      text: VERIFY_EMAIL_TEXT(verifyUrl),
      html: VERIFY_EMAIL_HTML(verifyUrl),
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    console.error("[EMAIL] Send error:", err);
    return { ok: false, error: message };
  }
}
