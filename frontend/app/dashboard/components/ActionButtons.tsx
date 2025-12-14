'use client';

interface ActionButtonsProps {
  onUploadClick: () => void;
  onTokenClick: () => void;
}

export default function ActionButtons({ onUploadClick, onTokenClick }: ActionButtonsProps) {
  return (
    <div className="flex gap-4 mb-6">
      <button
        onClick={onUploadClick}
        className="px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2 shadow-sm"
      >
        <span>📤</span>
        <span>Upload members.csv</span>
      </button>
      <button
        onClick={onTokenClick}
        className="px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2 shadow-sm"
      >
        <span>🔑</span>
        <span>Generate Token</span>
      </button>
    </div>
  );
}