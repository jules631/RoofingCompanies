function formatEventType(event, index, allEvents) {
  const followUpCount = allEvents
    .filter((e) => e.type === 'follow_up_sent' && e.created_at <= event.created_at)
    .indexOf(event) + 1;

  switch (event.type) {
    case 'acknowledged':
      return { icon: '✅', text: 'Acknowledgment SMS sent' };
    case 'follow_up_sent':
      return { icon: '📨', text: `Follow-up #${followUpCount} sent` };
    case 'escalation_sent':
      return { icon: '⚠️', text: 'Rep escalation alert sent' };
    case 'lead_replied':
      return {
        icon: '💬',
        text: `Homeowner replied: '${event.metadata?.message || ''}'`,
      };
    case 'rep_contacted':
      return { icon: '🤝', text: 'Marked as contacted' };
    case 'sequence_stopped':
      return { icon: '🛑', text: 'Follow-up sequence stopped' };
    default:
      return { icon: '•', text: event.type };
  }
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function EventTimeline({ events }) {
  if (!events || events.length === 0) {
    return <p className="text-gray-500 text-sm">No events yet.</p>;
  }

  return (
    <ol className="relative border-l border-gray-200 ml-3">
      {events.map((event, i) => {
        const { icon, text } = formatEventType(event, i, events);
        return (
          <li key={event.id} className="mb-6 ml-6">
            <span className="absolute -left-3 flex items-center justify-center w-6 h-6 bg-white border border-gray-200 rounded-full text-sm">
              {icon}
            </span>
            <p className="text-gray-800 font-medium">{text}</p>
            <time className="text-xs text-gray-400">{formatTime(event.created_at)}</time>
          </li>
        );
      })}
    </ol>
  );
}
