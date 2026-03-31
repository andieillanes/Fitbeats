import React, { useRef, useEffect, useState } from 'react';
import { usePlayer, API } from '../App';
import { 
  Play, Pause, SkipBack, SkipForward, 
  SpeakerHigh, SpeakerLow, SpeakerX,
  MusicNote, X
} from '@phosphor-icons/react';
import { Slider } from './ui/slider';

export default function MusicPlayer() {
  const {
    currentMix,
    playlist,
    isPlaying,
    currentIndex,
    playNext,
    playPrevious,
    togglePlay,
    stopPlaying,
    setIsPlaying
  } = usePlayer();

  const audioRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => {
          setIsPlaying(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentMix, setIsPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    if (currentIndex < playlist.length - 1) {
      playNext();
    } else {
      setIsPlaying(false);
    }
  };

  const handleSeek = (value) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value) => {
    setVolume(value[0]);
    setIsMuted(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const VolumeIcon = isMuted || volume === 0 
    ? SpeakerX 
    : volume < 0.5 
      ? SpeakerLow 
      : SpeakerHigh;

  if (!currentMix) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A] border-t border-[#27272A] h-24 z-50" data-testid="music-player">
      <audio
        ref={audioRef}
        src={`${API}/mixes/${currentMix.mix_id}/audio`}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        crossOrigin="use-credentials"
      />

      <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-4">
        {/* Track Info */}
        <div className="flex items-center gap-3 w-64 flex-shrink-0">
          <div className="w-14 h-14 rounded-md bg-[#1F1F1F] flex items-center justify-center flex-shrink-0 overflow-hidden">
            {currentMix.cover_path ? (
              <img
                src={`${API}/mixes/${currentMix.mix_id}/cover`}
                alt={currentMix.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <MusicNote size={24} className="text-[#71717A]" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-white truncate text-sm" data-testid="player-track-name">
              {currentMix.name}
            </p>
            <p className="text-xs text-[#A1A1AA] truncate" data-testid="player-track-artist">
              {currentMix.artist}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex-1 flex flex-col items-center gap-2">
          {/* Playback Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={playPrevious}
              disabled={currentIndex === 0}
              className="text-[#A1A1AA] hover:text-white disabled:text-[#71717A] disabled:cursor-not-allowed transition-colors"
              data-testid="player-prev-btn"
            >
              <SkipBack size={24} weight="fill" />
            </button>

            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
              data-testid="player-play-btn"
            >
              {isPlaying ? (
                <Pause size={20} weight="fill" />
              ) : (
                <Play size={20} weight="fill" className="ml-0.5" />
              )}
            </button>

            <button
              onClick={playNext}
              disabled={currentIndex === playlist.length - 1}
              className="text-[#A1A1AA] hover:text-white disabled:text-[#71717A] disabled:cursor-not-allowed transition-colors"
              data-testid="player-next-btn"
            >
              <SkipForward size={24} weight="fill" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full max-w-xl flex items-center gap-2">
            <span className="text-xs text-[#71717A] w-10 text-right">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={handleSeek}
              className="flex-1"
              data-testid="player-progress-slider"
            />
            <span className="text-xs text-[#71717A] w-10">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Volume & Close */}
        <div className="flex items-center gap-4 w-48 justify-end flex-shrink-0">
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="text-[#A1A1AA] hover:text-white transition-colors"
              data-testid="player-volume-btn"
            >
              <VolumeIcon size={20} />
            </button>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.01}
              onValueChange={handleVolumeChange}
              className="w-24"
              data-testid="player-volume-slider"
            />
          </div>

          <button
            onClick={stopPlaying}
            className="text-[#71717A] hover:text-white transition-colors"
            data-testid="player-close-btn"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
