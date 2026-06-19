const nodemailer = require('nodemailer');
const logger = require('../../utils/logger');

const createTransporter = () =>
  nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });

const BASE_STYLE = `
  font-family: 'Segoe UI', system-ui, sans-serif;
  background: #04050a; color: #e8eaf6; max-width: 600px; margin: 0 auto; border-radius: 16px;
  border: 1px solid rgba(59,123,255,0.15); overflow: hidden;
`;
const HEADER = `
  <div style="background: linear-gradient(135deg,#3b7bff,#7c3aed); padding: 32px 40px; text-align: center;">
    <h1 style="margin:0; font-size:24px; font-weight:800; color:#fff; letter-spacing:-0.02em;">
      ZENTROX<span style="color:#06d6a0;">.</span>
    </h1>
    <p style="margin:6px 0 0; font-size:12px; color:rgba(255,255,255,0.7); text-transform:uppercase; letter-spacing:0.1em;">
      Zentrox Technologies
    </p>
  </div>
`;
const FOOTER = `
  <div style="background:#080c15; padding:24px 40px; text-align:center; border-top:1px solid rgba(59,123,255,0.1);">
    <p style="margin:0; font-size:12px; color:#8892b0;">
      © ${new Date().getFullYear()} Zentrox Technologies · MSME Registered · Mohali & Chandigarh<br/>
      <a href="mailto:contact.zentroxtech@gmail.com" style="color:#3b7bff; text-decoration:none;">contact.zentroxtech@gmail.com</a>
      · +91 89881 83513
    </p>
  </div>
`;

const wrapHtml = (bodyContent) => `
<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:20px;background:#020408;">
  <div style="${BASE_STYLE}">
    ${HEADER}
    <div style="padding:32px 40px;">${bodyContent}</div>
    ${FOOTER}
  </div>
</body></html>`;

