const { Worker } = require('bullmq');
const { Redis } = require('ioredis');
const twilio = require('twilio');
require('dotenv').config();

const db = require('../db');

const connection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const worker = new Worker(
  'messages',
  async (job) => {
    const { messageId, leadId, sequenceId, jobIndex, recipient, body, phone } = job.data;

    console.log(`Processing job ${job.id} (index ${jobIndex}) for lead ${leadId}`);

    // Fetch lead with company info
    const leadResult = await db.query(
      `SELECT l.*, c.twilio_number, c.rep_phone, c.name as company_name
       FROM leads l
       JOIN companies c ON l.company_id = c.id
       WHERE l.id = $1`,
      [leadId]
    );

    if (leadResult.rows.length === 0) {
      console.warn(`Lead ${leadId} not found, skipping job ${job.id}`);
      return;
    }

    const lead = leadResult.rows[0];

    // For homeowner messages, check sequence status
    if (recipient === 'homeowner') {
      const sequenceResult = await db.query(
        'SELECT * FROM sequences WHERE id = $1',
        [sequenceId]
      );

      if (sequenceResult.rows.length === 0 || sequenceResult.rows[0].status !== 'active') {
        console.log(`Sequence ${sequenceId} is not active (status: ${sequenceResult.rows[0]?.status}), skipping job ${job.id}`);
        await db.query(
          "UPDATE messages SET status = 'cancelled' WHERE id = $1 AND status = 'pending'",
          [messageId]
        );
        return;
      }
    }

    // For rep escalation, check if lead is already contacted
    if (recipient === 'rep') {
      if (lead.stage === 'contacted' || lead.stage === 'closed') {
        console.log(`Lead ${leadId} already contacted, skipping escalation job ${job.id}`);
        await db.query(
          "UPDATE messages SET status = 'cancelled' WHERE id = $1 AND status = 'pending'",
          [messageId]
        );
        return;
      }
    }

    // Send SMS via Twilio
    try {
      const twilioNumber = process.env.TWILIO_PHONE_NUMBER || lead.twilio_number;

      await twilioClient.messages.create({
        body,
        from: twilioNumber,
        to: phone,
      });

      // Mark message as sent
      await db.query(
        "UPDATE messages SET status = 'sent', sent_at = NOW() WHERE id = $1",
        [messageId]
      );

      // Insert event and update lead stage based on job type
      if (jobIndex === 0) {
        // Job 1: instant acknowledgment → stage becomes "acknowledged"
        await db.query(
          "INSERT INTO events (lead_id, type, metadata) VALUES ($1, 'acknowledged', $2)",
          [leadId, JSON.stringify({ firstName: lead.first_name })]
        );
        await db.query(
          "UPDATE leads SET stage = 'acknowledged' WHERE id = $1 AND stage = 'new'",
          [leadId]
        );
      } else if (jobIndex === 1) {
        // Job 2: 24hr follow-up → stage becomes "nurturing"
        await db.query(
          "INSERT INTO events (lead_id, type, metadata) VALUES ($1, 'follow_up_sent', $2)",
          [leadId, JSON.stringify({ followUpNumber: 1, messagePreview: body.substring(0, 80) })]
        );
        await db.query(
          "UPDATE leads SET stage = 'nurturing' WHERE id = $1 AND stage NOT IN ('contacted', 'closed', 'rep_alerted')",
          [leadId]
        );
      } else if (jobIndex === 2) {
        // Job 3: 48hr follow-up
        await db.query(
          "INSERT INTO events (lead_id, type, metadata) VALUES ($1, 'follow_up_sent', $2)",
          [leadId, JSON.stringify({ followUpNumber: 2, messagePreview: body.substring(0, 80) })]
        );
      } else if (jobIndex === 3) {
        // Job 4: rep escalation
        await db.query(
          "UPDATE leads SET stage = 'rep_alerted' WHERE id = $1 AND stage NOT IN ('contacted', 'closed')",
          [leadId]
        );
        await db.query(
          "INSERT INTO events (lead_id, type, metadata) VALUES ($1, 'escalation_sent', $2)",
          [leadId, JSON.stringify({ hoursWaiting: 6 })]
        );
      }

      console.log(`Job ${job.id} (index ${jobIndex}) completed successfully`);
    } catch (twilioErr) {
      console.error(`Twilio error for job ${job.id}:`, twilioErr.message);
      await db.query(
        "UPDATE messages SET status = 'failed' WHERE id = $1",
        [messageId]
      );
      throw twilioErr; // Re-throw to trigger BullMQ retry
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('Worker error:', err);
});

console.log('RoofPing message worker started');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down worker...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down worker...');
  await worker.close();
  process.exit(0);
});
