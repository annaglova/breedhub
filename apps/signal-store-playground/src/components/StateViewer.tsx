import { useState } from 'react';
import { ChevronDown, ChevronRight, Eye } from 'lucide-react';

interface StateViewerProps {
  state: any;
  title?: string;
}

export default function StateViewer({ state, title = 'Store State' }: StateViewerProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['root']));

  const toggleExpand = (path: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const renderValue = (value: any, path: string = 'root', depth: number = 0): JSX.Element => {
    if (value === null) return <span className="text-gray-500">null</span>;
    if (value === undefined) return <span className="text-gray-500">undefined</span>;
    
    const type = typeof value;
    
    if (type === 'boolean') {
      return <span className="text-blue-600">{value.toString()}</span>;
    }
    
    if (type === 'number') {
      return <span className="text-green-600">{value}</span>;
    }
    
    if (type === 'string') {
      return <span className="text-orange-600">"{value}"</span>;
    }
    
    if (value instanceof Date) {
      return <span className="text-purple-600">{value.toISOString()}</span>;
    }
    
    if (Array.isArray(value)) {
      const isExpanded = expanded.has(path);
      
      if (value.length === 0) {
        return <span className="text-gray-500">[]</span>;
      }
      
      return (
        <div>
          <button
            onClick={() => toggleExpand(path)}
            className="flex items-center gap-1 hover:bg-gray-100 px-1 rounded"
          >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <span className="text-gray-600">Array({value.length})</span>
          </button>
          {isExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {value.map((item, index) => (
                <div key={index} className="flex">
                  <span className="text-gray-500 mr-2">{index}:</span>
                  {renderValue(item, `${path}.${index}`, depth + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    if (type === 'object') {
      const isExpanded = expanded.has(path);
      const entries = Object.entries(value);
      
      if (entries.length === 0) {
        return <span className="text-gray-500">{'{}'}</span>;
      }
      
      return (
        <div>
          <button
            onClick={() => toggleExpand(path)}
            className="flex items-center gap-1 hover:bg-gray-100 px-1 rounded"
          >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <span className="text-gray-600">Object</span>
          </button>
          {isExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {entries.map(([key, val]) => (
                <div key={key} className="flex">
                  <span className="text-purple-600 mr-2">{key}:</span>
                  {renderValue(val, `${path}.${key}`, depth + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    return <span className="text-gray-600">{type}</span>;
  };

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Eye className="w-5 h-5 text-primary-600" />
        <h3 className="font-semibold text-lg">{title}</h3>
      </div>
      <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm overflow-auto max-h-96">
        {renderValue(state)}
      </div>
    </div>
  );
}