import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Eye, EyeOff, ArrowLeft } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const data = await login(username, password);
      // Rediriger admin vers dashboard, sinon vers accueil
      if (data.role === 'admin') {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError('Identifiants incorrects. Veuillez reessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Bouton retour vers accueil */}
      <Link 
        to="/"
        style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#64748b',
          textDecoration: 'none',
          fontSize: '0.875rem',
          padding: '8px 16px',
          borderRadius: '8px',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
        onMouseLeave={(e) => e.target.style.background = 'transparent'}
      >
        <ArrowLeft size={18} />
        Retour a l'accueil
      </Link>

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <Shield size={32} />
          </div>
          <h1 className="login-title">PPE Safety System</h1>
          <p className="login-subtitle">
            Connexion administrateur
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nom d'utilisateur</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Entrez votre nom d'utilisateur"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Entrez votre mot de passe"
                required
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%', marginTop: '8px' }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div style={{
          marginTop: '24px',
          paddingTop: '24px',
          borderTop: '1px solid #e2e8f0',
          textAlign: 'center',
          fontSize: '0.875rem',
          color: '#64748b'
        }}>
          <p>Acces reserve aux administrateurs</p>
          <p style={{ marginTop: '8px' }}>
            Les utilisateurs peuvent acceder directement a la{' '}
            <Link to="/detect" style={{ color: '#0ea5e9', textDecoration: 'none' }}>
              detection video
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;