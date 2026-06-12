const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '') : '',
  },
  connectionTimeout: 5000, // 5 seconds
  greetingTimeout: 5000,   // 5 seconds
  socketTimeout: 8000,     // 8 seconds
})

/**
 * Gửi email
 * @param {Object} options - { to, subject, html }
 */
const sendEmail = async ({ to, subject, html }) => {
  const mailOptions = {
    from: `"PhòngTrọ Sinh Viên" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  }
  await transporter.sendMail(mailOptions)
}

const buildHtmlTemplate = (title, bodyHtml, buttonText, buttonUrl) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #f4f5f7;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        .wrapper {
          width: 100%;
          table-layout: fixed;
          background-color: #f4f5f7;
          padding: 40px 0;
        }
        .container {
          max-width: 580px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          overflow: hidden;
        }
        .header {
          background-color: #2563eb;
          padding: 24px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .content {
          padding: 32px 24px;
        }
        .content p {
          margin: 0 0 16px 0;
          color: #334155;
          font-size: 15px;
          line-height: 1.6;
        }
        .content p:last-child {
          margin-bottom: 0;
        }
        .btn-container {
          text-align: center;
          margin: 28px 0;
        }
        .btn {
          display: inline-block;
          background-color: #2563eb;
          color: #ffffff !important;
          text-decoration: none;
          padding: 12px 30px;
          font-size: 15px;
          font-weight: 600;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
        }
        .footer {
          background-color: #f8fafc;
          padding: 20px 24px;
          border-top: 1px solid #e2e8f0;
          text-align: center;
        }
        .footer p {
          margin: 0 0 8px 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
        }
        .footer p:last-child {
          margin-bottom: 0;
        }
        .accent-box {
          background-color: #eff6ff;
          border-left: 4px solid #2563eb;
          padding: 16px;
          border-radius: 0 8px 8px 0;
          margin-bottom: 20px;
        }
        .accent-box p {
          margin: 0;
          color: #1e3a8a;
          font-size: 14px;
          line-height: 1.5;
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <h1>PhòngTrọ Sinh Viên</h1>
          </div>
          <div class="content">
            ${bodyHtml}
            ${buttonText && buttonUrl ? `
              <div class="btn-container">
                <a href="${buttonUrl}" class="btn" target="_blank">${buttonText}</a>
              </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>Đây là thư tự động gửi từ hệ thống PhòngTrọ Sinh Viên.</p>
            <p>&copy; ${new Date().getFullYear()} PhòngTrọ Sinh Viên. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

module.exports = { sendEmail, buildHtmlTemplate }
