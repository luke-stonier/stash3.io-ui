import nodemailer from "nodemailer";
import StatusResponse from "../data/StatusResponse";
import {ValidationHelper} from "../helpers/validationHelper";

export enum MailMessageType {
    TEST = "TEST",
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

export class MAIL_TEMPLATES {
    TEST: MailTemplate = {
        "subject": "API STARTUP TEST",
        "text": "TEST TO SEE MAIL IS SENDING",
        "html": "<p>TEST TO SEE MAIL IS SENDING</p>"
    };
    PASSWORD_RESET: MailTemplate = {
        subject: "Reset your Stash3 password",
        text:
            "We received a request to reset the password for your Stash3 account.\n\n" +
            "To choose a new password, open stash3 and head to the reset password page (forgot password -> reset password):\n" +
            "enter the code: {{CODE}} and your new password\n\n" +
            "This link expires in {{TTL_MINUTES}} minutes. If you didn’t request this, you can safely ignore this email.",
        html:
            `<div style="font-family:Inter,system-ui,Segoe UI,Roboto,Arial,sans-serif;line-height:1.55;color:#0b0e14">
         <h2 style="margin:0 0 10px;">Reset your Stash3 password</h2>
         <p style="margin:0 0 12px;">We received a request to reset the password for your Stash3 account.</p>
         <p style="margin:0 0 12px;">To choose a new password, open stash3 and head to the reset password page (forgot password -> reset password):</p>
         <p style="margin:0 0 16px;">
         enter the code: {{CODE}} and your new password
         </p>
         <p style="margin:0 0 12px;">This link expires in <strong>{{TTL_MINUTES}}</strong> minutes.</p>
         <p style="color:#6b7280;margin:0;">If you didn’t request this, you can safely ignore this email.</p>
       </div>`
    };
    PASSWORD_CHANGED: MailTemplate = {
        subject: "Your Stash3 password was changed",
        text:
            "This is a confirmation that your Stash3 account password was changed.\n\n" +
            "If this wasn’t you, please reset your password immediately:\n" +
            "{{RESET_URL}}\n\n" +
            "Need help? Contact support: {{SUPPORT_URL}}",
        html:
            `<div style="font-family:Inter,system-ui,Segoe UI,Roboto,Arial,sans-serif;line-height:1.55;color:#0b0e14">
         <h2 style="margin:0 0 10px;">Your password was changed</h2>
         <p style="margin:0 0 12px;">This is a confirmation that your Stash3 account password was changed.</p>
         <p style="margin:0 0 12px;">If this wasn’t you, reset your password immediately:</p>
         <p style="margin:0 0 12px;">Support: {{SUPPORT_URL}}</p>
         <p style="color:#6b7280;margin:0;">If you made this change, you can ignore this email.</p>
       </div>`
    };
}