const sendMail = async ({ to, subject, html, text }) => {
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"Zentrox Technologies" <${process.env.GMAIL_USER}>`,
      to, subject, html, text,
    });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    logger.error('Email send failed:', err.message);
    return { success: false, error: err.message };
  }
};

// ─── TEMPLATES ───────────────────────────────────────────────────────────────

const sendWelcomeEmail = (user) => sendMail({
  to: user.email,
  subject: 'Welcome to Zentrox Technologies',
  html: wrapHtml(`
    <h2 style="color:#fff;font-weight:700;margin:0 0 8px;">Welcome, ${user.name}!</h2>
    <p style="color:#8892b0;line-height:1.7;margin:0 0 20px;">
      Your account has been created at <strong style="color:#3b7bff;">Zentrox Technologies</strong>.
      You can now enroll in courses, apply for internships, and track your progress.
    </p>
    <a href="${process.env.FRONTEND_URL}/dashboard" 
       style="display:inline-block;padding:13px 28px;background:#3b7bff;color:#fff;border-radius:50px;font-weight:600;text-decoration:none;font-size:14px;">
      Go to Dashboard →
    </a>
  `),
});

const sendLeadNotification = (lead) => sendMail({
  to: process.env.GMAIL_USER,
  subject: `New Lead: ${lead.name} — ${lead.service || 'Website Inquiry'}`,
  html: wrapHtml(`
    <h2 style="color:#fff;font-weight:700;margin:0 0 16px;">New Lead Received</h2>
    ${[
      ['Name', lead.name], ['Phone', lead.phone], ['Email', lead.email || '—'],
      ['Service', lead.service || '—'], ['Budget', lead.budget || '—'],
      ['Message', lead.message || '—'], ['City', lead.city || '—'],
      ['Source', lead.source || 'Website'],
    ].map(([k, v]) => `
      <div style="margin-bottom:10px;padding:10px 14px;background:#0d1220;border-radius:8px;border-left:3px solid #3b7bff;">
        <span style="font-size:11px;color:#8892b0;text-transform:uppercase;letter-spacing:.05em;">${k}</span>
        <div style="color:#fff;font-size:14px;margin-top:3px;">${v}</div>
      </div>
    `).join('')}
    <a href="${process.env.FRONTEND_URL}/admin/leads"
       style="display:inline-block;margin-top:16px;padding:12px 24px;background:#3b7bff;color:#fff;border-radius:50px;font-weight:600;text-decoration:none;font-size:13px;">
      View in Admin Panel →
    </a>
  `),
});

const sendLeadAutoReply = (lead) => sendMail({
  to: lead.email,
  subject: 'We received your inquiry — Zentrox Technologies',
  html: wrapHtml(`
    <h2 style="color:#fff;font-weight:700;margin:0 0 8px;">Thank you, ${lead.name}!</h2>
    <p style="color:#8892b0;line-height:1.7;margin:0 0 16px;">
      We've received your inquiry about <strong style="color:#fff;">${lead.service || 'our services'}</strong>.
      Our team will contact you within <strong style="color:#3b7bff;">24 hours</strong>.
    </p>
    <p style="color:#8892b0;line-height:1.7;margin:0 0 20px;">
      For urgent matters, WhatsApp us at <strong style="color:#06d6a0;">+91 89881 83513</strong>.
    </p>
    <a href="${process.env.FRONTEND_URL}/contact"
       style="display:inline-block;padding:13px 28px;background:#3b7bff;color:#fff;border-radius:50px;font-weight:600;text-decoration:none;font-size:14px;">
      Visit Our Website →
    </a>
  `),
});

const sendCertificateEmail = (user, cert, pdfBuffer) => sendMail({
  to: user.email,
  subject: `Your Certificate — ${cert.courseName || 'Zentrox Technologies'}`,
  html: wrapHtml(`
    <h2 style="color:#fff;font-weight:700;margin:0 0 8px;">Congratulations, ${user.name}!</h2>
    <p style="color:#8892b0;line-height:1.7;margin:0 0 16px;">
      Your certificate for <strong style="color:#fff;">${cert.courseName || 'your course'}</strong> is ready.
      Certificate ID: <code style="color:#06d6a0;">${cert.certificateId}</code>
    </p>
    <a href="${process.env.FRONTEND_URL}/verify/${cert.certificateId}"
       style="display:inline-block;padding:13px 28px;background:#3b7bff;color:#fff;border-radius:50px;font-weight:600;text-decoration:none;font-size:14px;">
      Verify Certificate →
    </a>
    <p style="color:#8892b0;font-size:12px;margin-top:20px;">Your certificate PDF is attached to this email.</p>
  `),
});

const sendInternshipOfferLetter = (user, application, internship) => sendMail({
  to: user.email,
  subject: `Offer Letter — ${internship.title} — Zentrox Technologies`,
  html: wrapHtml(`
    <h2 style="color:#fff;font-weight:700;margin:0 0 8px;">Congratulations, ${user.name}!</h2>
    <p style="color:#8892b0;line-height:1.7;margin:0 0 16px;">
      You have been selected for the <strong style="color:#fff;">${internship.title}</strong> internship at Zentrox Technologies.
    </p>
    <div style="background:#0d1220;border-radius:12px;padding:20px;border:1px solid rgba(59,123,255,0.2);margin-bottom:20px;">
      <div style="color:#8892b0;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Internship Details</div>
      <div style="color:#fff;font-size:15px;font-weight:600;margin-top:6px;">${internship.title}</div>
      <div style="color:#8892b0;font-size:13px;margin-top:4px;">Duration: ${internship.duration} · Type: Remote</div>
    </div>
    <a href="${process.env.FRONTEND_URL}/dashboard/internship"
       style="display:inline-block;padding:13px 28px;background:#3b7bff;color:#fff;border-radius:50px;font-weight:600;text-decoration:none;font-size:14px;">
      View Internship Dashboard →
    </a>
  `),
});

const sendPasswordReset = (user, resetUrl) => sendMail({
  to: user.email,
  subject: 'Reset Your Password — Zentrox Technologies',
  html: wrapHtml(`
    <h2 style="color:#fff;font-weight:700;margin:0 0 8px;">Password Reset</h2>
    <p style="color:#8892b0;line-height:1.7;margin:0 0 16px;">
      You requested a password reset. Click the button below — this link expires in 15 minutes.
    </p>
    <a href="${resetUrl}"
       style="display:inline-block;padding:13px 28px;background:#3b7bff;color:#fff;border-radius:50px;font-weight:600;text-decoration:none;font-size:14px;">
      Reset Password →
    </a>
    <p style="color:#8892b0;font-size:12px;margin-top:16px;">If you didn't request this, ignore this email.</p>
  `),
});

module.exports = {
  sendWelcomeEmail, sendLeadNotification, sendLeadAutoReply,
  sendCertificateEmail, sendInternshipOfferLetter, sendPasswordReset,
};
