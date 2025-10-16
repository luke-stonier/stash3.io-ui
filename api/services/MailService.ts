import nodemailer from "nodemailer";
import StatusResponse from "../data/StatusResponse";
import {ValidationHelper} from "../helpers/validationHelper";

export enum MailMessageType {
    TEST = "TEST",
    WELCOME = "WELCOME",
    PASSWORD_RESET = "PASSWORD_RESET",
    PASSWORD_CHANGED = "PASSWORD_CHANGED",
}

export interface MailReplacements {
    key: string;
    value: string;
}

export interface MailTemplate {
    subject: string;
    text: string;
    html: string;
}


const OUTGOING_EMAIL = "info@stash3.io";
const OUTGOING_NAME = "Stash3.IO";
const SMTP = "send.one.com";
const SMTP_PORT = 465;

export default class MailService {
    private transporter: any = null;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: SMTP,
            port: SMTP_PORT,
            secure: true,
            auth: {
                user: OUTGOING_EMAIL,
                pass: process.env.EMAIL_PASSWORD,
            },
            tls: {
                rejectUnauthorized: false,
            },
        });
    }

    private async GetEmailTemplate(template: MailMessageType, replacements?: MailReplacements[]): Promise<MailTemplate | null> {
        try {
            const originalTemplate = new MAIL_TEMPLATES()[template] as MailTemplate;
            const JSON_TEMPLATE: MailTemplate = {
                subject: originalTemplate.subject,
                text: originalTemplate.text,
                html: originalTemplate.html,
            };

            if (replacements !== undefined) {
                replacements.forEach((rep: MailReplacements) => {
                    const textValue = rep.value;
                    const htmlValue = textValue
                        .replace(/\r?\n/g, "<br />")
                        .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank">$1</a>'); // wrap links in <a>

                    JSON_TEMPLATE.subject = JSON_TEMPLATE.subject.replace(rep.key, textValue);
                    JSON_TEMPLATE.text = JSON_TEMPLATE.text.replace(rep.key, textValue);
                    JSON_TEMPLATE.html = JSON_TEMPLATE.html.replace(rep.key, htmlValue);
                });
            }

            return JSON_TEMPLATE;
        } catch (exception: any) {
            console.error("FAILED TO FETCH TEMPLATE", template);
            return null;
        }
    }

    public async SendEmail(email: string, template: MailMessageType, replacements: MailReplacements[] = []): Promise<void> {
        try {
            if (email === "" || email === null) return;

            // validate email
            var errorResp = new StatusResponse(false, null);
            errorResp = ValidationHelper.ValidateEmail(email, errorResp);
            if (errorResp.fixes.length > 0) return;

            const mailTemplate = await this.GetEmailTemplate(template, replacements);
            if (mailTemplate == null) return; // error logged above
            const info = await this.transporter.sendMail({
                from: `"${OUTGOING_NAME}" <${OUTGOING_EMAIL}>`,
                to: email,
                bcc: `${OUTGOING_EMAIL}`,
                subject: mailTemplate.subject,
                text: mailTemplate.text,
                html: mailTemplate.html,
            });
            console.log("SENT EMAIL:", info.response);
        } catch (exception: any) {
            console.log("ERROR", exception);
        }
    }
}

function buildEmailTemplate(body: string, title = "Stash3", includeLogo = true): string {
    const currentYear = new Date().getFullYear();

    return `
    <div style="font-family:Inter,system-ui,Segoe UI,Roboto,Arial,sans-serif;line-height:1.55;color:#0b0e14;background-color:#f9fafb;padding:24px;">
      <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:10px;box-shadow:0 2px 6px rgba(0,0,0,0.05);padding:32px;">
        <div style="text-align:center;margin-bottom:24px;">
          ${
        includeLogo
            ? `<img src="https://stash3.io/assets/stash3_logo.png" alt="Stash3 Logo" style="height:48px;margin-bottom:12px;" />`
            : ""
    }
          <h1 style="margin:0;font-size:24px;color:#0b0e14;">${title}</h1>
        </div>

        ${body}

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />

        <p style="font-size:14px;color:#6b7280;margin:0;text-align:center;">
          © ${currentYear} Stash3.io - Secure S3 Management Simplified
        </p>
      </div>
    </div>
  `;
}

