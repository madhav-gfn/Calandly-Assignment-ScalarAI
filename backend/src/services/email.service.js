import nodemailer from 'nodemailer';
import env from '../config/env.js';
import logger from '../utils/logger.js';

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

    logger.info('Booking confirmation email sent', {
      bookingId: booking.id,
      inviteeEmail: booking.inviteeEmail,
      previewUrl,
    });

    return info;
  } catch (err) {
    // Email failures shouldn't break the booking flow
    logger.error('Email send failed (non-blocking)', {
      bookingId: booking.id,
      inviteeEmail: booking.inviteeEmail,
      error: err.message,
      stack: err.stack,
    });
    return null;
  }
}

/**
 * Send a reschedule notification email to the invitee.
 */
export async function sendRescheduleEmail(newBooking, originalBooking) {
  try {
    const transport = await getTransporter();

    const info = await transport.sendMail({
      from: '"Calendly Clone" <noreply@calendlyclone.com>',
      to: newBooking.inviteeEmail,
      subject: `Meeting Rescheduled: ${newBooking.eventType?.title || 'Meeting'}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #F59E0B; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 20px;">🔄 Meeting Rescheduled</h1>
          </div>
          <div style="border: 1px solid #e0e0e0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
            <p>Hi <strong>${newBooking.inviteeName}</strong>,</p>
            <p>Your meeting has been rescheduled to a new time.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr>
                <td style="padding: 8px 0; color: #666;">Event</td>
                <td style="padding: 8px 0; font-weight: bold;">${newBooking.eventType?.title || 'Meeting'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Host</td>
                <td style="padding: 8px 0;">${newBooking.host?.name || 'Host'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Previous Time</td>
                <td style="padding: 8px 0; text-decoration: line-through; color: #999;">${new Date(originalBooking.startAt).toUTCString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">New Time</td>
                <td style="padding: 8px 0; font-weight: bold; color: #F59E0B;">${new Date(newBooking.startAt).toUTCString()}</td>
              </tr>
              ${newBooking.meetingLink ? `
              <tr>
                <td style="padding: 8px 0; color: #666;">Meeting Link</td>
                <td style="padding: 8px 0;"><a href="${newBooking.meetingLink}">${newBooking.meetingLink}</a></td>
              </tr>` : ''}
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

    logger.info('Reschedule email sent', {
      bookingId: newBooking.id,
      originalBookingId: originalBooking.id,
      inviteeEmail: newBooking.inviteeEmail,
      previewUrl,
    });

    return info;
  } catch (err) {
    logger.error('Reschedule email send failed (non-blocking)', {
      bookingId: newBooking.id,
      inviteeEmail: newBooking.inviteeEmail,
      error: err.message,
      stack: err.stack,
    });
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

    logger.info('Cancellation email sent', {
      bookingId: booking.id,
      inviteeEmail: booking.inviteeEmail,
      previewUrl,
    });

    return info;
  } catch (err) {
    logger.error('Cancellation email send failed (non-blocking)', {
      bookingId: booking.id,
      inviteeEmail: booking.inviteeEmail,
      error: err.message,
      stack: err.stack,
    });
    return null;
  }
}
