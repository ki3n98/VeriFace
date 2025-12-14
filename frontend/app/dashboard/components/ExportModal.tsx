'use client';

interface ExportModalProps {
  onClose: () => void;
  onExport: (format: string) => void;
}

export default function ExportModal({ onClose, onExport }: ExportModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Export Report</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Format
            </label>
            <div className="space-y-2">
              <button
                onClick={() => onExport('csv')}
                className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition text-left"
              >
                📄 CSV (Comma Separated Values)
              </button>
              <button
                onClick={() => onExport('xlsx')}
                className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition text-left"
              >
                📊 Excel (XLSX)
              </button>
              <button
                onClick={() => onExport('pdf')}
                className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition text-left"
              >
                📑 PDF
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Options
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input type="radio" name="scope" value="current" defaultChecked className="mr-2" />
                <span className="text-sm text-gray-700">Current filters only</span>
              </label>
              <label className="flex items-center">
                <input type="radio" name="scope" value="all" className="mr-2" />
                <span className="text-sm text-gray-700">All students</span>
              </label>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}