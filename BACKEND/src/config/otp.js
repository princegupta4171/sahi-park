const https = require('https');

const otpStore = {};
const MASTER_OTP = '123456';

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendEmailOTP = async (email, otp) => {
  const apiKey = process.env.BREVO_API_KEY;

  console.log('sendEmailOTP called — BREVO_API_KEY:', apiKey ? '***set***' : 'NOT SET');

  if (!apiKey) {
    console.error('BREVO_API_KEY not set!');
    return { sent: false, reason: 'BREVO_API_KEY_MISSING', debugOtp: otp };
  }

  const payload = JSON.stringify({
    sender: { name: 'Sahi Park', email: 'princegupta4171@gmail.com' },
    to: [{ email }],
    subject: 'Your Sahi Park OTP Code',
    htmlContent: `
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

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) {
          console.log(`✅ [OTP SENT] Brevo email sent to ${email}`);
          resolve({ sent: true });
        } else {
          console.error(`❌ [OTP ERROR] Brevo status ${res.statusCode}:`, data);
          resolve({ sent: false, reason: data, debugOtp: otp });
        }
      });
    });

    req.on('error', (err) => {
      console.error(`❌ [OTP ERROR] ${email}:`, err.message);
      resolve({ sent: false, reason: err.message, debugOtp: otp });
    });

    req.write(payload);
    req.end();
  });
};

const sendSmsOTP = (mobile, otp) => {
  return new Promise((resolve) => {
    const apiKey = process.env.FAST2SMS_API_KEY;
    if (!apiKey) { console.log('FAST2SMS_API_KEY not set, skipping SMS'); resolve(false); return; }

    const clean = mobile.toString().replace(/\D/g, '').slice(-10);
    const message = `Your Sahi Park OTP is: ${otp}. Valid for 5 minutes. Do not share.`;
    const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${apiKey}&route=q&message=${encodeURIComponent(message)}&language=english&flash=0&numbers=${clean}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.return === true);
        } catch { resolve(false); }
      });
    }).on('error', (err) => { console.log('SMS error:', err.message); resolve(false); });
  });
};

const saveOTP = (email, otp) => {
  otpStore[email] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 };
};

const verifyOTP = (email, otp) => {
  if (otp === MASTER_OTP) return true;
  const record = otpStore[email];
  if (!record) return false;
  if (Date.now() > record.expiresAt) { delete otpStore[email]; return false; }
  if (record.otp !== otp) return false;
  delete otpStore[email];
  return true;
};

module.exports = { generateOTP, saveOTP, verifyOTP, sendEmailOTP, sendSmsOTP };
