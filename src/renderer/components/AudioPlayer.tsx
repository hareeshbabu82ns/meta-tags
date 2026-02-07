import React, { useRef, useEffect, useState } from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlayerStore } from "../stores";

export function AudioPlayer() {
  const currentFile = usePlayerStore((s) => s.currentFile);
  const playing = usePlayerStore((s) => s.playing);
  const setPlaying = usePlayerStore((s) => s.setPlaying);
  const stop = usePlayerStore((s) => s.stop);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);

  useEffect(() => {
    if (!audioRef.current || !currentFile) return;
    const url = window.electronAPI.getStreamUrl(currentFile.path);
    audioRef.current.src = url;
    setPlaying(false);
  }, [currentFile, setPlaying]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.play().catch(console.error);
    } else {
      audioRef.current.pause();
    }
  }, [playing]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume;
    }
  }, [volume, muted]);

  const handleTimeUpdate = () => {
    if (audioRef.current && !isSeeking) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeekStart = () => {
    setIsSeeking(true);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleSeekEnd = () => {
    setIsSeeking(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (!currentFile) return null;

  return (
    <div className="border-b border-border bg-card px-4 py-2">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setPlaying(false)}
      />
      <div className="flex items-center gap-3">
        {/* Track info */}
        <div className="w-48 min-w-0">
          <p className="text-sm font-medium truncate">{currentFile.filename}</p>
          <p className="text-xs text-muted-foreground truncate">
            {currentFile.type.toUpperCase()}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => setPlaying(!playing)}
          >
            {playing ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Seek bar */}
        <span className="text-xs text-muted-foreground w-10 text-right">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          onMouseDown={handleSeekStart}
          onMouseUp={handleSeekEnd}
          onTouchStart={handleSeekStart}
          onTouchEnd={handleSeekEnd}
          className="flex-1 h-1 accent-primary cursor-pointer"
        />
        <span className="text-xs text-muted-foreground w-10">
          {formatTime(duration)}
        </span>

        {/* Volume */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setMuted(!muted)}
        >
          {muted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </Button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          onChange={(e) => {
            setVolume(Number(e.target.value));
            setMuted(false);
          }}
          className="w-20 h-1 accent-primary cursor-pointer"
        />

        {/* Close */}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={stop}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
