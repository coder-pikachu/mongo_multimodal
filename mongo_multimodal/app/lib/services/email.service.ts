/**
 * Email Service
 * Handles email sending using Resend API
 */

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  from?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email using Resend API
 * @param payload - Email details
 * @returns Result with success status and message ID
 */
export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const apiKey = process.env.EMAIL_API_KEY;
  const defaultFrom = process.env.EMAIL_FROM || 'noreply@example.com';

  if (!apiKey) {
    return {
      success: false,
      error: 'EMAIL_API_KEY is not configured',
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
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: payload.from || defaultFrom,
        to: [payload.to],
        subject: payload.subject,
        html: convertMarkdownToHtml(payload.body),
        text: payload.body, // Include plain text version
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return {
        success: false,
        error: `Email API error (${response.status}): ${errorData.error || errorData.message || 'Unknown error'}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      messageId: data.id,
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
  return !!process.env.EMAIL_API_KEY && process.env.EMAIL_ENABLED !== 'false';
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
 * Convert simple markdown to HTML for email
 * This is a basic converter - for production use a proper markdown library
 */
function convertMarkdownToHtml(markdown: string): string {
  let html = markdown;

  // Convert headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Convert bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Convert italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Convert links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Convert line breaks
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');

  // Wrap in paragraph tags
  html = '<p>' + html + '</p>';

  // Add basic styling
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          h1 { color: #2563eb; }
          h2 { color: #1e40af; }
          h3 { color: #1e3a8a; }
          a { color: #2563eb; }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;
}

/**
 * Create a confirmation prompt for email sending
 */
export function createEmailConfirmationPrompt(payload: EmailPayload): string {
  return `
I need your confirmation to send an email:

**To:** ${payload.to}
**Subject:** ${payload.subject}
**Body Preview:**
${payload.body.substring(0, 200)}${payload.body.length > 200 ? '...' : ''}

Reply 'yes' to send this email, or 'no' to cancel.
  `.trim();
}
