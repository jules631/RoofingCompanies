function formatEventType(event, allEvents, lead) {
  const followUpEvents = allEvents.filter((e) => e.type === 'follow_up_sent');
  const followUpIndex = followUpEvents.findIndex((e) => e.id === event.id);
  const followUpNumber = event.metadata?.followUpNumber ?? (followUpIndex >= 0 ? followUpIndex + 1 : 1);
  const messagePreview = event.metadata?.messagePreview;
  const firstName = event.metadata?.firstName || lead?.first_name || 'Homeowner';

  switch (event.type) {
    case 'acknowledged':
      return {
        icon: '✅',
        text: `Acknowledgment SMS sent to ${firstName}`,
      };
    case 'follow_up_sent':
      return {
        icon: '📨',
        text: messagePreview
          ? `Follow-up #${followUpNumber} sent — ${messagePreview}${messagePreview.length >= 80 ? '…' : ''}`
          : `Follow-up #${followUpNumber} sent`,
      };
    case 'escalation_sent': {
      const hours = event.metadata?.hoursWaiting ?? 6;
      return {
        icon: '⚠️',
        text: `Escalation alert sent — ${hours} hours waiting`,
      };
    }
    case 'lead_replied':
      return {
        icon: '💬',
        text: `${firstName} replied: '${event.metadata?.message || ''}'`,
      };
    case 'rep_contacted':
      return {
        icon: '🤝',
        text: 'Marked as contacted — pending messages cancelled',
      };
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

export default function EventTimeline({ events, lead }) {
  if (!events || events.length === 0) {
    return <p className="text-gray-500 text-sm">No events yet.</p>;
  }

  return (
    <ol className="relative border-l border-gray-200 ml-3">
      {events.map((event) => {
        const { icon, text } = formatEventType(event, events, lead);
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
