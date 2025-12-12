// Email notification endpoint for order submissions
import { Resend } from 'resend';

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

    const { orderData, orderId } = req.body;

    // メール送信の実装（Resend を使用）
    // 環境変数からAPI Keyを取得
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (!resendApiKey) {
      console.log("No email API key configured, skipping email");
      return res.status(200).json({ 
        success: true,
        message: "注文を受け付けました（メール通知は無効）"
      });
    }

    const resend = new Resend(resendApiKey);

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
      // 管理者向けメール送信
      if (process.env.ADMIN_EMAIL) {
        await resend.emails.send({
          from: process.env.FROM_EMAIL || 'noreply@cvg.com',
          to: process.env.ADMIN_EMAIL,
          subject: `[CVG] 新規注文 #${orderId} - ${orderData.full_name}様`,
          text: adminEmailContent,
        });
      }

      // 顧客向け確認メール送信（メールアドレスがある場合）
      if (orderData.contact_email) {
        await resend.emails.send({
          from: process.env.FROM_EMAIL || 'noreply@cvg.com',
          to: orderData.contact_email,
          subject: `[CVG] ご注文確認 #${orderId}`,
          text: customerEmailContent,
        });
      }

      console.log("Email notifications sent successfully");
      
      return res.status(200).json({ 
        success: true,
        message: "注文を受け付け、メール通知を送信しました"
      });

    } catch (emailError) {
      console.error("Email sending error:", emailError);
      
      return res.status(200).json({ 
        success: true,
        message: "注文を受け付けましたが、メール送信でエラーが発生しました"
      });
    }

  } catch (error) {
    console.error("Notification handler error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "通知送信中にエラーが発生しました"
    });
  }
}