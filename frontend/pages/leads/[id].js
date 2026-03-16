import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import StageBadge from '../../components/StageBadge';
import EventTimeline from '../../components/EventTimeline';
import { getLead, markContacted } from '../../lib/api';

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

const statusBadgeClass = {
  pending: 'bg-yellow-100 text-yellow-700',
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export default function LeadDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    if (!id) return;
    getLead(id)
      .then(setLead)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleMarkContacted() {
    setMarking(true);
    try {
      const updated = await markContacted(id);
      setLead((prev) => ({ ...prev, ...updated, events: prev.events, messages: prev.messages }));
      // Refresh full lead to get updated events
      const full = await getLead(id);
      setLead(full);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setMarking(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">{error || 'Lead not found'}</p>
          <Link href="/dashboard" className="text-blue-600 hover:underline mt-2 inline-block">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{lead.first_name} {lead.last_name} — RoofPing</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-1 text-blue-600 hover:text-blue-700">
              <span>←</span>
              <span className="text-sm font-medium">Dashboard</span>
            </Link>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900">RoofPing</span>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Lead info card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {lead.first_name} {lead.last_name}
                </h1>
                <div className="mt-1">
                  <StageBadge stage={lead.stage} />
                </div>
              </div>
              {lead.stage !== 'contacted' && lead.stage !== 'closed' && (
                <button
                  onClick={handleMarkContacted}
                  disabled={marking}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-5 rounded-xl text-sm transition-colors min-h-[48px]"
                >
                  {marking ? 'Saving...' : '✓ Mark Contacted'}
                </button>
              )}
              {lead.stage === 'contacted' && (
                <span className="text-green-600 font-semibold flex items-center gap-1">
                  <span>✓</span> Contacted
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-0.5">Phone</p>
                <a href={`tel:${lead.phone}`} className="text-blue-600 font-medium text-base hover:underline">
                  {lead.phone}
                </a>
              </div>
              {lead.email && (
                <div>
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-0.5">Email</p>
                  <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">
                    {lead.email}
                  </a>
                </div>
              )}
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-0.5">Address</p>
                <p className="text-gray-800">{lead.address}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-0.5">Submitted</p>
                <p className="text-gray-800">{formatDate(lead.created_at)}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-0.5">Damage Description</p>
                <p className="text-gray-800">{lead.damage_description}</p>
              </div>
            </div>
          </div>

          {/* Event timeline */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">Activity Timeline</h2>
            <EventTimeline events={lead.events} />
          </div>

          {/* Message log */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Message Log</h2>
            {lead.messages && lead.messages.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left pb-2 text-xs text-gray-500 font-medium uppercase tracking-wide pr-4">Message</th>
                      <th className="text-left pb-2 text-xs text-gray-500 font-medium uppercase tracking-wide pr-4">Scheduled</th>
                      <th className="text-left pb-2 text-xs text-gray-500 font-medium uppercase tracking-wide pr-4">Sent</th>
                      <th className="text-left pb-2 text-xs text-gray-500 font-medium uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {lead.messages.map((msg) => (
                      <tr key={msg.id} className="align-top">
                        <td className="py-3 pr-4 max-w-xs">
                          <p className="text-gray-700 line-clamp-2">{msg.body}</p>
                        </td>
                        <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">
                          {formatDate(msg.scheduled_at)}
                        </td>
                        <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">
                          {formatDate(msg.sent_at)}
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass[msg.status] || 'bg-gray-100 text-gray-600'}`}>
                            {msg.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No messages yet.</p>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
