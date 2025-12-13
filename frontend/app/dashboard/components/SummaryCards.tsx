'use client';

interface SummaryCardsProps {
  summary: {
    present: number;
    late: number;
    absent: number;
    total: number;
  };
  onCardClick: (status: string | null) => void;
}

export default function SummaryCards({ summary, onCardClick }: SummaryCardsProps) {
  const cards = [
    {
      title: 'Present Today',
      value: summary.present,
      subtitle: `Out of ${summary.total} students`,
      change: '+2%',
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
      status: 'on_time',
    },
    {
      title: 'Late Arrivals',
      value: summary.late,
      subtitle: 'Students arrived late',
      change: '+1%',
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600',
      status: 'late',
    },
    {
      title: 'Absent Today',
      value: summary.absent,
      subtitle: 'Not checked in yet',
      change: '-3%',
      color: 'bg-red-500',
      hoverColor: 'hover:bg-red-600',
      status: 'absent',
    },
    {
      title: 'Total Students',
      value: summary.total,
      subtitle: 'Registered students',
      change: '+2%',
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      status: null,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <button
          key={card.title}
          onClick={() => onCardClick(card.status)}
          className={`${card.color} ${card.hoverColor} text-white p-6 rounded-lg shadow-md transition transform hover:scale-105 cursor-pointer text-left`}
        >
          <h3 className="text-sm font-medium opacity-90 mb-2">{card.title}</h3>
          <p className="text-3xl font-bold mb-1">{card.value}</p>
          <div className="flex items-center justify-between">
            <p className="text-sm opacity-80">{card.subtitle}</p>
            <span className="text-xs bg-white/20 px-2 py-1 rounded">
              {card.change}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}