const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

/**
 * Gửi email
 * @param {Object} options - { to, subject, html }
 */
const sendEmail = async ({ to, subject, html }) => {
  const mailOptions = {
    from: `"PhòngTrọ VL" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  }
  await transporter.sendMail(mailOptions)
}

module.exports = { sendEmail }
