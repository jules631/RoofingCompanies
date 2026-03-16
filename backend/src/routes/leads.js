const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { messageQueue } = require('../queues/messageQueue');
require('dotenv').config();

const router = express.Router();

// POST /api/leads — create a new lead and enqueue messages
router.post('/', async (req, res) => {
  const { first_name, last_name, phone, email, address, damage_description } = req.body;

  // Validate required fields
  if (!first_name || !last_name || !phone || !address || !damage_description) {
    return res.status(400).json({
      error: 'Missing required fields: first_name, last_name, phone, address, damage_description',
    });
  }

  // Basic phone validation
  const phoneClean = phone.replace(/\D/g, '');
  if (phoneClean.length < 10) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Fetch company (use first company for now; multi-tenant can be added later)
    const companyResult = await client.query('SELECT * FROM companies LIMIT 1');
    if (companyResult.rows.length === 0) {
      throw new Error('No company configured. Please add a company record to the database.');
    }
    const company = companyResult.rows[0];

    // Create lead
    const leadId = uuidv4();
    const leadResult = await client.query(
      `INSERT INTO leads (id, company_id, first_name, last_name, phone, email, address, damage_description, stage)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'new')
       RETURNING *`,
      [leadId, company.id, first_name, last_name, phone, email || null, address, damage_description]
    );
    const lead = leadResult.rows[0];

    // Create sequence
    const sequenceId = uuidv4();
    await client.query(
      `INSERT INTO sequences (id, lead_id, status) VALUES ($1, $2, 'active')`,
      [sequenceId, leadId]
    );

    const now = new Date();
    const companyName = process.env.COMPANY_NAME || company.name;
    const repPhone = process.env.REP_PHONE_NUMBER || company.rep_phone;

    // Define the 4 messages
    const messageTemplates = [
      {
        delay: 0,
        recipient: 'homeowner',
        scheduledAt: new Date(now.getTime()),
        body: `Hi ${first_name}! This is ${companyName}. We received your roofing request and someone will be in touch with you shortly. In the meantime, if you can document any damage with photos it'll help us give you the most accurate estimate. 📸`,
      },
      {
        delay: 24 * 60 * 60 * 1000,
        recipient: 'homeowner',
        scheduledAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        body: `Hey ${first_name}, still planning to connect with you about your roof. Quick tip: if you're working with insurance, having your policy number handy helps us move faster for you. Questions? Reply here or call us at ${repPhone}.`,
      },
      {
        delay: 48 * 60 * 60 * 1000,
        recipient: 'homeowner',
        scheduledAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
        body: `Hi ${first_name}, we don't want you to get left waiting. Reply here or call us at ${repPhone} to get your free inspection scheduled — we'll make it easy.`,
      },
      {
        delay: 6 * 60 * 60 * 1000,
        recipient: 'rep',
        scheduledAt: new Date(now.getTime() + 6 * 60 * 60 * 1000),
        body: `⚠️ LEAD ALERT: ${first_name} ${last_name} has been waiting 6 hours with no contact. Damage reported: ${damage_description}. Call them now: ${phone}`,
      },
    ];

    // Create message records and enqueue jobs
    for (let i = 0; i < messageTemplates.length; i++) {
      const template = messageTemplates[i];
      const messageId = uuidv4();

      // Insert message record first (job_id will be updated after enqueue)
      await client.query(
        `INSERT INTO messages (id, sequence_id, lead_id, channel, body, scheduled_at, status)
         VALUES ($1, $2, $3, 'sms', $4, $5, 'pending')`,
        [messageId, sequenceId, leadId, template.body, template.scheduledAt]
      );

      // Enqueue the job
      const job = await messageQueue.add(
        'send-sms',
        {
          messageId,
          leadId,
          sequenceId,
          jobIndex: i,
          recipient: template.recipient,
          body: template.body,
          phone: template.recipient === 'homeowner' ? phone : repPhone,
        },
        { delay: template.delay }
      );

      // Store job_id immediately
      await client.query(
        'UPDATE messages SET job_id = $1 WHERE id = $2',
        [job.id, messageId]
      );
    }

    await client.query('COMMIT');

    res.status(201).json(lead);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating lead:', err);
    res.status(500).json({ error: err.message || 'Failed to create lead' });
  } finally {
    client.release();
  }
});

// GET /api/leads — list all leads
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         id, first_name, last_name, phone, address, damage_description, stage, created_at,
         EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 AS time_waiting_hours
       FROM leads
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching leads:', err);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// GET /api/leads/:id — lead detail with events and messages
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const leadResult = await db.query('SELECT * FROM leads WHERE id = $1', [id]);
    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    const lead = leadResult.rows[0];

    const eventsResult = await db.query(
      'SELECT * FROM events WHERE lead_id = $1 ORDER BY created_at ASC',
      [id]
    );

    const messagesResult = await db.query(
      'SELECT * FROM messages WHERE lead_id = $1 ORDER BY scheduled_at ASC',
      [id]
    );

    res.json({
      ...lead,
      events: eventsResult.rows,
      messages: messagesResult.rows,
    });
  } catch (err) {
    console.error('Error fetching lead detail:', err);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// PATCH /api/leads/:id/contacted — mark lead as contacted and cancel pending messages
router.patch('/:id/contacted', async (req, res) => {
  const { id } = req.params;
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Check lead exists
    const leadResult = await client.query('SELECT * FROM leads WHERE id = $1', [id]);
    if (leadResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Update lead stage
    await client.query(
      "UPDATE leads SET stage = 'contacted' WHERE id = $1",
      [id]
    );

    // Get all pending messages
    const pendingMessages = await client.query(
      "SELECT * FROM messages WHERE lead_id = $1 AND status = 'pending'",
      [id]
    );

    // Cancel each job and update message status
    for (const msg of pendingMessages.rows) {
      if (msg.job_id) {
        try {
          const job = await messageQueue.getJob(msg.job_id);
          await job?.remove();
        } catch (jobErr) {
          console.warn(`Could not remove job ${msg.job_id}:`, jobErr.message);
        }
      }
      await client.query(
        "UPDATE messages SET status = 'cancelled' WHERE id = $1",
        [msg.id]
      );
    }

    // Cancel sequence
    await client.query(
      "UPDATE sequences SET status = 'cancelled' WHERE lead_id = $1 AND status IN ('active', 'paused')",
      [id]
    );

    // Insert event
    await client.query(
      "INSERT INTO events (lead_id, type) VALUES ($1, 'rep_contacted')",
      [id]
    );

    await client.query('COMMIT');

    const updatedLead = await db.query('SELECT * FROM leads WHERE id = $1', [id]);
    res.json(updatedLead.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error marking lead as contacted:', err);
    res.status(500).json({ error: 'Failed to mark lead as contacted' });
  } finally {
    client.release();
  }
});

module.exports = router;
