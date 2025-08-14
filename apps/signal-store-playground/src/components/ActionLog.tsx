import { Activity } from 'lucide-react';

interface ActionLogProps {
  logs: string[];
}

export default function ActionLog({ logs }: ActionLogProps) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-primary-600" />
        <h3 className="font-semibold text-lg">Action Log</h3>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {logs.length === 0 ? (
          <p className="text-gray-500 text-sm">No actions yet</p>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className="text-sm px-3 py-2 bg-gray-50 rounded-lg border-l-2 border-primary-400"
            >
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
}