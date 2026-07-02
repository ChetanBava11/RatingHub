import { useMemo, useState, type ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number | null | undefined;
  sortable?: boolean;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyText?: string;
}

export function DataTable<T>({ columns, data, onRowClick, emptyText = "No records found." }: Props<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return data;
    const getVal = col.sortValue ?? ((r: T) => (r as Record<string, unknown>)[sortKey] as string | number);
    const arr = [...data];
    arr.sort((a, b) => {
      const av = getVal(a);
      const bv = getVal(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [data, sortKey, sortDir, columns]);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            {columns.map((c) => {
              const active = sortKey === c.key;
              const arrow = !c.sortable ? "" : active ? (sortDir === "asc" ? " ↑" : " ↓") : " ↕";
              return (
                <th
                  key={c.key}
                  onClick={c.sortable ? () => toggleSort(c.key) : undefined}
                  className={
                    "px-4 py-2.5 text-left font-semibold text-muted-foreground " +
                    (c.sortable ? "cursor-pointer select-none" : "")
                  }
                >
                  {c.header}
                  <span className="text-xs text-muted-foreground">{arrow}</span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                {emptyText}
              </td>
            </tr>
          ) : (
            sorted.map((row, i) => (
              <tr
                key={i}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={
                  "border-t border-border " +
                  (i % 2 === 1 ? "bg-muted/30 " : "") +
                  (onRowClick ? "cursor-pointer" : "")
                }
              >
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-2.5 text-foreground">
                    {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
