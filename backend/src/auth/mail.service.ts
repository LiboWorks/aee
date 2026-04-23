import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>('SMTP_PORT', 587),
        secure: this.config.get<number>('SMTP_PORT', 587) === 465,
        auth: {
          user: this.config.get<string>('SMTP_USER'),
          pass: this.config.get<string>('SMTP_PASS'),
        },
      });
    } else {
      // Dev fallback: log emails to console instead of sending
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
      this.logger.warn('No SMTP_HOST configured — emails will be logged to console');
    }
  }

  async sendActivationEmail(to: string, token: string): Promise<void> {
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const activationLink = `${frontendUrl}/activate?token=${token}`;
    const from = this.config.get<string>('SMTP_FROM', 'AEE <noreply@aee.local>');

    const mailOptions: nodemailer.SendMailOptions = {
      from,
      to,
      subject: 'Activate your AEE account',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Welcome to AEE!</h2>
          <p>Click the button below to activate your account. This link expires in 24 hours.</p>
          <a href="${activationLink}"
             style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: #fff;
                    text-decoration: none; border-radius: 8px; font-weight: 600;">
            Activate Account
          </a>
          <p style="margin-top: 16px; font-size: 13px; color: #666;">
            Or copy this link: <br/>${activationLink}
          </p>
        </div>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      if (!this.config.get<string>('SMTP_HOST')) {
        // Dev mode: log the email content so the activation link is visible
        const parsed = JSON.parse(info.message);
        this.logger.log(`[DEV EMAIL] To: ${parsed.to} | Subject: ${parsed.subject}`);
        this.logger.log(`[DEV EMAIL] Activation link: ${activationLink}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send activation email to ${to}: ${message}`);
    }
  }
}
