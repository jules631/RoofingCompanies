const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function createLead(data) {
  const res = await fetch(`${API_URL}/api/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to submit');
  }
  return res.json();
}

export async function getLeads() {
  const res = await fetch(`${API_URL}/api/leads`);
  if (!res.ok) throw new Error('Failed to fetch leads');
  return res.json();
}

export async function getLead(id) {
  const res = await fetch(`${API_URL}/api/leads/${id}`);
  if (!res.ok) throw new Error('Failed to fetch lead');
  return res.json();
}

export async function markContacted(id) {
  const res = await fetch(`${API_URL}/api/leads/${id}/contacted`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to mark as contacted');
  return res.json();
}
