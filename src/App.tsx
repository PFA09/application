import { useState, useEffect } from 'react';
import { invoke } from "@tauri-apps/api/core"
import { Recorder } from './components/Recorder';
import { RecordingsList } from './components/RecordingsList';
import { Toaster, toast } from 'react-hot-toast';
import './styles.css';

interface Recording {
  name: string;
  path: string;
  size: number;
  created: string;
}

function App() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadRecordings = async () => {
    try {
      console.log('Chargement des enregistrements...');
      const recs = await invoke<Recording[]>('list_recordings');
      console.log('Enregistrements chargés:', recs);
      setRecordings(recs);
    } catch (error) {
      toast.error('Erreur lors du chargement des enregistrements');
      console.error('Erreur chargement:', error);
    }
  };

  const handleSaveRecording = async (audioBlob: Blob) => {
    setIsLoading(true);
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const filename = `recording_${Date.now()}.wav`;
      console.log('Sauvegarde du fichier:', filename);

      await invoke('save_audio_file', {
        audioData: Array.from(uint8Array),
        filename,
      });

      toast.success('✅ Enregistrement sauvegardé !', {
        duration: 3000,
        icon: '🎉',
      });

      await loadRecordings();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast.error('❌ Erreur lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (path: string) => {
    try {
      console.log('Suppression du fichier:', path);
      await invoke('delete_recording', { filepath: path });
      toast.success('🗑️ Fichier supprimé');
      await loadRecordings();
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error('❌ Erreur lors de la suppression');
    }
  };

  const handleOpenRecordingsFolder = async () => {
    try {
      await invoke('open_recordings_folder');
    } catch (error) {
      console.error('Erreur ouverture dossier:', error);
      toast.error('Impossible d\'ouvrir le dossier');
    }
  };

  useEffect(() => {
    loadRecordings();
  }, []);

  return (
    <div className="app-container">
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            fontSize: '1.25rem',
            padding: '16px 24px',
            background: '#ffffff',
            color: '#2d3436',
            border: '1px solid #e9ecef',
            boxShadow: '0 10px 20px rgba(0, 0, 0, 0.05)',
          },
        }}
      />

      <header className="header">
        <div className="flex items-center gap-8">
          <span className="text-7xl">🎤</span>
          <div>
            <h1 className="header-title">
              Assistant Vocal
            </h1>
            <p className="header-subtitle">
              Enregistrements vocaux
            </p>
          </div>
        </div>
      </header>

      <div className="stats-container">
        <div className="stat-item">
          <div className="stat-value">{recordings.length}</div>
          <div className="stat-label">Enregistrements</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-8">
        {/* Colonne enregistreur */}
        <div className="flex justify-center">
          <div className="card w-full max-w-lg">
            <h2 className="text-3xl font-bold mb-8 text-center">
              <span className="block text-5xl mb-4">🔴</span>
              Enregistrement
            </h2>

            <Recorder
              onSave={handleSaveRecording}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Colonne liste */}
        <div>
          <div className="card">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold flex items-center gap-4">
                <span className="text-5xl">📋</span>
                Vos enregistrements
              </h2>

              {/* ✅ FIX ICI */}
              <div className="flex items-center gap-3 flex-nowrap">
                <button
                  onClick={handleOpenRecordingsFolder}
                  className="button-secondary flex items-center gap-2 whitespace-nowrap"
                  title="Ouvrir le dossier"
                >
                  <span className="text-2xl">📁</span>
                  Dossier
                </button>

                <button
                  onClick={loadRecordings}
                  className="action-button refresh flex items-center justify-center px-4 whitespace-nowrap"
                  title="Rafraîchir la liste"
                >
                  🔄
                </button>
              </div>
            </div>

            <RecordingsList
              recordings={recordings}
              onDelete={handleDelete}
              onRefresh={loadRecordings}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
