import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  Video, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  Eye,
  PlayCircle,
  ArrowRight,
  ShieldCheck,
  HardHat,
  Activity
} from 'lucide-react';

const HomePage = () => {
  const features = [
    {
      icon: Video,
      title: "Detection en temps reel",
      description: "Analysez vos flux video en direct pour detecter instantanement les violations d'EPI"
    },
    {
      icon: Upload,
      title: "Upload de videos",
      description: "Importez vos enregistrements pour une analyse complete et detaillee"
    },
    {
      icon: Eye,
      title: "Reconnaissance faciale",
      description: "Identification automatique des employes avec verification des equipements"
    },
    {
      icon: AlertTriangle,
      title: "Alertes intelligentes",
      description: "Notifications immediates en cas de non-port des equipements de protection"
    }
  ];

  const steps = [
    {
      number: "1",
      icon: Upload,
      title: "Uploadez votre video",
      description: "Selectionnez un fichier video depuis votre appareil ou utilisez la camera en direct"
    },
    {
      number: "2",
      icon: Eye,
      title: "Analyse automatique",
      description: "Notre systeme AI detecte les personnes et verifie le port des EPI"
    },
    {
      number: "3",
      icon: CheckCircle,
      title: "Resultats detailles",
      description: "Visualisez les alertes avec captures d'ecran et statistiques completes"
    }
  ];

  const stats = [
    { value: "99%", label: "Precision detection", icon: Activity },
    { value: "<1s", label: "Temps de reponse", icon: PlayCircle },
    { value: "24/7", label: "Surveillance", icon: ShieldCheck }
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Hero Section */}
      <div style={{ 
        textAlign: 'center', 
        padding: '60px 20px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '24px',
        marginBottom: '48px',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '0',
          right: '0',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.3) 0%, transparent 70%)',
          borderRadius: '50%'
        }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ 
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(255,255,255,0.1)',
            padding: '12px 24px',
            borderRadius: '50px',
            marginBottom: '32px'
          }}>
            <Shield size={24} color="#0ea5e9" />
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Systeme de securite PPE</span>
          </div>
          
          <h1 style={{ 
            fontSize: '3rem', 
            fontWeight: 700, 
            marginBottom: '24px',
            lineHeight: 1.2
          }}>
            Detection intelligente des<br />
            <span style={{ color: '#0ea5e9' }}>Equipements de Protection</span>
          </h1>
          
          <p style={{ 
            fontSize: '1.25rem', 
            color: '#94a3b8',
            maxWidth: '600px',
            margin: '0 auto 40px',
            lineHeight: 1.6
          }}>
            Securisez votre chantier avec notre systeme de detection automatique 
            des casques, gilets et gants grace a l'intelligence artificielle
          </p>
          
          <Link
            to="/detect"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              background: '#0ea5e9',
              color: 'white',
              padding: '16px 32px',
              borderRadius: '12px',
              fontSize: '1.125rem',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.3s ease',
              boxShadow: '0 10px 40px rgba(14, 165, 233, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 20px 60px rgba(14, 165, 233, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 10px 40px rgba(14, 165, 233, 0.3)';
            }}
          >
            <PlayCircle size={24} />
            Commencer la detection
            <ArrowRight size={20} />
          </Link>
        </div>
      </div>

      {/* Stats Section */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '24px',
        marginBottom: '64px'
      }}>
        {stats.map((stat, index) => (
          <div key={index} style={{
            background: 'white',
            padding: '32px',
            borderRadius: '16px',
            textAlign: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <stat.icon size={32} color="#0ea5e9" style={{ marginBottom: '16px' }} />
            <div style={{ 
              fontSize: '2.5rem', 
              fontWeight: 700, 
              color: '#0f172a',
              marginBottom: '8px'
            }}>
              {stat.value}
            </div>
            <div style={{ color: '#64748b', fontSize: '0.875rem' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Features Section */}
      <div style={{ marginBottom: '64px' }}>
        <h2 style={{ 
          textAlign: 'center', 
          fontSize: '2rem', 
          fontWeight: 700,
          color: '#0f172a',
          marginBottom: '48px'
        }}>
          Fonctionnalites principales
        </h2>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '24px'
        }}>
          {features.map((feature, index) => (
            <div key={index} style={{
              background: 'white',
              padding: '32px',
              borderRadius: '16px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
            }}
            >
              <div style={{
                width: '56px',
                height: '56px',
                background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                <feature.icon size={28} color="white" />
              </div>
              <h3 style={{ 
                fontSize: '1.25rem', 
                fontWeight: 600, 
                color: '#0f172a',
                marginBottom: '12px'
              }}>
                {feature.title}
              </h3>
              <p style={{ color: '#64748b', lineHeight: 1.6 }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works Section */}
      <div style={{ 
        background: '#f8fafc',
        padding: '64px 48px',
        borderRadius: '24px',
        marginBottom: '64px'
      }}>
        <h2 style={{ 
          textAlign: 'center', 
          fontSize: '2rem', 
          fontWeight: 700,
          color: '#0f172a',
          marginBottom: '48px'
        }}>
          Comment ca marche
        </h2>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '32px'
        }}>
          {steps.map((step, index) => (
            <div key={index} style={{ textAlign: 'center' }}>
              <div style={{
                width: '80px',
                height: '80px',
                background: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                position: 'relative'
              }}>
                <step.icon size={32} color="#0ea5e9" />
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  width: '32px',
                  height: '32px',
                  background: '#0ea5e9',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.875rem'
                }}>
                  {step.number}
                </div>
              </div>
              <h3 style={{ 
                fontSize: '1.25rem', 
                fontWeight: 600, 
                color: '#0f172a',
                marginBottom: '12px'
              }}>
                {step.title}
              </h3>
              <p style={{ color: '#64748b', lineHeight: 1.6 }}>
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div style={{ 
        textAlign: 'center',
        padding: '48px',
        background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
        borderRadius: '24px',
        color: 'white'
      }}>
        <h2 style={{ 
          fontSize: '2rem', 
          fontWeight: 700,
          marginBottom: '16px'
        }}>
          Pret a securiser votre chantier
        </h2>
        <p style={{ 
          fontSize: '1.125rem',
          opacity: 0.9,
          marginBottom: '32px',
          maxWidth: '500px',
          margin: '0 auto 32px'
        }}>
          Commencez maintenant avec notre systeme de detection PPE intelligent
        </p>
        <Link
          to="/detect"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            background: 'white',
            color: '#0ea5e9',
            padding: '16px 32px',
            borderRadius: '12px',
            fontSize: '1.125rem',
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 10px 40px rgba(0,0,0,0.2)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = 'none';
          }}
        >
          <PlayCircle size={24} />
          Lancer la detection
        </Link>
      </div>
    </div>
  );
};

export default HomePage;