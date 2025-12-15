// Gmail SMTP email sender
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  try {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    console.log('=== GMAIL SMTP EMAIL API ===');
    
    // Gmail SMTP設定を確認
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
    
    console.log('Gmail User:', gmailUser);
    console.log('Gmail App Password exists:', !!gmailAppPassword);
    
    if (!gmailUser || !gmailAppPassword) {
      return res.status(400).json({
        success: false,
        error: 'Gmail SMTP not configured',
        details: 'GMAIL_USER or GMAIL_APP_PASSWORD environment variables missing'
      });
    }

    const { orderData, orderId } = req.body;

    // Gmail SMTP transporter作成
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword
      }
    });

    // 管理者向けメール
    const adminEmailContent = `
新しい注文が入りました。

注文ID: ${orderId}
注文日時: ${new Date().toLocaleString('ja-JP')}

■ 商品情報
商品: ${orderData.product || 'N/A'}
数量: ${orderData.quantity || 'N/A'}

■ お客様情報
氏名: ${orderData.full_name || 'N/A'}
医院・クリニック名: ${orderData.company_name || 'N/A'}
医院電話番号: ${orderData.company_phone || 'N/A'}
医院住所: ${orderData.company_address || 'N/A'}
自宅住所: ${orderData.home_address || 'N/A'}
自宅電話番号: ${orderData.home_phone || 'N/A'}

■ 連絡者情報
連絡者氏名: ${orderData.contact_name || 'N/A'}
連絡先電話番号: ${orderData.contact_phone || 'N/A'}
連絡先Email: ${orderData.contact_email || 'N/A'}

ライセンスファイル: ${orderData.license_file ? `添付あり (${orderData.license_file})` : '添付なし'}

管理画面で詳細を確認してください。
    `;

    // 顧客向け確認メール
    const customerEmailContent = `
${orderData.full_name} 様

この度はCVG商品をご注文いただき、誠にありがとうございます。

ご注文を受け付けいたしました。
注文ID: ${orderId}

■ ご注文内容
商品: ${orderData.product || 'N/A'}
数量: ${orderData.quantity || 'N/A'}

担当者より改めてご連絡させていただきます。

何かご不明な点がございましたら、お気軽にお問い合わせください。

CVG Cell Vision Global Limited
    `;

    try {
      const emailResults = [];
      
      // 管理者向けメール送信
      if (process.env.ADMIN_EMAIL) {
        console.log('Sending admin email...');
        const adminResult = await transporter.sendMail({
          from: `"CVG Order System" <${gmailUser}>`,
          to: process.env.ADMIN_EMAIL,
          subject: `[CVG] 新規注文 #${orderId} - ${orderData.full_name}様`,
          text: adminEmailContent
        });
        
        emailResults.push({
          type: 'admin',
          messageId: adminResult.messageId,
          to: process.env.ADMIN_EMAIL
        });
        console.log('Admin email sent:', adminResult.messageId);
      }

      // 顧客向け確認メール送信
      if (orderData.contact_email) {
        console.log('Sending customer email...');
        const customerResult = await transporter.sendMail({
          from: `"CVG Order System" <${gmailUser}>`,
          to: orderData.contact_email,
          subject: `[CVG] ご注文確認 #${orderId}`,
          text: customerEmailContent
        });
        
        emailResults.push({
          type: 'customer', 
          messageId: customerResult.messageId,
          to: orderData.contact_email
        });
        console.log('Customer email sent:', customerResult.messageId);
      }

      return res.status(200).json({
        success: true,
        message: 'Gmail SMTP emails sent successfully',
        emailResults: emailResults
      });

    } catch (emailError) {
      console.error('Gmail SMTP error:', emailError);
      
      return res.status(500).json({
        success: false,
        error: 'Gmail SMTP sending failed',
        details: emailError.message
      });
    }

  } catch (error) {
    console.error('Gmail SMTP API error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}