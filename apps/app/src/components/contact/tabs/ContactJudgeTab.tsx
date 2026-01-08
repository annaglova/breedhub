import { useSelectedEntity } from "@/contexts/SpaceContext";
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
import { Check, ChevronDown, ChevronRight, Minus } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Competition node in the tree
 */
interface Competition {
  id: string;
  name: string;
  internationalJudgment?: boolean;
  subCompetitions?: Competition[];
}

/**
 * Tree node with expanded state tracking
 */
interface TreeNode {
  data: Competition;
  children?: TreeNode[];
  level: number;
}

// Mock data for visual development
const MOCK_COMPETITIONS: Competition[] = [
  {
    id: "comp-1",
    name: "FCI Shows",
    internationalJudgment: true,
    subCompetitions: [
      {
        id: "comp-1-1",
        name: "World Dog Show",
        internationalJudgment: true,
        subCompetitions: [
          {
            id: "comp-1-1-1",
            name: "Best in Show",
            internationalJudgment: true,
          },
          {
            id: "comp-1-1-2",
            name: "Best in Group",
            internationalJudgment: true,
          },
        ],
      },
      {
        id: "comp-1-2",
        name: "European Dog Show",
        internationalJudgment: true,
      },
      {
        id: "comp-1-3",
        name: "National Championships",
        internationalJudgment: false,
        subCompetitions: [
          {
            id: "comp-1-3-1",
            name: "Ukrainian Kennel Union Show",
            internationalJudgment: false,
          },
          {
            id: "comp-1-3-2",
            name: "Regional Shows",
            internationalJudgment: false,
          },
        ],
      },
    ],
  },
  {
    id: "comp-2",
    name: "Working Trials",
    internationalJudgment: false,
    subCompetitions: [
      {
        id: "comp-2-1",
        name: "IPO/IGP Trials",
        internationalJudgment: true,
      },
      {
        id: "comp-2-2",
        name: "Herding Trials",
        internationalJudgment: false,
      },
      {
        id: "comp-2-3",
        name: "Agility Competitions",
        internationalJudgment: false,
      },
    ],
  },
  {
    id: "comp-3",
    name: "Specialty Shows",
    internationalJudgment: true,
    subCompetitions: [
      {
        id: "comp-3-1",
        name: "German Shepherd Specialty",
        internationalJudgment: true,
      },
      {
        id: "comp-3-2",
        name: "Belgian Shepherd Specialty",
        internationalJudgment: true,
      },
    ],
  },
];

/**
 * Convert competition data to tree nodes
 */
function competitionToTreeNode(
  competition: Competition,
  level: number = 0
): TreeNode {
  return {
    data: competition,
    level,
    children: competition.subCompetitions?.map((sub) =>
      competitionToTreeNode(sub, level + 1)
    ),
  };
}

/**
 * Count total nodes in tree (for reporting)
 */
function countNodes(nodes: TreeNode[]): number {
  return nodes.reduce((count, node) => {
    return count + 1 + (node.children ? countNodes(node.children) : 0);
  }, 0);
}

/**
 * TreeTableRow - Single row in the tree table with expand/collapse
 */
function TreeTableRow({
  node,
  expandedIds,
  onToggle,
}: {
  node: TreeNode;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedIds.has(node.data.id);
  const indentPx = node.level * 24;

  return (
    <>
      <TableRow className="hover:bg-muted/50">
        {/* Toggle + Name */}
        <TableCell className="py-2">
          <div className="flex items-center" style={{ paddingLeft: indentPx }}>
            {/* Toggle button */}
            <button
              type="button"
              onClick={() => hasChildren && onToggle(node.data.id)}
              className={cn(
                "w-6 h-6 flex items-center justify-center rounded hover:bg-muted mr-1",
                !hasChildren && "invisible"
              )}
            >
              {isExpanded ? (
                <ChevronDown size={16} className="text-muted-foreground" />
              ) : (
                <ChevronRight size={16} className="text-muted-foreground" />
              )}
            </button>
            {/* Competition name */}
            <span className={cn(node.level === 0 && "font-medium")}>
              {node.data.name}
            </span>
          </div>
        </TableCell>

        {/* International judgment */}
        <TableCell className="w-32 text-center py-2">
          {node.data.internationalJudgment ? (
            <Check size={16} className="text-accent-400 mx-auto" />
          ) : (
            <Minus size={16} className="text-secondary-400 mx-auto" />
          )}
        </TableCell>
      </TableRow>

      {/* Render children if expanded */}
      {hasChildren &&
        isExpanded &&
        node.children!.map((child) => (
          <TreeTableRow
            key={child.data.id}
            node={child}
            expandedIds={expandedIds}
            onToggle={onToggle}
          />
        ))}
    </>
  );
}

interface ContactJudgeTabProps {
  onLoadedCount?: (count: number) => void;
}

/**
 * ContactJudgeTab - Contact's judge career information
 *
 * Displays hierarchical tree table of competitions
 * that this person can judge, with international judgment indicator.
 *
 * Based on Angular: contact-judge.component.ts
 */
export function ContactJudgeTab({ onLoadedCount }: ContactJudgeTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();

  // Track expanded nodes
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Start with top-level nodes expanded
    return new Set(MOCK_COMPETITIONS.map((c) => c.id));
  });

  // TODO: Load real data from entity when available
  // For now always using mock data for visual development
  const competitions = MOCK_COMPETITIONS;

  // Convert to tree nodes
  const treeNodes = competitions.map((c) => competitionToTreeNode(c));

  // Report loaded count
  useEffect(() => {
    if (onLoadedCount) {
      onLoadedCount(countNodes(treeNodes));
    }
  }, [onLoadedCount, treeNodes.length]);

  // Toggle expand/collapse
  const handleToggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (treeNodes.length === 0) {
    return (
      <div className="text-secondary p-8 text-center">
        No competition data available
      </div>
    );
  }

  return (
    <div className="px-6 cursor-default">
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="py-3 pl-4">Competition</TableHead>
              <TableHead className="w-32 text-center py-3">
                Inter. judgment
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {treeNodes.map((node) => (
              <TreeTableRow
                key={node.data.id}
                node={node}
                expandedIds={expandedIds}
                onToggle={handleToggle}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