export class MAIL_TEMPLATES {
    TEST: MailTemplate = {
        "subject": "API STARTUP TEST",
        "text": "TEST TO SEE MAIL IS SENDING",
        "html": buildEmailTemplate("<p>TEST TO SEE MAIL IS SENDING</p>")
    };
    WELCOME: MailTemplate = {
        subject: "Welcome to Stash3 - Your secure cloud begins here",
        text:
            "Welcome to Stash3!\n\n" +
            "Your account ({{EMAIL}}) has been created successfully.\n\n" +
            "You can now sign in to Stash3 and start managing your data securely.\n\n" +
            "Here are a few things you can do:\n" +
            "• Upload and organize your files in S3 buckets.\n" +
            "• Upload, preview, share objects.\n" + 
            "• Bookmark your most used buckets and objects.\n" +
            "If you didn’t create this account, please email us to rectify.\n\n" +
            "- The Stash3 Team",
        html: buildEmailTemplate(`<p style="margin:0 0 16px;">Hi there,</p>
          <p style="margin:0 0 16px;">
            Your account (<strong>{{EMAIL}}</strong>) has been created successfully - we’re thrilled to have you on board!
          </p>

          <p style="margin:0 0 16px;">With Stash3, you can:</p>
          <ul style="margin:0 0 16px;padding-left:20px;color:#1f2937;">
            <li>Manage and organize your S3 storage effortlessly.</li>
            <li>Upload, preview, share objects.</li>
            <li>Bookmark frequently accessed buckets and objects.</li>
          </ul>

          <p style="margin:0 0 16px;">If you didn’t create this account, please email us to rectify.</p>`)
    };
    PASSWORD_RESET: MailTemplate = {
        subject: "Reset your Stash3 password",
        text:
            "We received a request to reset the password for your Stash3 account.\n\n" +
            "To choose a new password, open stash3 and head to the reset password page (forgot password -> reset password):\n" +
            "enter the code: {{CODE}} and your new password\n\n" +
            "This link expires in {{TTL_MINUTES}} minutes. If you didn’t request this, you can safely ignore this email.",
        html: buildEmailTemplate(
            `<p style="margin:0 0 12px;">We received a request to reset the password for your Stash3 account.</p>
         <p style="margin:0 0 12px;">To choose a new password, open stash3 and head to the reset password page (forgot password -> reset password):</p>
         <p style="margin:0 0 16px;">
         enter the code: {{CODE}} and your new password
         </p>
         <p style="margin:0 0 12px;">This link expires in <strong>{{TTL_MINUTES}}</strong> minutes.</p>
         <p style="color:#6b7280;margin:0;">If you didn’t request this, you can safely ignore this email.</p>`, 'Reset your Stash3 password')
    };
    PASSWORD_CHANGED: MailTemplate = {
        subject: "Your Stash3 password was changed",
        text:
            "This is a confirmation that your Stash3 account password was changed.\n\n" +
            "If this wasn’t you, please reset your password immediately:\n" +
            "{{RESET_URL}}\n\n" +
            "Need help? Contact support: {{SUPPORT_URL}}",
        html:
            buildEmailTemplate(`
         <p style="margin:0 0 12px;">This is a confirmation that your Stash3 account password was changed.</p>
         <p style="margin:0 0 12px;">If this wasn’t you, reset your password immediately:</p>
         <p style="margin:0 0 12px;">Support: {{SUPPORT_URL}}</p>
         <p style="color:#6b7280;margin:0;">If you made this change, you can ignore this email.</p>`, 'Your Stash3 password was changed')
    };
}