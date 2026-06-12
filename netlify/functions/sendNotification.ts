// netlify/functions/sendNotification.ts

import { Handler } from '@netlify/functions';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

// تهيئة Firebase Admin
const adminConfig = {
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
};

const app = !getApps().length ? initializeApp(adminConfig) : getApps()[0];
const messaging = getMessaging(app);

export const handler: Handler = async (event) => {
  // التحقق من طريقة الطلب
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }
  
  try {
    const { token, title, body, icon, clickAction } = JSON.parse(event.body || '{}');
    
    if (!token || !title || !body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }
    
    const message = {
      notification: {
        title,
        body,
        ...(icon && { icon }),
      },
      webpush: {
        notification: {
          icon: icon || '/icon-192x192.png',
          badge: '/icon-96x96.png',
          vibrate: [200, 100, 200],
          requireInteraction: true,
          ...(clickAction && { click_action: clickAction }),
        },
        fcmOptions: {
          link: clickAction,
        },
      },
      token,
    };
    
    const response = await messaging.send(message);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, messageId: response }),
    };
  } catch (error) {
    console.error('Notification sending error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send notification' }),
    };
  }
};