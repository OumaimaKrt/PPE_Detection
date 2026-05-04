import React, { useState, useEffect } from 'react';
import { getEmployees, createEmployee, deleteEmployee } from '../api';
import { 
  Users, 
  Plus, 
  Trash2, 
  Upload,
  User,
  Building2
} from 'lucide-react';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    employee_id: '',
    department: 'Sécurité'
  });
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const data = await getEmployees();
      setEmployees(data);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const data = new FormData();
    data.append('name', formData.name);
    data.append('employee_id', formData.employee_id);
    data.append('department', formData.department);
    data.append('image', image);
    
    try {
      await createEmployee(data);
      setFormData({ name: '', employee_id: '', department: 'Sécurité' });
      setImage(null);
      setShowAddForm(false);
      fetchEmployees();
    } catch (error) {
      alert('Erreur lors de l\'ajout de l\'employé');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (name) => {
    if (!window.confirm(`Supprimer ${name} ?`)) return;
    
    try {
      await deleteEmployee(name);
      fetchEmployees();
    } catch (error) {
      console.error('Failed to delete employee:', error);
    }
  };

  const departments = ['Sécurité', 'Production', 'Maintenance', 'Administration', 'Autre'];

  return (
    <div>
      <div className="page-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 className="page-title">Gestion des employés</h1>
          <p className="page-subtitle">{employees.length} employé(s) enregistré(s)</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn btn-primary"
        >
          <Plus size={18} />
          Ajouter un employé
        </button>
      </div>

      {/* Formulaire d'ajout */}
      {showAddForm && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <span className="card-title">Nouvel employé</span>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '20px',
                marginBottom: '20px'
              }}>
                <div>
                  <label className="form-label">Nom complet *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <label className="form-label">ID Employé</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.employee_id}
                    onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                    placeholder="EMP001"
                  />
                </div>
                
                <div>
                  <label className="form-label">Département</label>
                  <select
                    className="form-select"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                  >
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="form-label">Photo *</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImage(e.target.files[0])}
                    className="form-input"
                    required
                  />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="btn btn-secondary"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tableau des employés */}
      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employé</th>
                <th>ID</th>
                <th>Département</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: '#e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <User size={18} color="#64748b" />
                      </div>
                      <span style={{ fontWeight: '500' }}>{emp.name}</span>
                    </div>
                  </td>
                  <td>{emp.id}</td>
                  <td>
                    <span className="badge badge-success">
                      {emp.department}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleDelete(emp.name)}
                      className="btn btn-danger btn-sm"
                    >
                      <Trash2 size={14} />
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {employees.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
            <Users size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
            <p>Aucun employé enregistré</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Employees;