import React, { useState, useEffect } from 'react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';

interface RecorderProps {
  onSave: (blob: Blob) => Promise<void>;
  isLoading?: boolean;
}

export const Recorder: React.FC<RecorderProps> = ({ onSave, isLoading }) => {
  const { isRecording, startRecording, stopRecording, error } = useAudioRecorder();
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  // Timer pendant l'enregistrement
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
        // Simuler niveau audio (à remplacer par vraie analyse)
        setAudioLevel(Math.random() * 100);
      }, 1000);
    } else {
      setRecordingTime(0);
      setAudioLevel(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      const blob = await stopRecording();
      if (blob) {
        await onSave(blob);
      }
    } else {
      await startRecording();
    }
  };

  return (
    <div className="space-y-8">
      {/* Bouton d'enregistrement centré et plus petit */}
      <div className="flex justify-center">
        <button
          onClick={handleToggleRecording}
          disabled={isLoading}
          className={`
            button-record
            ${isRecording ? 'recording' : ''}
            ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <span className="text-6xl mb-2">
            {isRecording ? '⏹️' : '🎤'}
          </span>
          <span className="text-2xl font-bold">
            {isRecording ? 'ARRÊTER' : 'ENREGISTRER'}
          </span>
        </button>
      </div>

      {/* Indicateur de progression */}
      {isRecording && (
        <div className="space-y-6 bg-gray-900 p-6 rounded-3xl">
          <div className="flex justify-between items-center">
            <span className="text-xl text-gray-400">Durée</span>
            <span className="timer text-2xl">
              {formatTime(recordingTime)}
            </span>
          </div>

          {/* Visualisation niveau audio */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-lg text-gray-400">Niveau audio</span>
              <span className="text-xl font-bold">{Math.round(audioLevel)}%</span>
            </div>
            <div className="audio-level">
              <div
                className="audio-level-fill"
                style={{ width: `${audioLevel}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Message d'erreur */}
      {error && (
        <div className="message message-error">
          <span className="text-2xl mr-3">⚠️</span>
          <span className="text-lg">{error}</span>
        </div>
      )}
    </div>
  );
};
