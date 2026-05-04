import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Bell, 
  Shield, 
  Save,
  Mail,
  Smartphone
} from 'lucide-react';

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    videoQuality: 0.5,
    frameSkip: 2,
    yoloConf: 0.3,
    alertCooldown: 10,
    enableEmail: false,
    enableSMS: false,
    emailAddress: '',
    phoneNumber: ''
  });

  useEffect(() => {
    const saved = localStorage.getItem('ppe_settings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('ppe_settings', JSON.stringify(settings));
    alert('Paramètres sauvegardés avec succès');
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Paramètres</h1>
        <p className="page-subtitle">
          Configurez les options du système
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Paramètres de détection */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Settings size={20} color="#64748b" />
              <span className="card-title">Détection</span>
            </div>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Qualité vidéo: {settings.videoQuality}</label>
              <input
                type="range"
                min="0.3"
                max="1.0"
                step="0.1"
                value={settings.videoQuality}
                onChange={(e) => setSettings({...settings, videoQuality: parseFloat(e.target.value)})}
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Frames à sauter: {settings.frameSkip}</label>
              <input
                type="range"
                min="1"
                max="10"
                value={settings.frameSkip}
                onChange={(e) => setSettings({...settings, frameSkip: parseInt(e.target.value)})}
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Seuil YOLO: {settings.yoloConf}</label>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={settings.yoloConf}
                onChange={(e) => setSettings({...settings, yoloConf: parseFloat(e.target.value)})}
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Cooldown alertes: {settings.alertCooldown}s</label>
              <input
                type="range"
                min="5"
                max="60"
                value={settings.alertCooldown}
                onChange={(e) => setSettings({...settings, alertCooldown: parseInt(e.target.value)})}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Bell size={20} color="#64748b" />
              <span className="card-title">Notifications</span>
            </div>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={settings.enableEmail}
                  onChange={(e) => setSettings({...settings, enableEmail: e.target.checked})}
                />
                <Mail size={18} color="#64748b" />
                <span>Activer les alertes email</span>
              </label>
            </div>

            {settings.enableEmail && (
              <div className="form-group">
                <input
                  type="email"
                  className="form-input"
                  placeholder="votre@email.com"
                  value={settings.emailAddress}
                  onChange={(e) => setSettings({...settings, emailAddress: e.target.value})}
                />
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={settings.enableSMS}
                  onChange={(e) => setSettings({...settings, enableSMS: e.target.checked})}
                />
                <Smartphone size={18} color="#64748b" />
                <span>Activer les alertes SMS</span>
              </label>
            </div>

            {settings.enableSMS && (
              <div className="form-group" style={{ marginBottom: 0, marginTop: '16px' }}>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="+33 6 12 34 56 78"
                  value={settings.phoneNumber}
                  onChange={(e) => setSettings({...settings, phoneNumber: e.target.value})}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <button onClick={handleSave} className="btn btn-primary btn-lg">
          <Save size={18} />
          Sauvegarder les paramètres
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;