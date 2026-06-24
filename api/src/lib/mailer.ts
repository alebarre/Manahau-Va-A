import nodemailer from 'nodemailer'
import path from 'path'
import { env } from '../config/env'

export const mailer = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
})

const LOGO_PATH = path.join(__dirname, '../assets/logo.png')

function emailTemplate(opts: {
  title: string
  intro: string
  code: string
  expiryText: string
  outro: string
}): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f4f4f4;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:480px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.10);">

          <!-- Header -->
          <tr>
            <td align="center" style="background:#F47B1A;padding:36px 32px 28px;">
              <img src="cid:logo" alt="Manahau Va'A" width="80" height="80"
                style="display:block;margin:0 auto 14px;border-radius:50%;background:rgba(255,255,255,0.20);padding:6px;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:800;letter-spacing:-0.3px;line-height:1.2;">
                Manahau Va'A
              </h1>
              <p style="color:rgba(255,255,255,0.80);margin:6px 0 0;font-size:13px;">
                Clube de Canoa Havaiana · Itaipu, Niterói/RJ
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 36px 20px;">
              <h2 style="color:#1A1A1A;margin:0 0 14px;font-size:20px;font-weight:700;">${opts.title}</h2>
              <p style="color:#555555;margin:0 0 32px;font-size:15px;line-height:1.65;">${opts.intro}</p>

              <!-- Code box -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;">
                <tr>
                  <td align="center" style="background:#FFF4E8;border:2px dashed #F47B1A;border-radius:14px;padding:28px 20px;">
                    <p style="color:#F47B1A;margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">
                      Seu código de verificação
                    </p>
                    <p style="color:#1A1A1A;font-size:44px;font-weight:900;margin:0;letter-spacing:14px;
                              font-family:'Courier New',Courier,monospace;line-height:1;">
                      ${opts.code}
                    </p>
                    <p style="color:#999999;font-size:12px;margin:12px 0 0;">${opts.expiryText}</p>
                  </td>
                </tr>
              </table>

              <p style="color:#888888;font-size:13px;margin:0;line-height:1.6;">${opts.outro}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#fafafa;border-top:1px solid #eeeeee;padding:18px 36px;text-align:center;">
              <p style="color:#bbbbbb;font-size:11px;margin:0;line-height:1.7;">
                Manahau Va'A · Praia de Itaipu, Niterói/RJ<br>
                Este email foi gerado automaticamente. Por favor, não responda.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

const logoAttachment = {
  filename: 'logo.png',
  path: LOGO_PATH,
  cid: 'logo',
}

export async function sendEmailVerification(to: string, name: string, code: string) {
  const firstName = name.split(' ')[0]
  await mailer.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: "Manahau Va'A — Confirme seu email",
    html: emailTemplate({
      title: `Bem-vindo, ${firstName}!`,
      intro: `Sua conta no Manahau Va'A foi criada com sucesso. Use o código abaixo no app para ativar seu acesso:`,
      code,
      expiryText: 'Este código não expira e é válido para uma única utilização.',
      outro: 'Se você não criou esta conta, ignore este email com segurança.',
    }),
    attachments: [logoAttachment],
  })
}

export async function sendPasswordResetEmail(to: string, name: string, code: string) {
  const firstName = name.split(' ')[0]
  await mailer.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: "Manahau Va'A — Redefinição de senha",
    html: emailTemplate({
      title: `Redefinir senha, ${firstName}`,
      intro: `Recebemos uma solicitação para redefinir a senha da sua conta. Use o código abaixo no app para criar uma nova senha:`,
      code,
      expiryText: 'Este código expira em 15 minutos.',
      outro: 'Se você não solicitou a redefinição de senha, ignore este email. Sua senha permanece a mesma.',
    }),
    attachments: [logoAttachment],
  })
}
