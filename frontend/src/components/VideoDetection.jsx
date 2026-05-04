import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { uploadVideo, createWebSocket } from '../api';
import { 
  Upload, 
  Play, 
  Camera, 
  CameraOff,
  Settings, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Film,
  User,
  HardHat,
  Shield,
  Video,
  Download,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Info
} from 'lucide-react';

const VideoDetection = () => {
  const [mode, setMode] = useState('upload'); // 'upload' ou 'live'
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState(null);
  
  // Etat pour le streaming live
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(null);
  const [liveStats, setLiveStats] = useState({
    persons: 0,
    alerts: 0
  });
  const [recentAlerts, setRecentAlerts] = useState([]);
  
  // Etat pour l'upload avec streaming
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processedVideoUrl, setProcessedVideoUrl] = useState(null);
  const [currentFrameUpload, setCurrentFrameUpload] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [settings, setSettings] = useState({
    frameSkip: 2,
    resizeFactor: 0.5,
    confThreshold: 0.5
  });

  const wsRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);
  const fileInputRef = useRef(null);

  // ========== MODE UPLOAD AVEC STREAMING ==========
  
  const handleUploadWithStreaming = async () => {
    if (!file) return;
    
    setIsUploading(true);
    setIsProcessing(true);
    setProgress(0);
    setProcessedVideoUrl(null);
    setCurrentFrameUpload(null);
    setStats(null);
    
    // Creer WebSocket pour le streaming
    const ws = new WebSocket('ws://localhost:8000/ws/video-upload');
    wsRef.current = ws;
    
    ws.onopen = async () => {
      console.log('Upload WebSocket connected');
      
      // Envoyer les parametres
      ws.send(JSON.stringify({
        frame_skip: settings.frameSkip,
        resize_factor: settings.resizeFactor,
        conf_threshold: settings.confThreshold
      }));
      
      // Lire et envoyer le fichier par chunks
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target.result.split(',')[1];
        const chunkSize = 64 * 1024; // 64KB chunks
        const chunks = Math.ceil(base64.length / chunkSize);
        
        for (let i = 0; i < chunks; i++) {
          const start = i * chunkSize;
          const end = Math.min(start + chunkSize, base64.length);
          const chunk = base64.substring(start, end);
          
          ws.send(JSON.stringify({
            type: 'video_chunk',
            data: chunk
          }));
          
          // Mettre a jour la progression d'upload
          setUploadProgress(Math.round((i / chunks) * 50)); // 0-50% pour l'upload
          await new Promise(r => setTimeout(r, 10));
        }
        
        // Signaler la fin
        ws.send(JSON.stringify({ type: 'video_end' }));
      };
      
      reader.readAsDataURL(file);
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'status':
          console.log('Status:', data.message);
          break;
          
        case 'frame':
          // Afficher la frame en cours de traitement
          setCurrentFrameUpload(`data:image/jpeg;base64,${data.image}`);
          setProgress(50 + Math.round(data.progress / 2)); // 50-100% pour le traitement
          setLiveStats({
            persons: data.persons_detected || 0,
            alerts: data.alerts_count || 0
          });
          break;
          
        case 'complete':
          setStats({
            total_frames: data.total_frames,
            processed_frames: data.processed_frames,
            alerts_generated: data.alerts_generated,
            processing_time: data.processing_time
          });
          setProcessedVideoUrl(`http://localhost:8000${data.video_url}`);
          setProgress(100);
          setIsProcessing(false);
          setIsUploading(false);
          break;
          
        case 'error':
          console.error('Error:', data.message);
          alert('Erreur: ' + data.message);
          setIsProcessing(false);
          setIsUploading(false);
          break;
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsProcessing(false);
      setIsUploading(false);
    };
    
    ws.onclose = () => {
      console.log('Upload WebSocket closed');
      setIsUploading(false);
    };
  };

  // ========== MODE LIVE ==========
  
  const startLiveDetection = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "environment"
        } 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      wsRef.current = createWebSocket();
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsStreaming(true);
        sendFrames();
      };
      
      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'frame') {
          setCurrentFrame(`data:image/jpeg;base64,${data.image}`);
          setLiveStats({
            persons: data.persons_detected || 0,
            alerts: data.alerts_count || 0
          });
        } else if (data.type === 'alert') {
          setRecentAlerts(prev => [{
            id: Date.now(),
            name: data.name,
            violation: data.violation,
            time: data.time
          }, ...prev].slice(0, 5));
        }
      };
      
      wsRef.current.onerror = () => stopLiveDetection();
      wsRef.current.onclose = () => stopLiveDetection();
      
    } catch (err) {
      alert('Impossible d\'acceder a la camera.');
    }
  };

  const sendFrames = useCallback(() => {
    if (!isStreaming || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (canvas && video && video.videoWidth > 0) {
      const scale = 0.5;
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result.split(',')[1];
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'frame',
              image: base64data
            }));
          }
        };
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.7);
    }

    animationRef.current = setTimeout(() => {
      requestAnimationFrame(sendFrames);
    }, 100);
  }, [isStreaming]);

  const stopLiveDetection = () => {
    setIsStreaming(false);
    if (animationRef.current) clearTimeout(animationRef.current);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCurrentFrame(null);
    setRecentAlerts([]);
  };

  // NOUVELLE FONCTION: Reinitialiser pour nouvel upload
  const handleReset = () => {
    setFile(null);
    setStats(null);
    setProcessedVideoUrl(null);
    setCurrentFrameUpload(null);
    setProgress(0);
    setUploadProgress(0);
    setLiveStats({ persons: 0, alerts: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    return () => {
      stopLiveDetection();
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setStats(null);
      setProcessedVideoUrl(null);
      setCurrentFrameUpload(null);
      setProgress(0);
    }
  };

  return (
    <div>
      {/* Header avec bouton retour */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link 
          to="/" 
          style={{
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
        <div style={{ flex: 1 }}>
          <h1 className="page-title">Detection video</h1>
          <p className="page-subtitle">
            Analysez vos videos ou utilisez la camera en temps reel
          </p>
        </div>
      </div>

      {/* Guide d'utilisation */}
      {!isProcessing && !processedVideoUrl && !file && (
        <div className="card" style={{ marginBottom: '24px', background: '#f0f9ff', border: '1px solid #bae6fd' }}>
          <div className="card-body" style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: '#0ea5e9',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Info size={24} color="white" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0c4a6e', marginBottom: '8px' }}>
                Comment utiliser la detection
              </h3>
              <ol style={{ color: '#0369a1', paddingLeft: '20px', lineHeight: 1.8 }}>
                <li>Selectionnez le mode <strong>Upload video</strong> pour analyser un fichier ou <strong>Camera live</strong> pour le direct</li>
                <li>Ajustez les parametres (frames a sauter, resolution, seuil de confiance) selon vos besoins</li>
                <li>Cliquez sur <strong>Lancer l'analyse</strong> ou <strong>Demarrer la detection live</strong></li>
                <li>Visualisez les resultats en temps reel avec les alertes generees</li>
                <li>Telechargez la video annotee apres traitement</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Selection du mode */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-body">
          <div style={{ 
            display: 'flex', 
            gap: '12px',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '16px'
          }}>
            <button
              onClick={() => {
                setMode('upload');
                stopLiveDetection();
              }}
              className={`btn ${mode === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Upload size={18} />
              Upload video
            </button>
            <button
              onClick={() => setMode('live')}
              className={`btn ${mode === 'live' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Camera size={18} />
              Camera live
            </button>
          </div>

          {/* Parametres */}
          <div style={{ marginTop: '20px' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '24px' 
            }}>
              <div>
                <label className="form-label">Frames a sauter</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={settings.frameSkip}
                  onChange={(e) => setSettings({...settings, frameSkip: parseInt(e.target.value)})}
                  disabled={isStreaming || isProcessing}
                  style={{ width: '100%' }}
                />
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  fontSize: '0.875rem',
                  color: '#64748b',
                  marginTop: '4px'
                }}>
                  <span>1</span>
                  <span>{settings.frameSkip}</span>
                  <span>5</span>
                </div>
              </div>

              <div>
                <label className="form-label">Resolution</label>
                <input
                  type="range"
                  min="0.3"
                  max="1.0"
                  step="0.1"
                  value={settings.resizeFactor}
                  onChange={(e) => setSettings({...settings, resizeFactor: parseFloat(e.target.value)})}
                  disabled={isStreaming || isProcessing}
                  style={{ width: '100%' }}
                />
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  fontSize: '0.875rem',
                  color: '#64748b',
                  marginTop: '4px'
                }}>
                  <span>30%</span>
                  <span>{Math.round(settings.resizeFactor * 100)}%</span>
                  <span>100%</span>
                </div>
              </div>

              <div>
                <label className="form-label">Seuil de confiance</label>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={settings.confThreshold}
                  onChange={(e) => setSettings({...settings, confThreshold: parseFloat(e.target.value)})}
                  disabled={isStreaming || isProcessing}
                  style={{ width: '100%' }}
                />
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  fontSize: '0.875rem',
                  color: '#64748b',
                  marginTop: '4px'
                }}>
                  <span>0.1</span>
                  <span>{settings.confThreshold}</span>
                  <span>0.9</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== MODE UPLOAD ========== */}
      {mode === 'upload' && (
        <>
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-body">
              {/* Zone d'upload - toujours visible sauf pendant traitement */}
              {!isProcessing && (
                <div
                  className="upload-zone"
                  onClick={() => !isProcessing && fileInputRef.current?.click()}
                  style={file ? { borderColor: '#0ea5e9', background: 'rgba(14, 165, 233, 0.05)' } : {}}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleFileSelect}
                    disabled={isProcessing}
                    style={{ display: 'none' }}
                  />
                  <Upload size={48} color={file ? '#0ea5e9' : '#94a3b8'} />
                  <div className="upload-text">
                    {file ? file.name : 'Cliquez pour selectionner une video'}
                  </div>
                  <div className="upload-hint">
                    MP4, AVI, MOV jusqu'a 500MB
                  </div>
                </div>
              )}

              {/* Bouton lancer - visible quand fichier selectionne et pas en traitement */}
              {file && !isProcessing && !processedVideoUrl && (
                <button
                  onClick={handleUploadWithStreaming}
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', marginTop: '24px' }}
                >
                  <Play size={20} />
                  Lancer l'analyse
                </button>
              )}

              {/* Bouton nouvelle analyse - visible apres completion */}
              {processedVideoUrl && (
                <button
                  onClick={handleReset}
                  className="btn btn-secondary btn-lg"
                  style={{ width: '100%', marginTop: '24px' }}
                >
                  <RefreshCw size={20} />
                  Nouvelle analyse
                </button>
              )}

              {/* Progression avec apercu */}
              {(isProcessing || processedVideoUrl) && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginTop: '24px' }}>
                  {/* Apercu temps reel */}
                  <div>
                    <h4 style={{ marginBottom: '12px', fontSize: '0.875rem', color: '#64748b' }}>
                      Apercu du traitement
                    </h4>
                    <div style={{
                      background: '#0f172a',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      minHeight: '360px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {currentFrameUpload || processedVideoUrl ? (
                        processedVideoUrl ? (
                          <video
                            src={processedVideoUrl}
                            controls
                            style={{ maxWidth: '100%', maxHeight: '360px' }}
                          />
                        ) : (
                          <img 
                            src={currentFrameUpload} 
                            alt="Traitement en cours"
                            style={{ maxWidth: '100%', maxHeight: '360px' }}
                          />
                        )
                      ) : (
                        <div style={{ textAlign: 'center', color: '#64748b' }}>
                          <Loader2 size={48} className="spin" style={{ marginBottom: '16px' }} />
                          <p>Preparation...</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Barre de progression */}
                    <div className="progress-container" style={{ marginTop: '16px' }}>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="progress-text">
                        <span>
                          {progress < 50 ? 'Upload...' : progress < 100 ? 'Analyse...' : 'Termine'}
                        </span>
                        <span>{progress}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Stats temps reel */}
                  <div>
                    <h4 style={{ marginBottom: '12px', fontSize: '0.875rem', color: '#64748b' }}>
                      Statistiques
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div className="stat-card">
                        <div className="stat-header">
                          <span className="stat-label">Alertes detectees</span>
                          <div className="stat-icon red">
                            <AlertTriangle size={20} />
                          </div>
                        </div>
                        <div className="stat-value" style={{ color: '#ef4444' }}>
                          {liveStats.alerts}
                        </div>
                      </div>
    

                      {processedVideoUrl && (
                        <a
                          href={processedVideoUrl}
                          download
                          className="btn btn-primary"
                          style={{ marginTop: '12px' }}
                        >
                          <Download size={18} />
                          Telecharger la video annotee
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Resultats finaux */}
          {stats && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Resultats de l'analyse</span>
              </div>
              <div className="card-body">
                <div className="stats-grid" style={{ marginBottom: '0' }}>
                  <div className="stat-card">
                    <div className="stat-header">
                      <span className="stat-label">Frames analysees</span>
                      <div className="stat-icon blue">
                        <Film size={20} />
                      </div>
                    </div>
                    <div className="stat-value">{stats.processed_frames}</div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-header">
                      <span className="stat-label">Alertes generees</span>
                      <div className="stat-icon red">
                        <AlertTriangle size={20} />
                      </div>
                    </div>
                    <div className="stat-value" style={{ color: '#ef4444' }}>
                      {stats.alerts_generated}
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-header">
                      <span className="stat-label">Temps de traitement</span>
                      <div className="stat-icon amber">
                        <Clock size={20} />
                      </div>
                    </div>
                    <div className="stat-value">{stats.processing_time}s</div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-header">
                      <span className="stat-label">Statut</span>
                      <div className="stat-icon green">
                        <CheckCircle size={20} />
                      </div>
                    </div>
                    <div className="stat-value" style={{ fontSize: '1.25rem', color: '#10b981' }}>
                      Termine
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========== MODE LIVE ========== */}
      {mode === 'live' && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-body">
            {/* Controles */}
            <div style={{ marginBottom: '20px' }}>
              {!isStreaming ? (
                <button
                  onClick={startLiveDetection}
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%' }}
                >
                  <Camera size={20} />
                  Demarrer la detection live
                </button>
              ) : (
                <button
                  onClick={stopLiveDetection}
                  className="btn btn-danger btn-lg"
                  style={{ width: '100%' }}
                >
                  <CameraOff size={20} />
                  Arreter la detection
                </button>
              )}
            </div>

            {/* Affichage */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '2fr 1fr',
              gap: '24px'
            }}>
              {/* Video */}
              <div style={{ 
                background: '#0f172a',
                borderRadius: '12px',
                overflow: 'hidden',
                minHeight: '480px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}>
                <video ref={videoRef} style={{ display: 'none' }} playsInline muted />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                
                {currentFrame ? (
                  <img 
                    src={currentFrame} 
                    alt="Detection"
                    style={{ maxWidth: '100%', maxHeight: '480px', borderRadius: '8px' }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: '#64748b' }}>
                    <Camera size={64} style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <p>La camera s'affichera ici avec les detections</p>
                  </div>
                )}
                
                {isStreaming && (
                  <div style={{
                    position: 'absolute',
                    top: '16px',
                    left: '16px',
                    background: 'rgba(0,0,0,0.7)',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    color: 'white'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <User size={16} />
                      <span>{liveStats.persons} personne(s)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                      <AlertTriangle size={16} />
                      <span>{liveStats.alerts} alerte(s)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Alertes */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '16px' }}>
                  <AlertTriangle size={18} color="#ef4444" style={{ marginRight: '8px' }} />
                  Alertes recentes
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {recentAlerts.length === 0 ? (
                    <div style={{ 
                      padding: '24px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      textAlign: 'center',
                      color: '#64748b'
                    }}>
                      Aucune alerte detectee
                    </div>
                  ) : (
                    recentAlerts.map((alert) => (
                      <div 
                        key={alert.id}
                        style={{
                          padding: '16px',
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '8px',
                          borderLeft: '4px solid #ef4444'
                        }}
                      >
                        <div style={{ 
                          fontWeight: '600',
                          color: '#991b1b',
                          marginBottom: '4px'
                        }}>
                          {alert.name}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#dc2626' }}>
                          {alert.violation}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px' }}>
                          {alert.time}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoDetection;