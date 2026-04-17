import { Button } from "@ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ui/components/table";
import { cn } from "@ui/lib/utils";
import { Plus } from "lucide-react";
import { useCallback, useState } from "react";

// --- Mock data ---

interface MockPet {
  id: string;
  name: string;
}

const MOCK_PETS: MockPet[] = [
  { id: "p1", name: "Bella" },
  { id: "p2", name: "Rocky" },
  { id: "p3", name: "Luna" },
  { id: "p4", name: "Max" },
  { id: "p5", name: "Daisy" },
];

interface WeightRow {
  id: string;
  date: Date;
  weights: Record<string, number | null>;
}

function createMockRows(): WeightRow[] {
  const now = new Date();
  return [
    {
      id: "r1",
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0),
      weights: { p1: 320, p2: 345, p3: 298, p4: 310, p5: 275 },
    },
    {
      id: "r2",
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 9, 0),
      weights: { p1: 305, p2: 330, p3: 285, p4: 295, p5: 260 },
    },
    {
      id: "r3",
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 9, 0),
      weights: { p1: 290, p2: 315, p3: 270, p4: 280, p5: 245 },
    },
    {
      id: "r4",
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3, 9, 0),
      weights: { p1: 275, p2: 300, p3: 255, p4: 265, p5: 230 },
    },
  ];
}

// --- Component ---

let rowCounter = 100;

function formatDateTime(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}.${month} ${hours}:${minutes}`;
}

export function LitterWeightTab() {
  const [rows, setRows] = useState<WeightRow[]>(createMockRows);
  const pets = MOCK_PETS;

  const handleAddRow = useCallback(() => {
    const newRow: WeightRow = {
      id: `r${++rowCounter}`,
      date: new Date(),
      weights: Object.fromEntries(pets.map((p) => [p.id, null])),
    };
    setRows((prev) => [newRow, ...prev]);
  }, [pets]);

  const handleWeightChange = useCallback(
    (rowId: string, petId: string, value: string) => {
      const numValue = value === "" ? null : Number(value);
      setRows((prev) =>
        prev.map((row) =>
          row.id === rowId
            ? { ...row, weights: { ...row.weights, [petId]: numValue } }
            : row
        )
      );
    },
    []
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Unit: g</span>
        <Button variant="outline" size="sm" onClick={handleAddRow}>
          <Plus className="h-4 w-4 mr-1" />
          Add row
        </Button>
      </div>

      <div className="rounded-md border">
        <Table size="sm">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px] sticky left-0 bg-background z-10">
                Date / Time
              </TableHead>
              {pets.map((pet) => (
                <TableHead key={pet.id} className="text-center min-w-[80px]">
                  {pet.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-xs text-muted-foreground sticky left-0 bg-background z-10">
                  {formatDateTime(row.date)}
                </TableCell>
                {pets.map((pet) => (
                  <TableCell key={pet.id} className="p-0">
                    <input
                      type="number"
                      value={row.weights[pet.id] ?? ""}
                      onChange={(e) =>
                        handleWeightChange(row.id, pet.id, e.target.value)
                      }
                      placeholder="—"
                      className={cn(
                        "w-full h-full px-2 py-1.5 text-center text-sm",
                        "bg-transparent border-0 outline-none",
                        "focus:bg-accent/50 focus:ring-1 focus:ring-ring focus:ring-inset",
                        "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      )}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default LitterWeightTab;
