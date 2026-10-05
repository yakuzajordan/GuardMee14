import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { Users, AlertTriangle, MapPin, Settings, RefreshCw, Database, TrendingUp, Shield } from 'lucide-react';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import Card from '../components/ui/Card';
import { adminAPI } from '../services/api';
import { ROLE_LABELS } from '../utils/constants';
import { useI18n } from '../context/i18nContext';

const PIE_COLORS = ['#E53E3E', '#2B6CB0', '#D69E2E', '#38A169', '#805AD5', '#DD6B20', '#319795'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg text-sm">
        <p className="font-semibold text-gray-800">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

function StatCard({ icon: Icon, label, value, color, bg, trend, delay = 0 }) {
  return (
    <div
      className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200/80 p-5 shadow-sm animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center`}>
          <Icon size={20} className={color} />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-medium px-2 py-1 rounded-lg ${trend >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-extrabold text-gray-800 tracking-tight">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function AdminDashboardContent() {
  const { t } = useI18n();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [aiRules, setAiRules] = useState(null);
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(true);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, rulesRes] = await Promise.all([
        adminAPI.stats({ period }),
        adminAPI.users({ limit: 20 }),
        adminAPI.getAIRules(),
      ]);
      setStats(statsRes.data.stats);
      setUsers(usersRes.data.users);
      setAiRules(rulesRes.data.rules);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRoleChange = async (userId, role) => {
    await adminAPI.updateRole(userId, role);
    fetchData();
  };

  const handleToggleActive = async (userId, isActive) => {
    await adminAPI.updateStatus(userId, isActive);
    fetchData();
  };

  const handleSeed = async () => {
    setSeedLoading(true);
    try {
      const res = await adminAPI.seed();
      setSeedMsg(res.data.message + (res.data.accounts ? ` Admin: ${res.data.accounts.admin.email} / ${res.data.accounts.admin.password}` : ''));
      fetchData();
    } finally {
      setSeedLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-12 h-12 border-4 border-securite border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">{t('common.loading')}</p>
        </div>
      </Layout>
    );
  }

  const typeData = stats?.byType?.map((t) => ({ name: t._id, count: t.count })) || [];
  const timelineData = stats?.recentIncidents?.map((d) => ({ date: d._id?.slice(5), count: d.count })) || [];
  const hotZoneData = stats?.hotZones?.slice(0, 5).map((z, i) => ({ zone: `Zone ${i + 1}`, count: z.count })) || [];

  const tabs = [
    { id: 'overview', label: t('admin.overview'), icon: TrendingUp },
    { id: 'users', label: t('admin.usersTab'), icon: Users },
    { id: 'ai', label: t('admin.aiConfig'), icon: Settings },
  ];

  return (
    <Layout>
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6 animate-fade-in-up">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={20} className="text-securite" />
            <h1 className="text-2xl font-bold text-gray-800">{t('admin.title')}</h1>
          </div>
          <p className="text-gray-400 text-sm">{t('admin.subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:border-securite outline-none"
          >
            <option value="7">7 derniers jours</option>
            <option value="30">30 derniers jours</option>
            <option value="90">90 derniers jours</option>
          </select>
          <button
            onClick={handleSeed}
            disabled={seedLoading}
            className="flex items-center gap-2 px-4 py-2 bg-securite text-white rounded-xl text-sm font-medium hover:bg-securite-dark transition-all active:scale-95 disabled:opacity-50"
          >
            {seedLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Database size={14} />}
            {t('admin.initData')}
          </button>
        </div>
      </div>

      {seedMsg && (
        <div className="mb-4 bg-green-50 text-green-700 text-sm p-3.5 rounded-xl border border-green-200 animate-slide-down">
          ✅ {seedMsg}
          <button onClick={() => setSeedMsg('')} className="ml-2 text-green-500 hover:text-green-700">×</button>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={AlertTriangle} label={t('admin.incidents')} value={stats?.totalIncidents ?? 0} color="text-urgence" bg="bg-red-50" trend={12} delay={0} />
        <StatCard icon={Users} label={t('admin.users')} value={stats?.totalUsers ?? 0} color="text-securite" bg="bg-blue-50" trend={5} delay={80} />
        <StatCard icon={MapPin} label={t('admin.hotZones')} value={stats?.hotZones?.length ?? 0} color="text-warning" bg="bg-amber-50" delay={160} />
        <StatCard icon={Settings} label={t('admin.criticalHour')} value={stats?.criticalHours?.[0]?._id ?? '—'} color="text-gray-600" bg="bg-gray-50" delay={240} />
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-6 bg-gray-100/80 p-1 rounded-2xl w-fit animate-fade-in-up delay-200">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === id
                ? 'bg-white text-securite shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="grid lg:grid-cols-2 gap-5">
            {/* Pie chart */}
            <Card>
              <h2 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-urgence rounded-full" />
                {t('admin.byType')}
              </h2>
              {typeData.length === 0 ? (
                <div className="h-[240px] flex items-center justify-center text-gray-300 text-sm">Aucune donnée</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={typeData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {typeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Line chart */}
            <Card>
              <h2 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-securite rounded-full" />
                {t('admin.daily')}
              </h2>
              {timelineData.length === 0 ? (
                <div className="h-[240px] flex items-center justify-center text-gray-300 text-sm">Aucune donnée</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={timelineData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="count" name="Incidents" stroke="#2B6CB0" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#2B6CB0' }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Bar chart */}
            <Card className="lg:col-span-2">
              <h2 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-warning rounded-full" />
                {t('admin.hotZonesChart')}
              </h2>
              {hotZoneData.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-gray-300 text-sm">Aucune donnée</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={hotZoneData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="zone" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Incidents" fill="#E53E3E" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ── Users tab ── */}
      {activeTab === 'users' && (
        <Card className="animate-fade-in-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-securite rounded-full" />
              {t('admin.manageUsers')}
            </h2>
            <span className="text-xs text-gray-400">{users.length} utilisateur(s)</span>
          </div>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-3 pr-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Utilisateur</th>
                  <th className="pb-3 pr-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Contact</th>
                  <th className="pb-3 pr-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Rôle</th>
                  <th className="pb-3 pr-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Crédibilité</th>
                  <th className="pb-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Statut</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors animate-fade-in-up" style={{ animationDelay: `${i * 30}ms` }}>
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-gradient-to-br from-securite to-securite-dark rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {u.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="font-medium text-gray-800">{u.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 text-gray-400 text-xs">{u.email || u.phone}</td>
                    <td className="py-3.5 pr-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:border-securite outline-none"
                      >
                        {Object.entries(ROLE_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[60px]">
                          <div
                            className={`h-full rounded-full ${u.credibilityScore >= 70 ? 'bg-success' : u.credibilityScore >= 40 ? 'bg-warning' : 'bg-urgence'}`}
                            style={{ width: `${u.credibilityScore}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{u.credibilityScore}%</span>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <button
                        onClick={() => handleToggleActive(u._id, !u.isActive)}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all active:scale-95 ${
                          u.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {u.isActive ? '✅ Actif' : '❌ Inactif'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── AI config tab ── */}
      {activeTab === 'ai' && aiRules && (
        <Card className="max-w-lg animate-fade-in-up">
          <h2 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Settings size={18} className="text-securite" />
            {t('admin.aiConfig')}
          </h2>
          <div className="space-y-6">
            {/* Auto-classify toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50/80 rounded-xl border border-gray-100">
              <div>
                <p className="font-medium text-gray-800 text-sm">{t('admin.autoClassify')}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t('admin.autoClassifySub')}</p>
              </div>
              <button
                type="button"
                onClick={() => setAiRules({ ...aiRules, autoClassify: !aiRules.autoClassify })}
                className={`relative w-11 h-6 rounded-full transition-all ${aiRules.autoClassify ? 'bg-securite' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${aiRules.autoClassify ? 'left-6' : 'left-1'}`} />
              </button>
            </div>

            {/* Credibility threshold */}
            <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium text-gray-800 text-sm">{t('admin.threshold')}</p>
                <span className="text-lg font-extrabold text-securite">{aiRules.minCredibilityForAutoValidate}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={100}
                value={aiRules.minCredibilityForAutoValidate}
                onChange={(e) => setAiRules({ ...aiRules, minCredibilityForAutoValidate: parseInt(e.target.value) })}
                className="w-full accent-securite"
              />
              <div className="flex justify-between text-xs text-gray-300 mt-1">
                <span>50%</span><span>100%</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">{t('admin.thresholdSub')}</p>
            </div>

            <button
              onClick={() => adminAPI.updateAIRules(aiRules).then(() => { /* success */ })}
              className="w-full py-3 bg-securite text-white rounded-xl font-semibold text-sm hover:bg-securite-dark transition-all active:scale-[0.98] glow-securite"
            >
              {t('admin.saveConfig')}
            </button>
          </div>
        </Card>
      )}
    </Layout>
  );
}

export default function AdminDashboard() {
  return (
    <ProtectedRoute roles={['admin']}>
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}
