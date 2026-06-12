// netlify/functions/sendEmail.ts

import { Handler } from '@netlify/functions';
import { Resend } from 'resend';

// تهيئة خدمة البريد
const resend = new Resend(process.env.RESEND_API_KEY);

export const handler: Handler = async (event) => {
  // التحقق من طريقة الطلب
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }
  
  try {
    const { to, subject, html, fromName } = JSON.parse(event.body || '{}');
    
    if (!to || !subject || !html) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }
    
    const from = `United Experts <${process.env.EMAIL_FROM || 'noreply@uexperts.sa'}>`;
    
    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject,
      html,
      reply_to: process.env.EMAIL_REPLY_TO,
    });
    
    if (error) {
      console.error('Email sending error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, id: data?.id }),
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};