import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import LeadTable from '../components/LeadTable';
import { getLeads } from '../lib/api';

export default function Dashboard() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchLeads = useCallback(async () => {
    try {
      const data = await getLeads();
      setLeads(data);
      setLastRefresh(new Date());
      setError('');
    } catch (err) {
      setError('Failed to load leads. Retrying...');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
    const interval = setInterval(fetchLeads, 30000);
    return () => clearInterval(interval);
  }, [fetchLeads]);

  function handleLeadUpdated(updatedLead) {
    setLeads((prev) =>
      prev.map((l) => (l.id === updatedLead.id ? { ...l, ...updatedLead } : l))
    );
  }

  const activeLeads = leads.filter(
    (l) => l.stage !== 'contacted' && l.stage !== 'closed'
  );

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const contactedToday = leads.filter(
    (l) => l.stage === 'contacted' && new Date(l.created_at) >= todayStart
  ).length;

  return (
    <>
      <Head>
        <title>RoofPing Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏠</span>
              <span className="font-bold text-gray-900">RoofPing</span>
              <span className="text-gray-400 text-sm hidden sm:inline">/ Dashboard</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 hidden sm:inline">
                {lastRefresh
                  ? `Updated ${lastRefresh.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                  : ''}
              </span>
              <button
                onClick={fetchLeads}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Refresh
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">
          {/* Header row */}
          <div className="mb-5 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Lead Inbox</h1>
            <Link
              href="/"
              target="_blank"
              className="text-sm text-gray-500 hover:text-blue-600 border border-gray-200 rounded-lg px-3 py-2 hidden sm:block"
            >
              View lead form →
            </Link>
          </div>

          {/* Metric cards */}
          {!loading && (
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Active Leads</p>
                <p className="text-3xl font-bold text-gray-900">{activeLeads.length}</p>
                {activeLeads.some((l) => l.stage === 'rep_alerted') && (
                  <p className="text-xs text-red-600 mt-1 font-medium">
                    ⚠️ {activeLeads.filter((l) => l.stage === 'rep_alerted').length} need attention
                  </p>
                )}
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Contacted Today</p>
                <p className="text-3xl font-bold text-green-600">{contactedToday}</p>
                <p className="text-xs text-gray-400 mt-1">leads closed today</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-800 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-3xl mb-2">⏳</div>
              <p>Loading leads...</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <LeadTable leads={leads} onLeadUpdated={handleLeadUpdated} />
            </div>
          )}
        </main>
      </div>
    </>
  );
}
