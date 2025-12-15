// Gmail SMTP Test API
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  try {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    console.log('=== GMAIL SMTP TEST API ===');
    console.log('Method:', req.method);
    
    // Gmail SMTP設定を確認
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
    const adminEmail = process.env.ADMIN_EMAIL;
    
    console.log('Gmail User:', gmailUser);
    console.log('Gmail App Password exists:', !!gmailAppPassword);
    console.log('Admin Email:', adminEmail);
    
    if (!gmailUser || !gmailAppPassword) {
      return res.status(400).json({
        success: false,
        error: 'Gmail SMTP not configured',
        details: 'GMAIL_USER or GMAIL_APP_PASSWORD environment variables missing',
        configuration: {
          gmailUser: gmailUser || 'not set',
          gmailAppPassword: !!gmailAppPassword,
          adminEmail: adminEmail || 'not set'
        }
      });
    }

    // Gmail SMTP transporter作成
    console.log('Creating Gmail SMTP transporter...');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword
      }
    });

    // 接続テスト
    console.log('Testing Gmail SMTP connection...');
    await transporter.verify();
    console.log('Gmail SMTP connection verified successfully');

    // テストメール送信
    console.log('Sending test email...');
    const testResult = await transporter.sendMail({
      from: `"CVG Test System" <${gmailUser}>`,
      to: adminEmail,
      subject: `[CVG] Gmail SMTP Test - ${new Date().toISOString()}`,
      text: `
This is a Gmail SMTP test email.

Timestamp: ${new Date().toLocaleString('ja-JP')}
Gmail User: ${gmailUser}
Admin Email: ${adminEmail}

If you received this email, Gmail SMTP is working correctly!
      `
    });

    console.log('Test email sent successfully:', testResult.messageId);

    return res.status(200).json({
      success: true,
      message: 'Gmail SMTP test email sent successfully',
      messageId: testResult.messageId,
      configuration: {
        gmailUser: gmailUser,
        adminEmail: adminEmail,
        smtpVerified: true
      }
    });

  } catch (error) {
    console.error('Gmail SMTP test error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Gmail SMTP test failed',
      details: error.message,
      configuration: {
        gmailUser: process.env.GMAIL_USER || 'not set',
        gmailAppPassword: !!process.env.GMAIL_APP_PASSWORD,
        adminEmail: process.env.ADMIN_EMAIL || 'not set'
      }
    });
  }
}