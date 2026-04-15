import nodemailer from 'nodemailer';
import env from '../config/env.js';

let transporter = null;

/**
 * Initialise the email transporter.
 * In development, uses Ethereal (fake SMTP that catches all emails).
 * In production, use real SMTP credentials from env vars.
 */
async function getTransporter() {
  if (transporter) return transporter;

  if (env.NODE_ENV === 'production' && process.env.SMTP_HOST) {
    // Production: real SMTP
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Development: Ethereal (catches all emails in a test inbox)
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log(`📧 Ethereal email account: ${testAccount.user}`);
    console.log(`   View sent emails at: https://ethereal.email/login`);
  }

  return transporter;
}

/**
 * Send a booking confirmation email to the invitee.
 */
export async function sendBookingConfirmation(booking) {
  try {
    const transport = await getTransporter();

    const info = await transport.sendMail({
      from: '"Calendly Clone" <noreply@calendlyclone.com>',
      to: booking.inviteeEmail,
      subject: `Booking Confirmed: ${booking.eventType?.title || 'Meeting'}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #006BFF; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 20px;">✅ Booking Confirmed</h1>
          </div>
          <div style="border: 1px solid #e0e0e0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
            <p>Hi <strong>${booking.inviteeName}</strong>,</p>
            <p>Your meeting has been successfully scheduled!</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr>
                <td style="padding: 8px 0; color: #666;">Event</td>
                <td style="padding: 8px 0; font-weight: bold;">${booking.eventType?.title || 'Meeting'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Host</td>
                <td style="padding: 8px 0;">${booking.host?.name || 'Host'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Date & Time</td>
                <td style="padding: 8px 0;">${new Date(booking.startAt).toUTCString()}</td>
              </tr>
              ${booking.meetingLink ? `
              <tr>
                <td style="padding: 8px 0; color: #666;">Meeting Link</td>
                <td style="padding: 8px 0;"><a href="${booking.meetingLink}">${booking.meetingLink}</a></td>
              </tr>` : ''}
            </table>
            <p style="color: #888; font-size: 13px;">This is an automated message from Calendly Clone.</p>
          </div>
        </div>
      `,
    });

    // In dev mode, log the Ethereal preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`📧 Email preview: ${previewUrl}`);
    }

    return info;
  } catch (err) {
    // Email failures shouldn't break the booking flow
    console.error('⚠️  Email send failed (non-blocking):', err.message);
    return null;
  }
}

/**
 * Send a cancellation email to the invitee.
 */
export async function sendCancellationEmail(booking) {
  try {
    const transport = await getTransporter();

    const info = await transport.sendMail({
      from: '"Calendly Clone" <noreply@calendlyclone.com>',
      to: booking.inviteeEmail,
      subject: `Meeting Cancelled: ${booking.eventType?.title || 'Meeting'}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #e53e3e; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 20px;">❌ Meeting Cancelled</h1>
          </div>
          <div style="border: 1px solid #e0e0e0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
            <p>Hi <strong>${booking.inviteeName}</strong>,</p>
            <p>Your meeting has been cancelled.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr>
                <td style="padding: 8px 0; color: #666;">Event</td>
                <td style="padding: 8px 0;">${booking.eventType?.title || 'Meeting'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Original Time</td>
                <td style="padding: 8px 0;">${new Date(booking.startAt).toUTCString()}</td>
              </tr>
            </table>
            <p style="color: #888; font-size: 13px;">This is an automated message from Calendly Clone.</p>
          </div>
        </div>
      `,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`📧 Email preview: ${previewUrl}`);
    }

    return info;
  } catch (err) {
    console.error('⚠️  Email send failed (non-blocking):', err.message);
    return null;
  }
}
