import { getFirebaseAdmin } from '../config/firebase.js';

export const sendPushNotification = async (tokens, { title, body, data = {} }) => {
  const admin = getFirebaseAdmin();
  if (!admin || !tokens?.length) return { success: false, reason: 'no_tokens' };

  const validTokens = tokens.filter(Boolean);
  if (!validTokens.length) return { success: false, reason: 'no_tokens' };

  try {
    const response = await admin.messaging().sendEachForMulticast({
      tokens: validTokens,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      webpush: {
        fcmOptions: { link: data.link || '/' },
        notification: { icon: '/guardmee-icon.svg' },
      },
    });
    return { success: true, response };
  } catch (error) {
    console.error('Erreur FCM:', error.message);
    return { success: false, error: error.message };
  }
};

export const sendPushToUser = async (user, notification) => {
  if (!user?.fcmTokens?.length) return;
  await sendPushNotification(user.fcmTokens, notification);
};
