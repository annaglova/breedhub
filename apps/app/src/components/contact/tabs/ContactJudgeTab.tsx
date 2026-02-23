import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore, supabase } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ui/components/table";
import { cn } from "@ui/lib/utils";
import { Check, ChevronDown, ChevronRight, Loader2, Minus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

interface TreeNode {
  id: string;
  name: string;
  order: number;
  hasEntry: boolean;
  internationalJudgment: boolean;
  hasChildren: boolean;
  children: TreeNode[];
  isLoaded: boolean;
  isExpanded: boolean;
}

interface RpcRow {
  id: string;
  name: string;
  competition_order: number;
  has_entry: boolean;
  international_judgment: boolean;
  has_children: boolean;
}

async function loadLevel(contactId: string, parentId: string | null): Promise<TreeNode[]> {
  const { data, error } = await supabase.rpc('get_contact_judge_tree_level', {
    p_contact_id: contactId,
    p_parent_id: parentId,
  });
  if (error) {
    console.error('Failed to load judge tree level:', error);
    return [];
  }
  return ((data as RpcRow[]) || []).map(row => ({
    id: row.id,
    name: row.name,
    order: row.competition_order,
    hasEntry: row.has_entry,
    internationalJudgment: row.international_judgment,
    hasChildren: row.has_children,
    children: [],
    isLoaded: false,
    isExpanded: false,
  }));
}

/** Recursively update a node in the tree by id */
function updateNodeInTree(
  nodes: TreeNode[],
  nodeId: string,
  updater: (node: TreeNode) => TreeNode,
): TreeNode[] {
  return nodes.map(node => {
    if (node.id === nodeId) return updater(node);
    if (node.children.length > 0) {
      const updatedChildren = updateNodeInTree(node.children, nodeId, updater);
      if (updatedChildren !== node.children) {
        return { ...node, children: updatedChildren };
      }
    }
    return node;
  });
}

/** Count nodes with hasEntry in the tree (for badge count) */
function countEntries(nodes: TreeNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (node.hasEntry) count++;
    count += countEntries(node.children);
  }
  return count;
}

/** Flatten tree into visible rows for rendering */
function flattenVisible(
  nodes: TreeNode[],
  level = 0,
): Array<{ node: TreeNode; level: number }> {
  const result: Array<{ node: TreeNode; level: number }> = [];
  for (const node of nodes) {
    result.push({ node, level });
    if (node.isExpanded && node.isLoaded) {
      result.push(...flattenVisible(node.children, level + 1));
    }
  }
  return result;
}

interface ContactJudgeTabProps {
  onLoadedCount?: (count: number) => void;
  dataSource?: unknown;
}

/**
 * ContactJudgeTab - Judge competition tree with lazy loading by levels.
 *
 * Two modes:
 * - Drawer: shows BIS root auto-expanded with groups. Clicking expand navigates to fullscreen.
 * - Fullscreen: full lazy loading — expand/collapse loads children on demand via RPC.
 */
