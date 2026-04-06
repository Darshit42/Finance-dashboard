import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, UserCheck, UserX, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { usersApi } from '../api/users';
import { AppLayout } from '../components/layout/AppLayout';
import { useAuth } from '../store/authContext';
import type { Role, User } from '../types';

const ROLES: Role[] = ['VIEWER', 'ANALYST', 'ADMIN'];

const roleColors: Record<Role, string> = {
  ADMIN: 'bg-purple-500/15 text-purple-400 border border-purple-500/25',
  ANALYST: 'bg-blue-500/15 text-blue-400 border border-blue-500/25',
  VIEWER: 'bg-slate-500/15 text-slate-400 border border-slate-500/25',
};

export default function Users() {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users', page],
    queryFn: () => usersApi.list(page, 20),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] });

  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => usersApi.updateRole(id, role),
    onSuccess: invalidate,
  });

  const statusMut = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => usersApi.updateStatus(id, is_active),
    onSuccess: invalidate,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => { invalidate(); setDeleteTarget(null); },
  });

  const pages = data?.pages ?? 1;

  return (
    <AppLayout>
      <div className="flex-1 space-y-5 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">User Management</h1>
            <p className="text-sm text-[var(--text-muted)]">{data?.total ?? 0} registered users</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/15 border border-purple-500/25">
            <Shield size={16} className="text-purple-400" />
          </div>
        </div>

        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--bg-secondary)]">
                <tr>
                  <th className="table-th">User</th>
                  <th className="table-th">Role</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Joined</th>
                  <th className="table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? [...Array(6)].map((_, i) => (
                    <tr key={i} className="table-row">
                      {[...Array(5)].map((_, j) => (
                        <td key={j} className="table-td">
                          <div className="h-4 animate-pulse rounded bg-[var(--bg-card-hover)]" />
                        </td>
                      ))}
                    </tr>
                  ))
                  : (data?.items ?? []).map((u) => {
                    const isSelf = u.id === me?.id;
                    return (
                      <tr key={u.id} className="table-row">
                        {/* User */}
                        <td className="table-td">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600/20 text-xs font-bold text-brand-400">
                              {u.name[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-[var(--text-primary)]">
                                {u.name}
                                {isSelf && <span className="ml-2 text-[10px] text-brand-400 font-normal">(you)</span>}
                              </div>
                              <div className="text-xs text-[var(--text-muted)]">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Role selector */}
                        <td className="table-td">
                          <select
                            id={`role-select-${u.id}`}
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold cursor-pointer ${roleColors[u.role]} bg-transparent`}
                            value={u.role}
                            disabled={isSelf}
                            onChange={(e) => roleMut.mutate({ id: u.id, role: e.target.value as Role })}
                          >
                            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </td>

                        {/* Status */}
                        <td className="table-td">
                          <button
                            id={`status-toggle-${u.id}`}
                            disabled={isSelf}
                            onClick={() => statusMut.mutate({ id: u.id, is_active: !u.is_active })}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
                              u.is_active
                                ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/20'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {u.is_active ? <><UserCheck size={11} /> Active</> : <><UserX size={11} /> Inactive</>}
                          </button>
                        </td>

                        {/* Joined */}
                        <td className="table-td text-[var(--text-muted)]">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>

                        {/* Actions */}
                        <td className="table-td text-right">
                          <button
                            id={`delete-user-${u.id}`}
                            disabled={isSelf}
                            onClick={() => setDeleteTarget(u)}
                            className="rounded p-1.5 text-[var(--text-muted)] hover:bg-red-600/10 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
              <span className="text-xs text-[var(--text-muted)]">Page {page} of {pages}</span>
              <div className="flex gap-1">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary px-2.5 py-1.5 disabled:opacity-40">
                  <ChevronLeft size={14} />
                </button>
                <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="btn-secondary px-2.5 py-1.5 disabled:opacity-40">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
          <div className="card max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-lg font-bold">Delete <span className="text-red-400">{deleteTarget.name}</span>?</h2>
            <p className="mb-6 text-sm text-[var(--text-muted)]">
              This will soft-delete the account. The user will lose all access immediately.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={() => deleteMut.mutate(deleteTarget.id)}
                disabled={deleteMut.isPending}
                className="btn-danger flex-1"
              >
                {deleteMut.isPending ? 'Deleting…' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
