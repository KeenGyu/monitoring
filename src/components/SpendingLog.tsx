import { useMemo, useState } from "react";
import type { NewSpendingInput, SpendingEntry } from "../types.salary";
import { formatDate, todayIso } from "../lib/dates";
import "./SpendingLog.css";

function peso(n: number): string {
  return `\u20b1${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface SpendingLogProps {
  entries: SpendingEntry[];
  onAdd: (input: NewSpendingInput) => void;
  onEdit: (id: string, input: NewSpendingInput) => void;
  onDelete: (id: string) => void;
}

interface FormState {
  id: string | null;
  description: string;
  amount: string;
  date: string;
}

function emptyForm(): FormState {
  return { id: null, description: "", amount: "", date: todayIso() };
}

export function SpendingLog({ entries, onAdd, onEdit, onDelete }: SpendingLogProps) {
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState | null>(null);

  const sorted = useMemo(
    () =>
      [...entries].sort((a, b) =>
        a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)
      ),
    [entries]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((e) => e.description.toLowerCase().includes(q));
  }, [sorted, search]);

  const total = useMemo(() => filtered.reduce((sum, e) => sum + e.amount, 0), [filtered]);

  // Group by date so every small purchase is still easy to scan.
  const groups = useMemo(() => {
    const map = new Map<string, SpendingEntry[]>();
    for (const e of filtered) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  function openAdd() {
    setForm(emptyForm());
  }

  function openEdit(e: SpendingEntry) {
    setForm({ id: e.id, description: e.description, amount: String(e.amount), date: e.date });
  }

  function save() {
    if (!form) return;
    const amount = Number(form.amount);
    if (!form.description.trim() || !Number.isFinite(amount) || amount <= 0 || !form.date) return;
    if (form.id) {
      onEdit(form.id, { description: form.description, amount, date: form.date });
    } else {
      onAdd({ description: form.description, amount, date: form.date });
    }
    setForm(null);
  }

  return (
    <div className="spending-log">
      <div className="spending-log-toolbar">
        <input
          type="text"
          className="spending-search"
          placeholder="Search spending…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-primary" onClick={openAdd}>
          + Log spending
        </button>
      </div>

      <div className="spending-log-total card">
        <span>{filtered.length} {filtered.length === 1 ? "entry" : "entries"}</span>
        <span className="spending-log-total-amount">{peso(total)}</span>
      </div>

      {groups.length === 0 ? (
        <div className="card spending-empty">
          <p>Nothing logged yet — even small purchases count. Tap "+ Log spending" to add one.</p>
        </div>
      ) : (
        <div className="spending-groups">
          {groups.map(([date, dayEntries]) => (
            <div className="spending-group" key={date}>
              <div className="spending-group-date">{formatDate(date)}</div>
              <div className="card spending-group-card">
                {dayEntries.map((e) => (
                  <div className="spending-row" key={e.id}>
                    <span className="spending-row-desc">{e.description}</span>
                    <span className="spending-row-amount">{peso(e.amount)}</span>
                    <span className="spending-row-actions">
                      <button className="salary-inline-btn" onClick={() => openEdit(e)}>
                        edit
                      </button>
                      <button
                        className="salary-inline-btn salary-inline-btn-danger"
                        onClick={() => onDelete(e.id)}
                      >
                        remove
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <div className="modal-overlay" onMouseDown={() => setForm(null)}>
          <div className="card salary-expense-modal" onMouseDown={(e) => e.stopPropagation()}>
            <h3>{form.id ? "Edit spending" : "Log spending"}</h3>
            <div className="field">
              <label>What was it for</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. jeepney fare, load, coffee"
                autoFocus
              />
            </div>
            <div className="field">
              <label>Amount</label>
              <input
                type="text"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="field">
              <label>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="salary-modal-actions">
              <button className="btn btn-ghost" onClick={() => setForm(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={save}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}