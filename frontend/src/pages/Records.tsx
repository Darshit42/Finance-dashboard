import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { recordsApi } from '../api/records';
import { AppLayout } from '../components/layout/AppLayout';
import { useAuth } from '../store/authContext';
import type { FinancialRecord, RecordFilters, CreateRecordPayload, UpdateRecordPayload } from '../types';

const fmt = (v: string | number) =>
  Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

// ── Record Modal ─────────────────────────────────────────────────────────────
function RecordModal({
  record,
  onClose,
  onSave,
}: {
  record?: FinancialRecord;
  onClose: () => void;
  onSave: (data: CreateRecordPayload | UpdateRecordPayload) => void;
}) {
  const [amount, setAmount] = useState(record ? String(record.amount) : '');
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>(record?.type ?? 'INCOME');
  const [category, setCategory] = useState(record?.category ?? '');
  const [date, setDate] = useState(record?.date ?? new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(record?.notes ?? '');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError('Amount must be a positive number'); return; }
    if (!category.trim()) { setError('Category is required'); return; }
    onSave({ amount: amt, type, category: category.trim(), date, notes: notes || undefined });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold">{record ? 'Edit Record' : 'New Record'}</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={18} /></button>
        </div>
        {error && <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-400">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as any)} className="input">
                <option value="INCOME">INCOME</option>
                <option value="EXPENSE">EXPENSE</option>
              </select>
            </div>
            <div>
              <label className="label">Amount ($)</label>
              <input type="number" step="0.01" min="0.01" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="label">Category</label>
            <input type="text" className="input" placeholder="e.g. Salary, Rent…" value={category} onChange={(e) => setCategory(e.target.value)} required />
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="input resize-none" rows={2} placeholder="Free-form description…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">{record ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function Records() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canWrite = user?.role === 'ADMIN';
  const canDelete = user?.role === 'ADMIN';

  const [filters, setFilters] = useState<RecordFilters>({ page: 1, page_size: 20 });
  const [showFilters, setShowFilters] = useState(false);
  const [modal, setModal] = useState<'create' | FinancialRecord | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['records', filters],
    queryFn: () => recordsApi.list(filters),
  });

  const invalidateRecordsAndDashboard = () => {
    qc.invalidateQueries({ queryKey: ['records'] });
    qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
    qc.invalidateQueries({ queryKey: ['dashboard-trends'] });
    qc.invalidateQueries({ queryKey: ['dashboard-categories'] });
    qc.invalidateQueries({ queryKey: ['dashboard-recent'] });
  };

  const createMut = useMutation({
    mutationFn: (payload: CreateRecordPayload) => recordsApi.create(payload),
    onSuccess: () => {
      invalidateRecordsAndDashboard();
      setModal(null);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRecordPayload }) => recordsApi.update(id, payload),
    onSuccess: () => {
      invalidateRecordsAndDashboard();
      setModal(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => recordsApi.delete(id),
    onSuccess: () => {
      invalidateRecordsAndDashboard();
      setDeleteId(null);
    },
  });

  function handleSave(data: CreateRecordPayload | UpdateRecordPayload) {
    if (modal === 'create') {
      createMut.mutate(data as CreateRecordPayload);
    } else if (modal && typeof modal === 'object') {
      updateMut.mutate({ id: modal.id, payload: data });
    }
  }

  const pages = data?.pages ?? 1;
  const page = filters.page ?? 1;
  const tableColCount = canWrite || canDelete ? 6 : 5;

  return (
    <AppLayout>
      <div className="flex-1 space-y-5 p-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Records</h1>
            <p className="text-sm text-[var(--text-muted)]">
              {data?.total ?? 0} transactions total
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary">
              <Filter size={14} /> Filters
            </button>
            {canWrite && (
              <button id="create-record-btn" onClick={() => setModal('create')} className="btn-primary">
                <Plus size={14} /> New Record
              </button>
            )}
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="card grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <div>
              <label className="label">From</label>
              <input type="date" className="input" value={filters.date_from ?? ''} onChange={(e) => setFilters(f => ({ ...f, date_from: e.target.value || undefined, page: 1 }))} />
            </div>
            <div>
              <label className="label">To</label>
              <input type="date" className="input" value={filters.date_to ?? ''} onChange={(e) => setFilters(f => ({ ...f, date_to: e.target.value || undefined, page: 1 }))} />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={filters.type ?? ''} onChange={(e) => setFilters(f => ({ ...f, type: (e.target.value as any) || undefined, page: 1 }))}>
                <option value="">All</option>
                <option value="INCOME">Income</option>
                <option value="EXPENSE">Expense</option>
              </select>
            </div>
            <div>
              <label className="label">Category</label>
              <input type="text" className="input" placeholder="Search…" value={filters.category ?? ''} onChange={(e) => setFilters(f => ({ ...f, category: e.target.value || undefined, page: 1 }))} />
            </div>
            <div>
              <label className="label">Min ($)</label>
              <input type="number" className="input" placeholder="0" value={filters.amount_min ?? ''} onChange={(e) => setFilters(f => ({ ...f, amount_min: e.target.value ? Number(e.target.value) : undefined, page: 1 }))} />
            </div>
            <div>
              <label className="label">Max ($)</label>
              <input type="number" className="input" placeholder="∞" value={filters.amount_max ?? ''} onChange={(e) => setFilters(f => ({ ...f, amount_max: e.target.value ? Number(e.target.value) : undefined, page: 1 }))} />
            </div>
          </div>
        )}

        {/* Table */}
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--bg-secondary)]">
                <tr>
                  <th className="table-th">Date</th>
                  <th className="table-th">Category</th>
                  <th className="table-th">Type</th>
                  <th className="table-th text-right">Amount</th>
                  <th className="table-th">Notes</th>
                  {(canWrite || canDelete) && <th className="table-th text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? [...Array(8)].map((_, i) => (
                    <tr key={i} className="table-row">
                      {[...Array(tableColCount)].map((_, j) => (
                        <td key={j} className="table-td">
                          <div className="h-4 animate-pulse rounded bg-[var(--bg-card-hover)]" />
                        </td>
                      ))}
                    </tr>
                  ))
                  : (data?.items ?? []).map((r) => (
                    <tr key={r.id} className="table-row">
                      <td className="table-td text-[var(--text-muted)]">{r.date}</td>
                      <td className="table-td font-medium">{r.category}</td>
                      <td className="table-td">
                        <span className={r.type === 'INCOME' ? 'badge-income' : 'badge-expense'}>
                          {r.type === 'INCOME' ? '↑' : '↓'} {r.type}
                        </span>
                      </td>
                      <td className={`table-td text-right font-semibold tabular-nums ${r.type === 'INCOME' ? 'text-green-400' : 'text-red-400'}`}>
                        {r.type === 'INCOME' ? '+' : '-'}{fmt(r.amount)}
                      </td>
                      <td className="table-td max-w-xs truncate text-[var(--text-muted)]">{r.notes ?? '—'}</td>
                      {(canWrite || canDelete) && (
                        <td className="table-td text-right">
                          <div className="flex items-center justify-end gap-1">
                            {canWrite && (
                              <button onClick={() => setModal(r)} className="rounded p-1.5 text-[var(--text-muted)] hover:bg-brand-600/10 hover:text-brand-400 transition-colors">
                                <Pencil size={13} />
                              </button>
                            )}
                            {canDelete && (
                              <button onClick={() => setDeleteId(r.id)} className="rounded p-1.5 text-[var(--text-muted)] hover:bg-red-600/10 hover:text-red-400 transition-colors">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
              <span className="text-xs text-[var(--text-muted)]">Page {page} of {pages} ({data?.total} records)</span>
              <div className="flex items-center gap-1">
                <button disabled={page <= 1} onClick={() => setFilters(f => ({ ...f, page: page - 1 }))} className="btn-secondary px-2.5 py-1.5 disabled:opacity-40">
                  <ChevronLeft size={14} />
                </button>
                <button disabled={page >= pages} onClick={() => setFilters(f => ({ ...f, page: page + 1 }))} className="btn-secondary px-2.5 py-1.5 disabled:opacity-40">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit modal */}
      {modal !== null && (
        <RecordModal
          record={modal === 'create' ? undefined : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDeleteId(null)}>
          <div className="card max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-lg font-bold">Delete Record?</h2>
            <p className="mb-6 text-sm text-[var(--text-muted)]">This will soft-delete the record. It can be restored by an Admin.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => deleteMut.mutate(deleteId!)} disabled={deleteMut.isPending} className="btn-danger flex-1">
                {deleteMut.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
