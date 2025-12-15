// Test email endpoint to verify Resend configuration
import { Resend } from 'resend';

export default async function handler(req, res) {
  try {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    console.log('=== EMAIL TEST API ===');
    console.log('Method:', req.method);
    console.log('Environment variables check:');
    console.log('- RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
    console.log('- RESEND_API_KEY value:', process.env.RESEND_API_KEY ? `${process.env.RESEND_API_KEY.substring(0, 10)}...` : 'undefined');
    console.log('- FROM_EMAIL:', process.env.FROM_EMAIL);
    console.log('- ADMIN_EMAIL:', process.env.ADMIN_EMAIL);

    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (!resendApiKey) {
      return res.status(400).json({ 
        success: false,
        error: 'RESEND_API_KEY not configured',
        details: 'Environment variable RESEND_API_KEY is missing'
      });
    }

    const resend = new Resend(resendApiKey);

    // Test email sending
    try {
      console.log('Testing email send...');
      console.log('From:', 'onboarding@resend.dev');
      console.log('To:', process.env.ADMIN_EMAIL);
      console.log('API Key length:', resendApiKey.length);
      
      const emailPayload = {
        from: 'onboarding@resend.dev', // Resendの認証済みデフォルトドメイン使用
        to: process.env.ADMIN_EMAIL || 'test@example.com',
        subject: '[CVG] Email Configuration Test - ' + new Date().toISOString(),
        text: `
This is a test email to verify Resend configuration.

Timestamp: ${new Date().toLocaleString('ja-JP')}
API Key: ${resendApiKey.substring(0, 10)}...
From Email: onboarding@resend.dev
To Email: ${process.env.ADMIN_EMAIL || 'test@example.com'}

If you received this email, the configuration is working correctly.
        `
      };
      
      console.log('Email payload:', JSON.stringify(emailPayload, null, 2));
      
      const testResult = await resend.emails.send(emailPayload);

      console.log('Email send result:', JSON.stringify(testResult, null, 2));

      return res.status(200).json({
        success: true,
        message: 'Test email sent successfully',
        emailId: testResult.data?.id || testResult.id,
        configuration: {
          resendApiKeyConfigured: true,
          fromEmail: process.env.FROM_EMAIL || 'onboarding@resend.dev',
          adminEmail: process.env.ADMIN_EMAIL || 'test@example.com'
        }
      });

    } catch (emailError) {
      console.error('=== EMAIL ERROR DETAILS ===');
      console.error('Error type:', emailError.constructor.name);
      console.error('Error message:', emailError.message);
      console.error('Error code:', emailError.code);
      console.error('Error status:', emailError.status);
      console.error('Full error:', JSON.stringify(emailError, null, 2));
      console.error('Stack trace:', emailError.stack);
      
      return res.status(500).json({
        success: false,
        error: 'Email sending failed',
        details: {
          message: emailError.message,
          code: emailError.code,
          status: emailError.status,
          type: emailError.constructor.name
        },
        configuration: {
          resendApiKeyConfigured: !!resendApiKey,
          apiKeyLength: resendApiKey.length,
          fromEmail: 'onboarding@resend.dev',
          adminEmail: process.env.ADMIN_EMAIL || 'test@example.com'
        }
      });
    }

  } catch (error) {
    console.error('Test email error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}