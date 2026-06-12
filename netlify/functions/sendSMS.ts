// netlify/functions/sendSMS.ts

import { Handler } from '@netlify/functions';
import twilio from 'twilio';

// تهيئة خدمة Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export const handler: Handler = async (event) => {
  // التحقق من طريقة الطلب
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }
  
  // التحقق من توفر خدمة Twilio
  if (!client || !twilioPhone) {
    return {
      statusCode: 503,
      body: JSON.stringify({ error: 'SMS service not configured' }),
    };
  }
  
  try {
    const { to, message } = JSON.parse(event.body || '{}');
    
    if (!to || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }
    
    const result = await client.messages.create({
      body: message,
      to,
      from: twilioPhone,
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, sid: result.sid }),
    };
  } catch (error) {
    console.error('SMS sending error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send SMS' }),
    };
  }
};