import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import {
  TrendingUp, TrendingDown, Activity,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { dashboardApi } from '../api/dashboard';
import { AppLayout } from '../components/layout/AppLayout';
import { useAuth } from '../store/authContext';

const fmt = (v: string | number) =>
  Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function StatCard({
  title, value, icon: Icon, color, sub
}: { title: string; value: string; icon: any; color: string; sub?: string }) {
  return (
    <div className="stat-card group">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{title}</p>
        <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
        {sub && <p className="mt-1 text-xs text-[var(--text-muted)]">{sub}</p>}
      </div>
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color} bg-current/10 opacity-80`}>
        <Icon size={22} className={color} />
      </div>
    </div>
  );
}

const GRANULARITIES = ['daily', 'weekly', 'monthly', 'quarterly'] as const;
type Gran = typeof GRANULARITIES[number];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 shadow-xl text-xs">
      <p className="mb-2 font-semibold text-[var(--text-secondary)]">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[var(--text-muted)]">{p.name}:</span>
          <span className="font-semibold" style={{ color: p.color }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const [gran, setGran] = useState<Gran>('monthly');
  const [compare, setCompare] = useState(false);

  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: dashboardApi.summary,
  });

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['dashboard-trends', gran, compare],
    queryFn: () => dashboardApi.trends(gran, compare),
  });

  const { data: categories } = useQuery({
    queryKey: ['dashboard-categories'],
    queryFn: dashboardApi.byCategory,
  });

  const { data: recent } = useQuery({
    queryKey: ['dashboard-recent'],
    queryFn: dashboardApi.recent,
  });

  const trendData = (trends?.current_period ?? []).map((p, i) => {
    const prev = trends?.previous_period?.[i];
    return {
      name: p.period.slice(0, 7),
      Income: Number(p.income),
      Expenses: Number(p.expenses),
      ...(prev ? { 'Prev Income': Number(prev.income), 'Prev Expenses': Number(prev.expenses) } : {}),
    };
  });

  const catData = (categories ?? []).slice(0, 8).map((c) => ({
    name: c.category,
    Income: Number(c.total_income),
    Expenses: Number(c.total_expenses),
  }));

  const net = Number(summary?.net_balance ?? 0);

  return (
    <AppLayout>
      <div className="flex-1 space-y-6 p-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
            <p className="text-sm text-[var(--text-muted)]">Financial overview across all records</p>
            {user?.role === 'VIEWER' && (
              <p className="mt-2 max-w-2xl text-xs text-[var(--text-secondary)]">
                View-only role: use the dashboard below for totals, trends, and recent activity. The full searchable ledger is under <strong className="text-[var(--text-muted)]">Records</strong> for Analysts and Admins.
              </p>
            )}
          </div>
        </div>

        {/* Summary cards */}
        {sumLoading ? (
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card h-32 animate-pulse bg-[var(--bg-card-hover)]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard
              title="Total Income"
              value={fmt(summary?.total_income ?? 0)}
              icon={TrendingUp}
              color="text-green-400"
              sub="All-time"
            />
            <StatCard
              title="Total Expenses"
              value={fmt(summary?.total_expenses ?? 0)}
              icon={TrendingDown}
              color="text-red-400"
              sub="All-time"
            />
            <StatCard
              title="Net Balance"
              value={fmt(summary?.net_balance ?? 0)}
              icon={net >= 0 ? ArrowUpRight : ArrowDownRight}
              color={net >= 0 ? 'text-brand-400' : 'text-orange-400'}
              sub={net >= 0 ? 'Positive balance' : 'Negative balance'}
            />
            <StatCard
              title="Total Records"
              value={(summary?.record_count ?? 0).toLocaleString()}
              icon={Activity}
              color="text-slate-400"
              sub="Non-deleted"
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          {/* Trend chart */}
          <div className="card xl:col-span-3">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Income vs Expenses Trend</h2>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={compare}
                    onChange={(e) => setCompare(e.target.checked)}
                    className="accent-brand-500"
                  />
                  Compare period
                </label>
                <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
                  {GRANULARITIES.map((g) => (
                    <button
                      key={g}
                      onClick={() => setGran(g)}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        gran === g
                          ? 'bg-brand-600 text-white'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {g.charAt(0).toUpperCase() + g.slice(1, 3)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {trendsLoading ? (
              <div className="h-64 animate-pulse rounded-lg bg-[var(--bg-card-hover)]" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                  <Line type="monotone" dataKey="Income" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Expenses" stroke="#ef4444" strokeWidth={2} dot={false} />
                  {compare && <Line type="monotone" dataKey="Prev Income" stroke="#22c55e" strokeWidth={1} strokeDasharray="4 4" dot={false} />}
                  {compare && <Line type="monotone" dataKey="Prev Expenses" stroke="#ef4444" strokeWidth={1} strokeDasharray="4 4" dot={false} />}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Category chart */}
          <div className="card xl:col-span-2">
            <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">By Category</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={catData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Income" fill="#22c55e" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Expenses" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent records */}
        <div className="card">
          <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Recent Transactions</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="table-th">Date</th>
                  <th className="table-th">Category</th>
                  <th className="table-th">Type</th>
                  <th className="table-th text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(recent ?? []).map((r) => (
                  <tr key={r.id} className="table-row">
                    <td className="table-td text-[var(--text-muted)]">{r.date}</td>
                    <td className="table-td font-medium">{r.category}</td>
                    <td className="table-td">
                      <span className={r.type === 'INCOME' ? 'badge-income' : 'badge-expense'}>
                        {r.type === 'INCOME' ? '↑' : '↓'} {r.type}
                      </span>
                    </td>
                    <td className={`table-td text-right font-semibold ${r.type === 'INCOME' ? 'text-green-400' : 'text-red-400'}`}>
                      {r.type === 'INCOME' ? '+' : '-'}{fmt(r.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
