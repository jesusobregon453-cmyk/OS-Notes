import type { AudioRecordingState } from '../types';

export class AudioSyncEngine {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioPlayer: HTMLAudioElement | null = null;
  private startTime: number = 0;
  private timerInterval: number | null = null;
  private onStateChange: (state: AudioRecordingState) => void;

  private state: AudioRecordingState = {
    isRecording: false,
    isPlaying: false,
    duration: 0,
    currentTime: 0,
  };

  constructor(onStateChange: (state: AudioRecordingState) => void) {
    this.onStateChange = onStateChange;
  }

  public async startRecording(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        this.state = {
          ...this.state,
          isRecording: false,
          audioBlob,
          audioUrl,
        };
        this.onStateChange({ ...this.state });
        stream.getTracks().forEach((track) => track.stop());
      };

      this.startTime = Date.now();
      this.mediaRecorder.start(250);

      this.state = {
        ...this.state,
        isRecording: true,
        duration: 0,
        recordingStartTime: this.startTime,
      };
      this.onStateChange({ ...this.state });

      this.timerInterval = window.setInterval(() => {
        const elapsed = (Date.now() - this.startTime) / 1000;
        this.state.duration = elapsed;
        this.onStateChange({ ...this.state });
      }, 200);

      return true;
    } catch (err) {
      console.warn('Microphone permission not granted or audio recording not supported:', err);
      return false;
    }
  }

  public stopRecording(): void {
    if (this.mediaRecorder && this.state.isRecording) {
      this.mediaRecorder.stop();
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    }
  }

  public playAudio(onTimeUpdate?: (currentTime: number) => void): void {
    if (!this.state.audioUrl) return;

    if (!this.audioPlayer) {
      this.audioPlayer = new Audio(this.state.audioUrl);
      this.audioPlayer.ontimeupdate = () => {
        if (this.audioPlayer) {
          this.state.currentTime = this.audioPlayer.currentTime;
          this.onStateChange({ ...this.state });
          onTimeUpdate?.(this.audioPlayer.currentTime);
        }
      };
      this.audioPlayer.onended = () => {
        this.state.isPlaying = false;
        this.onStateChange({ ...this.state });
      };
    }

    this.audioPlayer.play();
    this.state.isPlaying = true;
    this.onStateChange({ ...this.state });
  }

  public pauseAudio(): void {
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.state.isPlaying = false;
      this.onStateChange({ ...this.state });
    }
  }

  public getElapsedRecordingTime(): number {
    if (!this.state.isRecording) return 0;
    return (Date.now() - this.startTime) / 1000;
  }
}
