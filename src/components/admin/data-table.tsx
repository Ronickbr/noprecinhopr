import { useMemo, useState, type ReactNode } from "react";
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Inbox, AlertCircle, RefreshCw } from "lucide-react";
import { getErrorMessage } from "@/lib/errors";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  width?: string;
  className?: string;
};

type Props<T> = {
  rows: T[] | undefined;
  columns: Column<T>[];
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyMessage?: string;
  emptyHint?: string;
  getRowId?: (row: T) => string;
  onRowClick?: (row: T) => void;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  onSortChange?: (key: string, dir: "asc" | "desc") => void;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  toolbar?: ReactNode;
};

export function DataTable<T>({
  rows,
  columns,
  isLoading,
  error,
  onRetry,
  emptyMessage = "Nenhum registro encontrado.",
  emptyHint,
  getRowId,
  onRowClick,
  sortKey,
  sortDir,
  onSortChange,
  page,
  pageSize,
  total,
  onPageChange,
  toolbar,
}: Props<T>) {
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({});
  const shown = useMemo(
    () => columns.filter((c) => visibleCols[c.key] !== false),
    [columns, visibleCols],
  );

  const totalPages = pageSize && total ? Math.max(1, Math.ceil(total / pageSize)) : 1;

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      {toolbar && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3">
          {toolbar}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 text-left text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              {shown.map((col) => {
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    style={{ width: col.width, textAlign: col.align ?? "left" }}
                    className="px-4 py-2.5 font-medium"
                  >
                    {col.sortable && onSortChange ? (
                      <button
                        onClick={() => onSortChange(col.key, isSorted && sortDir === "asc" ? "desc" : "asc")}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        {col.header}
                        {isSorted && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {shown.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={shown.length} className="px-4 py-16 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-destructive/10 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-medium text-destructive">Não foi possível carregar</p>
                    <p className="text-xs text-muted-foreground">{getErrorMessage(error)}</p>
                    {onRetry && (
                      <button
                        onClick={onRetry}
                        className="mt-1 inline-flex h-8 items-center gap-1.5 rounded-md border border-border/60 bg-card px-3 text-xs font-medium hover:bg-accent"
                      >
                        <RefreshCw className="h-3 w-3" /> Tentar novamente
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (rows ?? []).length === 0 ? (
              <tr>
                <td colSpan={shown.length} className="px-4 py-16 text-center">
                  <div className="mx-auto flex max-w-xs flex-col items-center gap-2 text-muted-foreground">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-muted">
                      <Inbox className="h-4 w-4" />
                    </div>
                    <p className="text-sm">{emptyMessage}</p>
                    {emptyHint && <p className="text-xs">{emptyHint}</p>}
                  </div>
                </td>
              </tr>
            ) : (
              rows!.map((row, idx) => (
                <tr
                  key={getRowId?.(row) ?? idx}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={onRowClick ? "cursor-pointer transition-colors hover:bg-accent/40" : ""}
                >
                  {shown.map((col) => (
                    <td
                      key={col.key}
                      style={{ textAlign: col.align ?? "left" }}
                      className={`px-4 py-3 align-middle ${col.className ?? ""}`}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {(onPageChange || total != null) && !isLoading && (rows?.length ?? 0) > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-4 py-3 text-xs text-muted-foreground">
          <span className="font-mono">
            {total != null ? `${total.toLocaleString("pt-BR")} registros` : ""}
          </span>
          {onPageChange && page && (
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                className="grid h-7 w-7 place-items-center rounded-md border border-border/60 disabled:opacity-40 hover:bg-accent"
                aria-label="Anterior"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 font-mono">{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                className="grid h-7 w-7 place-items-center rounded-md border border-border/60 disabled:opacity-40 hover:bg-accent"
                aria-label="Próxima"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Column visibility spacer to keep API surface — hidden intentionally for now */}
      <div className="sr-only">
        {columns.map((c) => (
          <label key={c.key}>
            <input
              type="checkbox"
              checked={visibleCols[c.key] !== false}
              onChange={(e) => setVisibleCols((v) => ({ ...v, [c.key]: e.target.checked }))}
            />
            {c.header}
          </label>
        ))}
      </div>
    </div>
  );
}
