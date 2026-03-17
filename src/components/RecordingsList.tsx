import React, { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { convertFileSrc } from '@tauri-apps/api/core';

interface Recording {
  name: string;
  path: string;
  size: number;
  created: string;
}

interface RecordingsListProps {
  recordings: Recording[];
  onDelete: (path: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export const RecordingsList: React.FC<RecordingsListProps> = ({
  recordings,
  onDelete,
  onRefresh,
}) => {
  const [playingPath, setPlayingPath] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlay = async (path: string) => {
    try {
      // Pause si même audio
      if (playingPath === path && audioRef.current) {
        audioRef.current.pause();
        setPlayingPath(null);
        return;
      }

      // Stop ancien audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const url = convertFileSrc(path);
      console.log("Lecture via URL:", url);

      const audio = new Audio();
      audio.src = url;

      // ✅ IMPORTANT : attendre que l'audio soit prêt
      audio.onloadedmetadata = () => {
        setDuration(audio.duration);
      };

      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };

      audio.onended = () => {
        setPlayingPath(null);
        setCurrentTime(0);
        setDuration(0);
      };

      audio.onerror = () => {
        console.error("Erreur lecture audio");
        alert("Impossible de lire ce fichier audio");
        setPlayingPath(null);
      };

      await audio.play();

      audioRef.current = audio;
      setPlayingPath(path);

    } catch (error) {
      console.error('Erreur lecture:', error);
      alert('Erreur lors de la lecture');
      setPlayingPath(null);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const newTime = parseFloat(e.target.value);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleDelete = async (path: string, name: string) => {
    if (window.confirm(`Supprimer "${name}" ?`)) {
      if (playingPath === path && audioRef.current) {
        audioRef.current.pause();
        setPlayingPath(null);
      }
      await onDelete(path);
    }
  };

  if (recordings.length === 0) {
    return (
      <div className="text-center py-16">
        <span className="text-7xl mb-6 block">🎙️</span>
        <p className="text-2xl text-gray-500 mb-3">
          Aucun enregistrement
        </p>
        <p className="text-gray-400">
          Commencez par enregistrer un message
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4">
        {recordings.map((rec) => {
          const date = new Date(rec.created);
          const timeAgo = formatDistanceToNow(date, {
            addSuffix: true,
            locale: fr
          });

          const isPlaying = playingPath === rec.path;

          return (
            <div
              key={rec.path}
              className={`recording-item ${isPlaying ? 'selected' : ''}`}
            >
              <div className="flex items-center gap-6">
                <button
                  onClick={() => handlePlay(rec.path)}
                  className={`action-button play ${isPlaying ? 'playing' : ''}`}
                >
                  {isPlaying ? '⏸️' : '▶️'}
                </button>

                <div className="flex-1 min-w-0">
                  <p className="text-2xl font-medium truncate mb-2">
                    {rec.name}
                  </p>
                  <div className="flex gap-4 text-gray-500 text-lg">
                    <span>{timeAgo}</span>
                    <span>•</span>
                    <span>{formatFileSize(rec.size)}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(rec.path, rec.name)}
                  className="action-button delete"
                >
                  🗑️
                </button>
              </div>

              {isPlaying && (
                <div className="mt-4">
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    className="progress-bar"
                  />
                  <div className="flex justify-between text-gray-500">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