export function ContactJudgeTab({
  onLoadedCount,
}: ContactJudgeTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const contactId = selectedEntity?.id;
  const isFullscreen = spaceStore.isFullscreen.value;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [roots, setRoots] = useState<TreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandingIds, setExpandingIds] = useState<Set<string>>(new Set());
  const contactIdRef = useRef(contactId);
  const rootsRef = useRef(roots);
  rootsRef.current = roots;

  // Load root level
  useEffect(() => {
    contactIdRef.current = contactId;
    if (!contactId) {
      setRoots([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setRoots([]);

    loadLevel(contactId, null).then(async nodes => {
      if (contactIdRef.current !== contactId) return;
      // Auto-expand first root node (BIS)
      if (nodes.length > 0 && nodes[0].hasChildren) {
        const children = await loadLevel(contactId, nodes[0].id);
        if (contactIdRef.current !== contactId) return;
        nodes[0] = { ...nodes[0], children, isLoaded: true, isExpanded: true };

        // Auto-expand node from URL ?expand=nodeId (drawer→fullscreen transition)
        const expandId = searchParams.get('expand');
        if (expandId) {
          const target = nodes[0].children.find(c => c.id === expandId);
          if (target?.hasChildren) {
            const grandchildren = await loadLevel(contactId, expandId);
            if (contactIdRef.current !== contactId) return;
            const idx = nodes[0].children.indexOf(target);
            nodes[0].children[idx] = { ...target, children: grandchildren, isLoaded: true, isExpanded: true };
          }
          // Clean up expand param from URL
          setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.delete('expand');
            return next;
          }, { replace: true });
        }
      }
      setRoots(nodes);
      setIsLoading(false);
    });
  }, [contactId]);

  // Report entry count
  const entryCount = useMemo(() => countEntries(roots), [roots]);

  useEffect(() => {
    if (onLoadedCount) onLoadedCount(entryCount);
  }, [onLoadedCount, entryCount]);

  const handleToggle = useCallback(async (nodeId: string) => {
    // Drawer mode: navigate to fullscreen with expand hint
    if (!isFullscreen) {
      const slug = selectedEntity?.slug;
      if (slug) {
        navigate(`/${slug}/judge?expand=${nodeId}`);
      }
      return;
    }

    // Fullscreen mode: regular expand/collapse with lazy loading
    const cId = contactIdRef.current;
    if (!cId) return;

    const findNode = (nodes: TreeNode[]): TreeNode | undefined => {
      for (const n of nodes) {
        if (n.id === nodeId) return n;
        const found = findNode(n.children);
        if (found) return found;
      }
      return undefined;
    };

    const node = findNode(rootsRef.current);
    if (!node) return;

    if (node.isLoaded) {
      setRoots(prev => updateNodeInTree(prev, nodeId, n => ({
        ...n,
        isExpanded: !n.isExpanded,
      })));
      return;
    }

    // Load children
    setExpandingIds(prev => new Set(prev).add(nodeId));
    const children = await loadLevel(cId, nodeId);
    if (contactIdRef.current !== cId) return;
    setRoots(prev =>
      updateNodeInTree(prev, nodeId, n => ({
        ...n,
        children,
        isLoaded: true,
        isExpanded: true,
      })),
    );
    setExpandingIds(prev => {
      const next = new Set(prev);
      next.delete(nodeId);
      return next;
    });
  }, [isFullscreen, selectedEntity?.slug, navigate]);

  const visibleRows = useMemo(() => flattenVisible(roots), [roots]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <span className="text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (roots.length === 0) {
    return (
      <span className="text-secondary p-8 text-center block">
        No competition data available
      </span>
    );
  }

  return (
    <div className="cursor-default">
      <div className="border border-border rounded-lg overflow-hidden">
        <Table className="text-base">
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="py-3 pl-4 text-base">Competition</TableHead>
              <TableHead className="w-32 text-center py-3 text-base">
                Inter. judgment
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map(({ node, level }, index) => {
              const isExpanded = node.isExpanded;
              const isExpanding = expandingIds.has(node.id);
              const indentPx = level * 24;

              return (
                <TableRow key={`${node.id}-${index}`} className="hover:bg-muted/50">
                  <TableCell className="py-2 text-base">
                    <div className="flex items-center" style={{ paddingLeft: indentPx }}>
                      <button
                        type="button"
                        onClick={() => node.hasChildren && handleToggle(node.id)}
                        className={cn(
                          "w-6 h-6 flex items-center justify-center rounded hover:bg-muted mr-1",
                          !node.hasChildren && "invisible"
                        )}
                      >
                        {isExpanding ? (
                          <Loader2 size={14} className="text-muted-foreground animate-spin" />
                        ) : isExpanded ? (
                          <ChevronDown size={16} className="text-muted-foreground" />
                        ) : (
                          <ChevronRight size={16} className="text-muted-foreground" />
                        )}
                      </button>
                      <span className={cn(level === 0 && "font-medium")}>
                        {node.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="w-32 text-center py-2 text-base">
                    {node.hasEntry ? (
                      node.internationalJudgment ? (
                        <Check size={16} className="text-accent-400 mx-auto" />
                      ) : (
                        <Minus size={16} className="text-secondary-400 mx-auto" />
                      )
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
