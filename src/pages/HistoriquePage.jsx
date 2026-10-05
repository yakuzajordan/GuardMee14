import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Filter, Clock, RefreshCw } from 'lucide-react';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import Card from '../components/ui/Card';
import { historyAPI } from '../services/api';
import { INCIDENT_TYPES, STATUS_LABELS, formatDate } from '../utils/constants';
import { useI18n } from '../context/i18nContext';

const statusConfig = {
  valide:      { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  rejete:      { bg: 'bg-red-100',   text: 'text-red-700',   dot: 'bg-red-500' },
  en_cours:    { bg: 'bg-blue-100',  text: 'text-blue-700',  dot: 'bg-blue-500' },
  en_attente:  { bg: 'bg-yellow-100',text: 'text-yellow-700',dot: 'bg-yellow-500' },
  info_requise:{ bg: 'bg-orange-100',text: 'text-orange-700',dot: 'bg-orange-500' },
  resolu:      { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
};

const urgencyConfig = {
  critique: { bg: 'bg-red-100', text: 'text-red-700' },
  eleve:    { bg: 'bg-orange-100', text: 'text-orange-700' },
  moyen:    { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  faible:   { bg: 'bg-green-100', text: 'text-green-700' },
};

const PAGE_SIZE = 10;

function HistoriqueContent() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: '', status: '' });
  const [showFilters, setShowFilters] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await historyAPI.list({ page, lim: PAGE_SIZE, ...filters });
      setIncidents(res.data.incidents || []);
      setTotal(res.data.total || 0);
    } catch {
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = filters.type || filters.status;

  const handleFilterChange = (key, value) => {
    setFilters(f => ({ ...f, [key]: value }));
    setPage(1);
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 animate-fade-in-up">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors active:scale-95"
          >
            <ChevronLeft size={20} className="text-gray-500" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{t('history.title')}</h1>
            <p className="text-gray-400 text-xs mt-0.5">{t('history.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border active:scale-95 ${
                showFilters || hasFilters
                  ? 'bg-securite text-white border-securite'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <Filter size={14} />
              {t('common.filter')}
              {hasFilters && <span className="w-2 h-2 bg-white rounded-full" />}
            </button>
            <button
              onClick={fetchData}
              className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:border-gray-300 transition-all active:scale-95"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card className="mb-4 !p-4 animate-slide-down">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">
                  {t('history.filterType')}
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:border-securite outline-none"
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                >
                  <option value="">{t('history.allTypes')}</option>
                  {Object.entries(INCIDENT_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">
                  {t('history.filterStatus')}
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:border-securite outline-none"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">{t('history.allStatuses')}</option>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            {hasFilters && (
              <button
                onClick={() => { setFilters({ type: '', status: '' }); setPage(1); }}
                className="mt-3 text-xs text-urgence font-medium hover:underline"
              >
                Effacer les filtres
              </button>
            )}
          </Card>
        )}

        {/* Summary badge */}
        <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
          <span className="font-semibold text-gray-800">{total}</span>
          <span>signalement{total !== 1 ? 's' : ''} au total</span>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 skeleton rounded-2xl" />
            ))}
          </div>
        ) : incidents.length === 0 ? (
          <Card className="text-center py-14">
            <div className="text-5xl mb-3 opacity-30">📋</div>
            <p className="text-gray-500 font-medium">{t('history.noResults')}</p>
            <p className="text-gray-400 text-sm mt-1">{t('history.noResultsSub')}</p>
            <button
              onClick={() => navigate('/signaler')}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-urgence text-white text-sm font-semibold rounded-xl hover:bg-urgence-dark transition-all active:scale-95"
            >
              Signaler un incident
            </button>
          </Card>
        ) : (
          <div className="space-y-3">
            {incidents.map((inc, i) => {
              const sCfg = statusConfig[inc.status] || statusConfig.en_attente;
              const uCfg = urgencyConfig[inc.urgency] || urgencyConfig.faible;
              return (
                <div
                  key={inc._id}
                  className="bg-white border border-gray-200/80 rounded-2xl p-4 sm:p-5 hover:border-gray-300 hover:shadow-sm transition-all animate-fade-in-up"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0 mt-0.5">
                      {INCIDENT_TYPES[inc.type]?.icon || '⚠️'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <p className="font-semibold text-gray-800 text-sm">
                          {INCIDENT_TYPES[inc.type]?.label || inc.type}
                        </p>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 ${uCfg.bg} ${uCfg.text}`}>
                            {t(`incident.urgency.${inc.urgency}`) || inc.urgency}
                          </span>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 ${sCfg.bg} ${sCfg.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sCfg.dot}`} />
                            {STATUS_LABELS[inc.status] || inc.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                        {inc.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {formatDate(inc.createdAt?.toDate ? inc.createdAt.toDate() : inc.createdAt)}
                        </span>
                        {inc.location?.address && (
                          <span className="truncate max-w-[180px]">📍 {inc.location.address}</span>
                        )}
                        {inc.media?.length > 0 && (
                          <span>📎 {inc.media.length} média{inc.media.length > 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Moderation notes */}
                  {inc.moderationNotes && (
                    <div className={`mt-3 p-3 rounded-xl text-xs leading-relaxed ${
                      inc.status === 'rejete' ? 'bg-red-50 text-red-700 border border-red-100' :
                      inc.status === 'info_requise' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                      'bg-blue-50 text-blue-700 border border-blue-100'
                    }`}>
                      <span className="font-semibold">Note de l'agent : </span>
                      {inc.moderationNotes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              <ChevronLeft size={16} />
              Précédent
            </button>
            <span className="text-sm text-gray-500 font-medium">
              Page {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              Suivant
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default function HistoriquePage() {
  return (
    <ProtectedRoute>
      <HistoriqueContent />
    </ProtectedRoute>
  );
}
