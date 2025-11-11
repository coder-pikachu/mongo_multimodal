/**
 * Email Service
 * Handles email sending using Gmail SMTP via nodemailer
 */

import nodemailer from 'nodemailer';

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  from?: string;
  projectName?: string;
  projectDescription?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email using Gmail SMTP via nodemailer
 * @param payload - Email details
 * @returns Result with success status and message ID
 */
export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailAppPassword) {
    return {
      success: false,
      error: 'GMAIL_USER and GMAIL_APP_PASSWORD must be configured',
    };
  }

  if (!isEmailEnabled()) {
    return {
      success: false,
      error: 'Email functionality is disabled',
    };
  }

  // Validate email payload
  const validation = validateEmailPayload(payload);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
    };
  }

  try {
    // Create transporter with Gmail SMTP
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });

    // Send email
    const info = await transporter.sendMail({
      from: payload.from || gmailUser,
      to: payload.to,
      subject: payload.subject,
      text: payload.body,
      html: createBeautifulEmailHtml(payload),
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Check if email functionality is enabled
 */
export function isEmailEnabled(): boolean {
  return !!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD && process.env.EMAIL_ENABLED !== 'false';
}

/**
 * Validate email payload
 */
export function validateEmailPayload(payload: EmailPayload): { valid: boolean; error?: string } {
  // Validate email address
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(payload.to)) {
    return { valid: false, error: 'Invalid email address' };
  }

  // Validate subject
  if (!payload.subject || payload.subject.trim().length === 0) {
    return { valid: false, error: 'Email subject cannot be empty' };
  }

  if (payload.subject.length > 200) {
    return { valid: false, error: 'Email subject too long (max 200 characters)' };
  }

  // Validate body
  if (!payload.body || payload.body.trim().length === 0) {
    return { valid: false, error: 'Email body cannot be empty' };
  }

  if (payload.body.length > 50000) {
    return { valid: false, error: 'Email body too long (max 50000 characters)' };
  }

  return { valid: true };
}

/**
 * Convert markdown to HTML with better formatting
 */
function convertMarkdownToHtml(markdown: string): string {
  let html = markdown;

  // Convert code blocks first (before other conversions)
  html = html.replace(/```([^\n]*)\n([\s\S]*?)```/g, '<pre style="background: #f5f5f5; padding: 16px; border-radius: 8px; overflow-x: auto; border-left: 4px solid #00ED64;"><code>$2</code></pre>');

  // Convert markdown tables to HTML
  html = convertMarkdownTables(html);

  // Convert headers
  html = html.replace(/^### (.*$)/gim, '<h3 style="color: #116149; font-size: 18px; font-weight: 600; margin: 20px 0 10px 0;">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 style="color: #00684A; font-size: 22px; font-weight: 600; margin: 24px 0 12px 0;">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 style="color: #00684A; font-size: 28px; font-weight: 700; margin: 28px 0 16px 0;">$1</h1>');

  // Convert bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #00684A;">$1</strong>');

  // Convert italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Convert links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #13AA52; text-decoration: none; border-bottom: 1px solid #13AA52;">$1</a>');

  // Convert bullet lists
  html = html.replace(/^\* (.+)$/gim, '<li style="margin: 8px 0;">$1</li>');
  html = html.replace(/^- (.+)$/gim, '<li style="margin: 8px 0;">$1</li>');
  html = html.replace(/(<li[^>]*>.*<\/li>)/s, '<ul style="margin: 16px 0; padding-left: 24px;">$1</ul>');

  // Convert numbered lists
  html = html.replace(/^\d+\. (.+)$/gim, '<li style="margin: 8px 0;">$1</li>');

  // Convert line breaks and paragraphs
  html = html.replace(/\n\n/g, '</p><p style="margin: 16px 0; line-height: 1.6;">');
  html = html.replace(/\n/g, '<br>');

  // Wrap in paragraph tags if not already wrapped
  if (!html.startsWith('<')) {
    html = '<p style="margin: 16px 0; line-height: 1.6;">' + html + '</p>';
  }

  return html;
}

/**
 * Convert markdown tables to HTML tables with beautiful styling
 */
function convertMarkdownTables(markdown: string): string {
  // Match markdown tables
  const tableRegex = /(?:^|\n)((?:\|[^\n]+\|\n)+)/gm;

  return markdown.replace(tableRegex, (match) => {
    const lines = match.trim().split('\n');
    if (lines.length < 2) return match;

    // Parse header row
    const headerCells = lines[0]
      .split('|')
      .filter(cell => cell.trim())
      .map(cell => cell.trim());

    // Skip separator row (the one with dashes)
    // Parse data rows
    const dataRows = lines.slice(2).map(line =>
      line
        .split('|')
        .filter(cell => cell.trim())
        .map(cell => cell.trim())
    );

    // Generate HTML table
    let tableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: linear-gradient(135deg, #00ED64 0%, #13AA52 100%);">
            ${headerCells.map(cell => `
              <th style="padding: 12px 16px; text-align: left; color: #ffffff; font-weight: 600; border-bottom: 2px solid #00684A;">
                ${cell}
              </th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          ${dataRows.map((row, idx) => `
            <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8f9fa'}; border-bottom: 1px solid #e5e7eb;">
              ${row.map(cell => `
                <td style="padding: 12px 16px; color: #333333; border-right: 1px solid #e5e7eb;">
                  ${cell}
                </td>
              `).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    return tableHtml;
  });
}

/**
 * Create a beautiful HTML email with MongoDB branding and project context
 */
function createBeautifulEmailHtml(payload: EmailPayload): string {
  const contentHtml = convertMarkdownToHtml(payload.body);
  const currentYear = new Date().getFullYear();

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${payload.subject}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <!-- Email Container -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
          <tr>
            <td align="center">
              <!-- Main Content -->
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

                <!-- Header with MongoDB Branding -->
                <tr>
                  <td style="background: linear-gradient(135deg, #00ED64 0%, #13AA52 100%); padding: 32px 40px; text-align: center;">
                    <div style="display: inline-block; background-color: #ffffff; padding: 12px 24px; border-radius: 8px; margin-bottom: 16px;">
                      <h1 style="margin: 0; color: #00684A; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                        🤖 MongoDB AI Agent Space
                      </h1>
                    </div>
                    ${payload.projectName ? `
                      <h2 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">
                        ${payload.projectName}
                      </h2>
                    ` : ''}
                    ${payload.projectDescription ? `
                      <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
                        ${payload.projectDescription}
                      </p>
                    ` : ''}
                  </td>
                </tr>

                <!-- Content Body -->
                <tr>
                  <td style="padding: 40px;">
                    <div style="color: #333333; font-size: 15px; line-height: 1.6;">
                      ${contentHtml}
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8f9fa; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="text-align: center;">
                          <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px;">
                            Generated by AI Agent • Powered by MongoDB Atlas Vector Search
                          </p>
                          <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                            © ${currentYear} Vector Search Platform. All rights reserved.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

/**
 * Create a confirmation prompt for email sending
 */
export function createEmailConfirmationPrompt(payload: EmailPayload): string {
  const bodyPreview = payload.body.substring(0, 300);
  const isTruncated = payload.body.length > 300;

  return `
📧 **Email Ready to Send**
${payload.projectName ? `\n**Project:** ${payload.projectName}` : ''}

**To:** ${payload.to}
**Subject:** ${payload.subject}

**Content Preview:**
${bodyPreview}${isTruncated ? '...\n\n_(Content truncated for preview)_' : ''}

---

The email will be sent with:
✨ Beautiful HTML formatting with MongoDB branding
📱 Mobile-responsive design
🎨 Project context in the header

Reply **'yes'** to send this email, or **'no'** to cancel.
  `.trim();
}
