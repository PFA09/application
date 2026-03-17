import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  onRefresh
}) => {
  const [playingPath, setPlayingPath] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup global
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setPlayingPath(null);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlay = async (path: string) => {
    try {
      // Toggle pause
      if (playingPath === path) {
        stopAudio();
        return;
      }

      stopAudio();

      const audio = new Audio(convertFileSrc(path));

      audio.onloadedmetadata = () => {
        setDuration(audio.duration || 0);
      };

      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };

      audio.onended = () => {
        stopAudio();
      };

      audio.onerror = () => {
        stopAudio();
        alert('Impossible de lire ce fichier audio');
      };

      await audio.play();

      audioRef.current = audio;
      setPlayingPath(path);
    } catch (err) {
      console.error(err);
      stopAudio();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const value = Number(e.target.value);
    audioRef.current.currentTime = value;
    setCurrentTime(value);
  };

  const handleDelete = async (path: string, name: string) => {
    if (!window.confirm(`Supprimer "${name}" ?`)) return;

    if (playingPath === path) {
      stopAudio();
    }

    await onDelete(path);
    await onRefresh();
  };

  if (recordings.length === 0) {
    return (
      <div className="text-center py-16">
        <span className="text-7xl mb-6 block">🎙️</span>
        <p className="text-2xl text-gray-500 mb-3">Aucun enregistrement</p>
        <p className="text-gray-400">Commencez par enregistrer un message</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4">
        {recordings.map((rec) => {
          const isPlaying = playingPath === rec.path;

          const timeAgo = formatDistanceToNow(new Date(rec.created), {
            addSuffix: true,
            locale: fr
          });

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
                  <p className="text-2xl font-medium text-gray-800 truncate mb-2">
                    {rec.name}
                  </p>
                  <div className="flex items-center gap-4 text-gray-500 text-lg">
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
                <div className="mt-4 space-y-2">
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    value={currentTime}
                    onChange={handleSeek}
                    className="progress-bar"
                  />
                  <div className="flex justify-between text-gray-500 text-base">
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
