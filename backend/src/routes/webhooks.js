const express = require('express');
const twilio = require('twilio');
const db = require('../db');
const { validateTwilioWebhook } = require('../middleware/twilioValidation');
require('dotenv').config();

const router = express.Router();

// POST /api/webhooks/twilio/inbound — handle inbound SMS from homeowners
router.post(
  '/twilio/inbound',
  express.urlencoded({ extended: false }),
  validateTwilioWebhook,
  async (req, res) => {
    const { From, Body } = req.body;

    try {
      // Normalize the phone number for matching
      const fromNormalized = From.replace(/\s/g, '');

      // Find matching lead by phone
      const leadResult = await db.query(
        `SELECT l.*, c.rep_phone, c.twilio_number, c.name as company_name
         FROM leads l
         JOIN companies c ON l.company_id = c.id
         WHERE l.phone = $1 OR l.phone = $2
         ORDER BY l.created_at DESC
         LIMIT 1`,
        [fromNormalized, fromNormalized.replace('+1', '')]
      );

      if (leadResult.rows.length > 0) {
        const lead = leadResult.rows[0];

        // Check if sequence is active
        const sequenceResult = await db.query(
          "SELECT * FROM sequences WHERE lead_id = $1 AND status = 'active' LIMIT 1",
          [lead.id]
        );

        if (sequenceResult.rows.length > 0) {
          const sequence = sequenceResult.rows[0];

          // Pause the sequence
          await db.query(
            "UPDATE sequences SET status = 'paused' WHERE id = $1",
            [sequence.id]
          );

          // Insert event
          await db.query(
            "INSERT INTO events (lead_id, type, metadata) VALUES ($1, 'lead_replied', $2)",
            [lead.id, JSON.stringify({ message: Body })]
          );

          // Notify rep
          const twilioClient = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
          );

          const repPhone = process.env.REP_PHONE_NUMBER || lead.rep_phone;
          const twilioNumber = process.env.TWILIO_PHONE_NUMBER || lead.twilio_number;

          await twilioClient.messages.create({
            body: `💬 ${lead.first_name} ${lead.last_name} just replied: '${Body}'. Call them now: ${lead.phone}`,
            from: twilioNumber,
            to: repPhone,
          });
        }
      }
    } catch (err) {
      console.error('Error processing inbound webhook:', err);
    }

    // Always return empty TwiML
    res.setHeader('Content-Type', 'text/xml');
    res.send('<Response></Response>');
  }
);

module.exports = router;
