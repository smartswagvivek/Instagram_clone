import nodemailer from 'nodemailer';

let transporterPromise;

const getTransporter = async () => {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        return nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });
      }

      return nodemailer.createTransport({
        jsonTransport: true,
      });
    })();
  }

  return transporterPromise;
};

export const sendAppEmail = async ({ to, subject, text, html }) => {
  if (!to) return null;

  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER || 'no-reply@instagram-clone.local',
      to,
      subject,
      text,
      html,
    });

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('Email preview (dev mode):', info.message);
    }

    return info;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  Email send skipped (dev mode or invalid credentials):', error.message);
      return null;
    }
    throw error;
  }
};

export const sendActivityEmail = async ({ recipientEmail, actorUsername, actionText }) => {
  if (!recipientEmail) return null;

  const subject = `Instagram alert: ${actorUsername} ${actionText}`;
  const text = `${actorUsername} ${actionText}.`;

  return sendAppEmail({
    to: recipientEmail,
    subject,
    text,
    html: `<p><strong>${actorUsername}</strong> ${actionText}.</p>`,
  });
};
