import Link from 'next/link';
import StageBadge from './StageBadge';
import { markContacted } from '../lib/api';

function formatWaiting(hours) {
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return `${mins}m`;
  }
  if (hours < 24) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const days = Math.floor(hours / 24);
  const remaining = Math.floor(hours % 24);
  return remaining > 0 ? `${days}d ${remaining}h` : `${days}d`;
}

export default function LeadTable({ leads, onLeadUpdated }) {
  async function handleMarkContacted(e, leadId) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const updated = await markContacted(leadId);
      if (onLeadUpdated) onLeadUpdated(updated);
    } catch (err) {
      alert('Failed to mark as contacted: ' + err.message);
    }
  }

  if (leads.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-lg">No leads yet.</p>
        <p className="text-sm mt-1">New inquiries will appear here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {/* Mobile card layout */}
      <div className="block sm:hidden space-y-3">
        {leads.map((lead) => (
          <Link key={lead.id} href={`/leads/${lead.id}`}>
            <div className="bg-white border border-gray-200 rounded-xl p-4 active:bg-gray-50">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-900">
                    {lead.first_name} {lead.last_name}
                  </p>
                  <a
                    href={`tel:${lead.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-blue-600 text-sm font-medium"
                  >
                    {lead.phone}
                  </a>
                </div>
                <StageBadge stage={lead.stage} />
              </div>
              <p className="text-gray-600 text-sm mb-1 truncate">{lead.address}</p>
              <p className="text-gray-500 text-sm mb-3 line-clamp-2">
                {lead.damage_description.substring(0, 60)}
                {lead.damage_description.length > 60 ? '...' : ''}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  Waiting: {formatWaiting(parseFloat(lead.time_waiting_hours))}
                </span>
                {lead.stage !== 'contacted' && lead.stage !== 'closed' ? (
                  <button
                    onClick={(e) => handleMarkContacted(e, lead.id)}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded-lg min-h-[44px] min-w-[120px] transition-colors"
                  >
                    Mark Contacted
                  </button>
                ) : lead.stage === 'contacted' ? (
                  <span className="text-green-600 font-medium text-sm">✓ Contacted</span>
                ) : null}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop table layout */}
      <table className="hidden sm:table min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Damage</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waiting</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-4">
                <Link href={`/leads/${lead.id}`} className="font-medium text-blue-600 hover:underline">
                  {lead.first_name} {lead.last_name}
                </Link>
              </td>
              <td className="px-4 py-4">
                <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">
                  {lead.phone}
                </a>
              </td>
              <td className="px-4 py-4 text-gray-700 max-w-xs truncate">{lead.address}</td>
              <td className="px-4 py-4 text-gray-600 max-w-xs">
                {lead.damage_description.substring(0, 60)}
                {lead.damage_description.length > 60 ? '...' : ''}
              </td>
              <td className="px-4 py-4">
                <StageBadge stage={lead.stage} />
              </td>
              <td className="px-4 py-4 text-gray-500 text-sm whitespace-nowrap">
                {formatWaiting(parseFloat(lead.time_waiting_hours))}
              </td>
              <td className="px-4 py-4">
                {lead.stage !== 'contacted' && lead.stage !== 'closed' ? (
                  <button
                    onClick={(e) => handleMarkContacted(e, lead.id)}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Mark Contacted
                  </button>
                ) : lead.stage === 'contacted' ? (
                  <span className="text-green-600 font-medium">✓</span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
