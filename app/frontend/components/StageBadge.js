const stageConfig = {
  new: {
    label: 'New',
    className: 'bg-gray-100 text-gray-700',
  },
  acknowledged: {
    label: 'Acknowledged',
    className: 'bg-blue-100 text-blue-700',
  },
  nurturing: {
    label: 'Nurturing',
    className: 'bg-yellow-100 text-yellow-700',
  },
  rep_alerted: {
    label: 'Rep Alerted',
    className: 'bg-red-100 text-red-700 animate-pulse',
  },
  contacted: {
    label: 'Contacted',
    className: 'bg-green-100 text-green-700',
  },
  closed: {
    label: 'Closed',
    className: 'bg-gray-100 text-gray-400',
  },
};

export default function StageBadge({ stage }) {
  const config = stageConfig[stage] || { label: stage, className: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
