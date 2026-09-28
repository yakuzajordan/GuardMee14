export const sendSMS = async (phone, message) => {
  if (process.env.DEV_MODE === 'true' || !process.env.TWILIO_ACCOUNT_SID) {
    console.log(`[SMS DEV] → ${phone}: ${message}`);
    return { success: true, dev: true, message };
  }
  try {
    const twilio = (await import('twilio')).default;
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    return { success: true };
  } catch (error) {
    console.error('Erreur SMS:', error.message);
    throw new Error('Échec envoi SMS');
  }
};

export const generateSMSCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const formatCameroonPhone = (phone) => {
  const cleaned = phone.replace(/\s/g, '');
  if (cleaned.startsWith('+237')) return cleaned;
  if (cleaned.startsWith('237')) return `+${cleaned}`;
  if (/^[6-9]\d{8}$/.test(cleaned)) return `+237${cleaned}`;
  return null;
};
