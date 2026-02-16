import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@orukesledger.com';
const APP_NAME = 'Orukes Ledger';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
  if (!resend) {
    console.log('Email service not configured. Would send:', { to, subject });
    return true; // Return true in development without email configured
  }

  try {
    await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

// Email templates
const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${APP_NAME}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      margin: 0;
      padding: 0;
      background-color: #f9fafb;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #059669;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 20px;
      margin: 0 0 16px 0;
    }
    p {
      margin: 0 0 16px 0;
      color: #4b5563;
    }
    .button {
      display: inline-block;
      background: linear-gradient(to right, #059669, #10b981);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
      margin: 16px 0;
    }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
    }
    .code {
      background: #f3f4f6;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 18px;
      letter-spacing: 2px;
      text-align: center;
      margin: 16px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">₦ Orukes Ledger</div>
      ${content}
      <div class="footer">
        <p>This email was sent by ${APP_NAME}. If you didn't expect this email, you can safely ignore it.</p>
        <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  const html = baseTemplate(`
    <h1>Welcome to Orukes Ledger, ${name}! 🎉</h1>
    <p>Thank you for signing up. We're excited to help you manage your business finances with ease.</p>
    <p>Here's what you can do next:</p>
    <ul>
      <li>Create your first business workspace</li>
      <li>Add your income and expense categories</li>
      <li>Set up budgets to track spending</li>
      <li>Invite your team members</li>
    </ul>
    <a href="${APP_URL}/app" class="button">Go to Dashboard</a>
    <p>If you have any questions, reply to this email and we'll be happy to help!</p>
  `);

  return sendEmail({
    to: email,
    subject: `Welcome to ${APP_NAME}! 🎉`,
    html,
  });
}

export async function sendInviteEmail(
  email: string,
  inviterName: string,
  businessName: string,
  role: string,
  inviteToken: string
): Promise<boolean> {
  const inviteUrl = `${APP_URL}/invite/${inviteToken}`;
  
  const html = baseTemplate(`
    <h1>You've been invited to join ${businessName}</h1>
    <p>${inviterName} has invited you to join their business on Orukes Ledger as a <strong>${role}</strong>.</p>
    <p>Orukes Ledger is a simple and powerful tool for tracking income, expenses, and budgets.</p>
    <a href="${inviteUrl}" class="button">Accept Invitation</a>
    <p style="font-size: 14px; color: #6b7280;">This invitation will expire in 7 days.</p>
  `);

  return sendEmail({
    to: email,
    subject: `You're invited to join ${businessName} on ${APP_NAME}`,
    html,
  });
}

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
  const resetUrl = `${APP_URL}/auth/reset-password?token=${resetToken}`;
  
  const html = baseTemplate(`
    <h1>Reset Your Password</h1>
    <p>We received a request to reset your password. Click the button below to create a new password:</p>
    <a href="${resetUrl}" class="button">Reset Password</a>
    <p style="font-size: 14px; color: #6b7280;">This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
  `);

  return sendEmail({
    to: email,
    subject: `Reset your ${APP_NAME} password`,
    html,
  });
}

export async function sendBudgetAlertEmail(
  email: string,
  businessName: string,
  categoryName: string,
  percentUsed: number,
  budgetAmount: number,
  spentAmount: number,
  currency: string
): Promise<boolean> {
  const formatAmount = (amount: number) => {
    const symbols: Record<string, string> = { NGN: '₦', USD: '$', GBP: '£', EUR: '€' };
    return `${symbols[currency] || currency}${amount.toLocaleString()}`;
  };

  const html = baseTemplate(`
    <h1>⚠️ Budget Alert for ${businessName}</h1>
    <p>You've used <strong>${percentUsed}%</strong> of your ${categoryName} budget.</p>
    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0; color: #92400e;">
        <strong>Budget:</strong> ${formatAmount(budgetAmount)}<br>
        <strong>Spent:</strong> ${formatAmount(spentAmount)}<br>
        <strong>Remaining:</strong> ${formatAmount(budgetAmount - spentAmount)}
      </p>
    </div>
    <a href="${APP_URL}/app/budgets" class="button">View Budgets</a>
    <p style="font-size: 14px; color: #6b7280;">You can adjust your budget alert thresholds in Settings.</p>
  `);

  return sendEmail({
    to: email,
    subject: `⚠️ Budget Alert: ${percentUsed}% of ${categoryName} budget used`,
    html,
  });
}

export async function sendTransactionApprovalEmail(
  email: string,
  businessName: string,
  transactionType: string,
  amount: number,
  category: string,
  submittedBy: string,
  currency: string
): Promise<boolean> {
  const symbols: Record<string, string> = { NGN: '₦', USD: '$', GBP: '£', EUR: '€' };
  const formattedAmount = `${symbols[currency] || currency}${amount.toLocaleString()}`;

  const html = baseTemplate(`
    <h1>Transaction Pending Approval</h1>
    <p>A new ${transactionType.toLowerCase()} transaction requires your approval for ${businessName}.</p>
    <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0;">
        <strong>Type:</strong> ${transactionType}<br>
        <strong>Amount:</strong> ${formattedAmount}<br>
        <strong>Category:</strong> ${category}<br>
        <strong>Submitted by:</strong> ${submittedBy}
      </p>
    </div>
    <a href="${APP_URL}/app/transactions?status=pending" class="button">Review Transaction</a>
  `);

  return sendEmail({
    to: email,
    subject: `[${businessName}] Transaction awaiting approval - ${formattedAmount}`,
    html,
  });
}

// Generate WhatsApp message for budget alerts
export function generateWhatsAppBudgetAlert(
  businessName: string,
  categoryName: string,
  percentUsed: number,
  budgetAmount: number,
  spentAmount: number,
  currency: string
): string {
  const symbols: Record<string, string> = { NGN: '₦', USD: '$', GBP: '£', EUR: '€' };
  const symbol = symbols[currency] || currency;

  return `⚠️ *Budget Alert - ${businessName}*

You've used *${percentUsed}%* of your ${categoryName} budget.

💰 Budget: ${symbol}${budgetAmount.toLocaleString()}
💸 Spent: ${symbol}${spentAmount.toLocaleString()}
📊 Remaining: ${symbol}${(budgetAmount - spentAmount).toLocaleString()}

Review your budget on Orukes Ledger: ${APP_URL}/app/budgets`;
}
