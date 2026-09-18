const nodemailer = require('nodemailer');

const otpStore = {};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'jankiramgupta5@gmail.com',
    pass: 'mlux yysa liql gydc'
  }
});

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendEmailOTP = async (email, otp) => {
  await transporter.sendMail({
    from: '"Sahi Park 🅿️" <jankiramgupta5@gmail.com>',
    to: email,
    subject: 'Your Sahi Park OTP Code',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;background:#0a0a1a;color:white;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:30px;text-align:center;">
          <h1 style="margin:0;font-size:28px;">🅿️ Sahi Park</h1>
          <p style="margin:8px 0 0;opacity:0.85;">Email Verification</p>
        </div>
        <div style="padding:30px;text-align:center;">
          <p style="color:#aaa;font-size:15px;">Your OTP code is:</p>
          <div style="background:rgba(102,126,234,0.15);border:2px solid rgba(102,126,234,0.4);border-radius:12px;padding:20px;margin:20px 0;">
            <span style="font-size:42px;font-weight:900;letter-spacing:10px;color:#a78bfa;">${otp}</span>
          </div>
          <p style="color:#aaa;font-size:13px;">Valid for <strong style="color:white;">5 minutes</strong>. Do not share with anyone.</p>
        </div>
      </div>
    `
  });
};

const saveOTP = (email, otp) => {
  otpStore[email] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 };
};

const verifyOTP = (email, otp) => {
  const record = otpStore[email];
  if (!record) return false;
  if (Date.now() > record.expiresAt) { delete otpStore[email]; return false; }
  if (record.otp !== otp) return false;
  delete otpStore[email];
  return true;
};

module.exports = { generateOTP, saveOTP, verifyOTP, sendEmailOTP };
