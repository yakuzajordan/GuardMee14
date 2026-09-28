import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { Users, AlertTriangle, MapPin, Settings } from 'lucide-react';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import { adminAPI } from '../services/api';
import { ROLE_LABELS } from '../utils/constants';

const COLORS = ['#E53E3E', '#2B6CB0', '#D69E2E', '#38A169', '#805AD5', '#DD6B20', '#319795'];

function AdminDashboardContent() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [aiRules, setAiRules] = useState(null);
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, rulesRes] = await Promise.all([
        adminAPI.stats({ period }),
        adminAPI.users({ limit: 10 }),
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRoleChange = async (userId, role) => {
    await adminAPI.updateRole(userId, role);
    fetchData();
  };

  const handleToggleActive = async (userId, isActive) => {
    await adminAPI.updateStatus(userId, isActive);
    fetchData();
  };

  const handleSeed = async () => {
    const res = await adminAPI.seed();
    alert(res.data.message + (res.data.accounts ? `\nAdmin: ${res.data.accounts.admin.email} / ${res.data.accounts.admin.password}` : ''));
    fetchData();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <div className="animate-spin w-10 h-10 border-4 border-securite border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  const typeData = stats?.byType?.map((t) => ({ name: t._id, count: t.count })) || [];
  const timelineData = stats?.recentIncidents?.map((d) => ({ date: d._id, count: d.count })) || [];

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Administration GuardMee</h1>
          <p className="text-gray-500">Supervision globale du système</p>
        </div>
        <div className="flex gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="7">7 jours</option>
            <option value="30">30 jours</option>
            <option value="90">90 jours</option>
          </select>
          <button onClick={handleSeed} className="px-4 py-2 bg-securite text-white rounded-lg text-sm">
            Initialiser données
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: AlertTriangle, label: 'Incidents', value: stats?.totalIncidents || 0, color: 'text-urgence' },
          { icon: Users, label: 'Utilisateurs', value: stats?.totalUsers || 0, color: 'text-securite' },
          { icon: MapPin, label: 'Zones chaudes', value: stats?.hotZones?.length || 0, color: 'text-warning' },
          { icon: Settings, label: 'Heures critiques', value: stats?.criticalHours?.[0]?._id ?? '—', color: 'text-gray-600' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border p-5 shadow-sm">
            <Icon className={color} size={24} />
            <p className="text-2xl font-bold mt-2">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <h2 className="font-bold mb-4">Incidents par type</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={typeData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <h2 className="font-bold mb-4">Évolution quotidienne</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#2B6CB0" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <h2 className="font-bold mb-4">Zones les plus touchées</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats?.hotZones?.map((z) => ({
              zone: `${z._id.lat}, ${z._id.lng}`,
              count: z.count,
            })) || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="zone" tick={{ fontSize: 9 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#E53E3E" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <h2 className="font-bold mb-4">Configuration IA</h2>
          {aiRules && (
            <div className="space-y-3 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={aiRules.autoClassify}
                  onChange={(e) => setAiRules({ ...aiRules, autoClassify: e.target.checked })}
                  className="accent-securite"
                />
                Classification automatique
              </label>
              <div>
                <label className="text-gray-500">Seuil crédibilité auto-validation</label>
                <input
                  type="range" min={50} max={100}
                  value={aiRules.minCredibilityForAutoValidate}
                  onChange={(e) => setAiRules({ ...aiRules, minCredibilityForAutoValidate: parseInt(e.target.value) })}
                  className="w-full accent-securite"
                />
                <p className="text-center font-bold">{aiRules.minCredibilityForAutoValidate}%</p>
              </div>
              <button
                onClick={() => adminAPI.updateAIRules(aiRules).then(() => alert('Règles mises à jour'))}
                className="w-full py-2 bg-securite text-white rounded-lg"
              >
                Sauvegarder les règles
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5 shadow-sm">
        <h2 className="font-bold mb-4">Gestion des utilisateurs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-3 pr-4">Nom</th>
                <th className="pb-3 pr-4">Email / Tél</th>
                <th className="pb-3 pr-4">Rôle</th>
                <th className="pb-3 pr-4">Crédibilité</th>
                <th className="pb-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-medium">{u.name}</td>
                  <td className="py-3 pr-4 text-gray-500">{u.email || u.phone}</td>
                  <td className="py-3 pr-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u._id, e.target.value)}
                      className="border rounded px-2 py-1 text-xs"
                    >
                      {Object.entries(ROLE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 pr-4">{u.credibilityScore}%</td>
                  <td className="py-3">
                    <button
                      onClick={() => handleToggleActive(u._id, !u.isActive)}
                      className={`text-xs px-2 py-1 rounded-full ${
                        u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {u.isActive ? 'Actif' : 'Inactif'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
