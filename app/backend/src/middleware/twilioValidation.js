const twilio = require('twilio');
require('dotenv').config();

function validateTwilioWebhook(req, res, next) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = req.headers['x-twilio-signature'];
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const params = req.body;

  const isValid = twilio.validateRequest(authToken, signature, url, params);

  if (!isValid) {
    console.warn('Invalid Twilio webhook signature from:', req.ip);
    return res.status(403).send('Forbidden');
  }

  next();
}

module.exports = { validateTwilioWebhook };
