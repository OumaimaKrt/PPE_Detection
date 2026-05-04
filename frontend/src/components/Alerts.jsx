import React, { useState, useEffect } from 'react';
import { getAlerts, deleteAlert } from '../api';
import { 
  AlertTriangle, 
  Search, 
  Filter,
  Trash2,
  Calendar,
  User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchAlerts();
  }, []);

  useEffect(() => {
    filterAlerts();
  }, [alerts, searchTerm, filterType]);

  const fetchAlerts = async () => {
    try {
      const data = await getAlerts();
      setAlerts(data);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  const filterAlerts = () => {
    let filtered = [...alerts];
    
    if (searchTerm) {
      filtered = filtered.filter(a => 
        a.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterType !== 'all') {
      filtered = filtered.filter(a => a.violation?.includes(filterType));
    }
    
    setFilteredAlerts(filtered);
  };

  const handleDelete = async (alertId) => {
    if (!window.confirm('Etes-vous sur de vouloir supprimer cette alerte ?')) return;
    
    try {
      await deleteAlert(alertId);
      await fetchAlerts();
    } catch (error) {
      console.error('Failed to delete alert:', error);
      alert('Erreur: Seuls les administrateurs peuvent supprimer des alertes');
    }
  };

  const violationTypes = ['all', 'No Helmet', 'No Vest', 'No Gloves'];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Gestion des alertes</h1>
        <p className="page-subtitle">
          {filteredAlerts.length} alerte(s) trouvee(s)
        </p>
      </div>

      {/* Filtres */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-body">
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '2fr 1fr', 
            gap: '16px' 
          }}>
            <div style={{ position: 'relative' }}>
              <Search 
                size={20} 
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: '#94a3b8'
                }} 
              />
              <input
                type="text"
                className="form-input"
                placeholder="Rechercher par nom d'employe..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '40px' }}
              />
            </div>
            
            <div style={{ position: 'relative' }}>
              <Filter 
                size={20} 
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: '#94a3b8'
                }} 
              />
              <select
                className="form-select"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{ paddingLeft: '40px' }}
              >
                <option value="all">Tous les types</option>
                <option value="No Helmet">Casque manquant</option>
                <option value="No Vest">Gilet manquant</option>
                <option value="No Gloves">Gants manquants</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des alertes */}
      <div className="alert-list">
        {filteredAlerts.map((alert) => (
          <div key={alert.id} className="alert-card">
            <img
              src={`http://localhost:8000/${alert.image}`}
              alt="Alert"
              className="alert-image"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            
            <div className="alert-content">
              <div className="alert-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={16} color="#64748b" />
                  <span className="alert-name">{alert.name || 'Inconnu'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
                  <Calendar size={14} />
                  <span style={{ fontSize: '0.875rem' }}>{alert.time}</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <AlertTriangle size={16} color="#ef4444" />
                <span className="alert-violation">{alert.violation}</span>
              </div>

              {isAdmin() && (
                <button
                  onClick={() => handleDelete(alert.id)}
                  className="btn btn-danger btn-sm"
                >
                  <Trash2 size={14} />
                  Supprimer
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredAlerts.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <AlertTriangle size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
          <h3 style={{ color: '#64748b', marginBottom: '8px' }}>Aucune alerte trouvee</h3>
          <p style={{ color: '#94a3b8' }}>Modifiez vos criteres de recherche</p>
        </div>
      )}
    </div>
  );
};

export default Alerts;