import React, { useState, useEffect } from 'react';
import { getAlerts, getAlertStats } from '../api';
import { 
  AlertTriangle, 
  Users, 
  Clock, 
  TrendingUp,
  Calendar
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [alertsData, statsData] = await Promise.all([
        getAlerts(),
        getAlertStats()
      ]);
      setAlerts(alertsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Chargement...</div>;

  // Données pour les graphiques
  const dailyData = alerts.reduce((acc, alert) => {
    const date = alert.date || 'Unknown';
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(dailyData)
    .slice(-7)
    .map(([date, count]) => ({
      date: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      count
    }));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Tableau de bord</h1>
        <p className="page-subtitle">
          Vue d'ensemble du système de détection PPE
        </p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Total des alertes</span>
            <div className="stat-icon blue">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="stat-value">{stats?.total || 0}</div>
          <div className="stat-change">Depuis le début</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Employés détectés</span>
            <div className="stat-icon green">
              <Users size={20} />
            </div>
          </div>
          <div className="stat-value">{stats?.unique_employees || 0}</div>
          <div className="stat-change">Personnes uniques</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Alertes aujourd'hui</span>
            <div className="stat-icon red">
              <Clock size={20} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#ef4444' }}>
            {stats?.today || 0}
          </div>
          <div className="stat-change">24 dernières heures</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Violation principale</span>
            <div className="stat-icon amber">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>
            {stats?.top_violation || 'Aucune'}
          </div>
          <div className="stat-change">Type le plus fréquent</div>
        </div>
      </div>

      {/* Graphique */}
      <div className="card" style={{ marginTop: '32px' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Calendar size={20} color="#64748b" />
            <span className="card-title">Évolution des alertes (7 derniers jours)</span>
          </div>
        </div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="date" 
                stroke="#64748b"
                fontSize={12}
              />
              <YAxis 
                stroke="#64748b"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{ 
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              />
              <Bar 
                dataKey="count" 
                fill="#0ea5e9"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;