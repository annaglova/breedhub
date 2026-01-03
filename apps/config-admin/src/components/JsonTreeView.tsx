import { ChevronRight, ChevronDown, Copy, Check, Maximize2, Minimize2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface JsonTreeViewProps {
  data: any;
  initialExpanded?: boolean;
  searchTerm?: string;
}

interface TreeNodeProps {
  nodeKey: string;
  value: any;
  level?: number;
  searchTerm?: string;
  path?: string;
  forceExpandAll?: boolean;
  forceCollapseAll?: boolean;
}

function TreeNode({ nodeKey, value, level = 0, searchTerm = '', path = '', forceExpandAll = false, forceCollapseAll = false }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 3); // Auto-expand first 3 levels by default
  
  // Handle force expand/collapse
  useEffect(() => {
    if (forceExpandAll) {
      setIsExpanded(true);
    } else if (forceCollapseAll) {
      setIsExpanded(level < 3); // Reset to default for levels < 3, collapse others
    }
  }, [forceExpandAll, forceCollapseAll, level]);
  
  const currentPath = path ? `${path}.${nodeKey}` : nodeKey;
  const indent = level * 20;
  
  // Helper to check if value is an object or array
  const isExpandable = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);
  const isEmpty = isExpandable && Object.keys(value).length === 0;
  
  // Count children
  const childCount = isExpandable ? Object.keys(value).length : 0;
  
  // Highlight search term
  const highlightMatch = (text: string) => {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? <span key={i} className="bg-yellow-200">{part}</span> : part
    );
  };
  
  // Check if current node or children match search
  const nodeMatches = searchTerm && nodeKey.toLowerCase().includes(searchTerm.toLowerCase());
  const valueMatches = searchTerm && !isExpandable && String(value).toLowerCase().includes(searchTerm.toLowerCase());
  
  
  // Format primitive values
  const formatValue = (val: any) => {
    if (val === null) return <span className="text-slate-400">null</span>;
    if (val === undefined) return <span className="text-slate-400">undefined</span>;
    if (typeof val === 'boolean') return <span className="text-blue-600">{String(val)}</span>;
    if (typeof val === 'number') return <span className="text-green-600">{val}</span>;
    if (typeof val === 'string') {
      // Check if it's a long string
      if (val.length > 50) {
        return (
          <span className="text-red-600" title={val}>
            "{highlightMatch(val.substring(0, 50))}..."
          </span>
        );
      }
      return <span className="text-red-600">"{highlightMatch(val)}"</span>;
    }
    return String(val);
  };
  
  // Get type label
  const getTypeLabel = () => {
    if (isArray) return `Array[${childCount}]`;
    if (isExpandable) return `Object{${childCount}}`;
    return '';
  };
  
  if (!isExpandable) {
    // Leaf node
    return (
      <div 
        className={`flex items-center py-0.5 hover:bg-slate-50 ${nodeMatches || valueMatches ? 'bg-yellow-50' : ''}`}
        style={{ paddingLeft: `${indent}px` }}
      >
        <span className="text-slate-600 mr-2">{highlightMatch(nodeKey)}:</span>
        {formatValue(value)}
      </div>
    );
  }
  
  // Expandable node
  return (
    <div className={nodeMatches ? 'bg-yellow-50' : ''}>
      <div
        className="flex items-center py-0.5 hover:bg-slate-50 cursor-pointer group"
        style={{ paddingLeft: `${indent}px` }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button className="p-0.5 hover:bg-slate-200 rounded">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500" />
          )}
        </button>
        <span className="text-slate-700 font-medium mx-1">
          {highlightMatch(nodeKey)}
        </span>
        <span className="text-slate-400 text-sm">{getTypeLabel()}</span>
      </div>
      {isExpanded && !isEmpty && (
        <div>
          {Object.entries(value).map(([key, val]) => (
            <TreeNode
              key={key}
              nodeKey={key}
              value={val}
              level={level + 1}
              searchTerm={searchTerm}
              path={currentPath}
              forceExpandAll={forceExpandAll}
              forceCollapseAll={forceCollapseAll}
            />
          ))}
        </div>
      )}
      {isExpanded && isEmpty && (
        <div 
          className="text-slate-400 text-sm py-0.5"
          style={{ paddingLeft: `${indent + 20}px` }}
        >
          {isArray ? '[]' : '{}'}
        </div>
      )}
    </div>
  );
}

export default function JsonTreeView({ data, initialExpanded = false, searchTerm = '' }: JsonTreeViewProps) {
  const [localSearch, setLocalSearch] = useState(searchTerm);
  const [forceExpandAll, setForceExpandAll] = useState(false);
  const [forceCollapseAll, setForceCollapseAll] = useState(false);
  
  // Auto-expand when searching
  useEffect(() => {
    if (localSearch.trim()) {
      setForceExpandAll(true);
      setForceCollapseAll(false);
    }
  }, [localSearch]);
  
  if (!data) {
    return <div className="text-slate-400 p-4">No data</div>;
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="flex items-center gap-2 p-2 border-b bg-slate-50">
        <input
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Search..."
          className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          onClick={() => {
            setForceExpandAll(true);
            setForceCollapseAll(false);
            setTimeout(() => setForceExpandAll(false), 100);
          }}
          className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded"
          title="Expand all"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            setForceCollapseAll(true);
            setForceExpandAll(false);
            setTimeout(() => setForceCollapseAll(false), 100);
          }}
          className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded"
          title="Collapse all"
        >
          <Minimize2 className="w-4 h-4" />
        </button>
      </div>
      
      {/* Tree */}
      <div className="flex-1 overflow-auto font-mono text-sm px-6 py-2">
        {typeof data === 'object' && data !== null ? (
          Object.entries(data).map(([key, value]) => (
            <TreeNode
              key={key}
              nodeKey={key}
              value={value}
              level={0}
              searchTerm={localSearch}
              forceExpandAll={forceExpandAll}
              forceCollapseAll={forceCollapseAll}
            />
          ))
        ) : (
          <div>{String(data)}</div>
        )}
      </div>
    </div>
  );
}