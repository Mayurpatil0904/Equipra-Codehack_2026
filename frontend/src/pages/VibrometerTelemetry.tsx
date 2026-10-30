// frontend/src/pages/VibrometerTelemetry.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Radio,
  Zap,
  Volume2,
  VolumeX,
  Play,
  Square,
  Sliders,
  Save,
  CheckCircle2,
  AlertTriangle,
  Info,
  Cpu,
  RefreshCw,
  Sparkles,
  Layers,
  History,
  TrendingUp,
  FileText,
  Clock,
  Gauge,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  FlaskConical,
  Mic,
  AlertCircle,
} from "lucide-react";
import { telemetryApi } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type FilterMode = "raw" | "notch50" | "bandpass" | "highpass";

export default function VibrometerTelemetry() {
  const { user } = useApp();
  const [searchParams] = useSearchParams();
  const equipmentParam = searchParams.get("equipment") || "Optical Laser Vibrometer & Acoustic Receiver";

  // Connection & Audio State
  const [isConnected, setIsConnected] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [digitalGain, setDigitalGain] = useState(1.5);
  const [filterMode, setFilterMode] = useState<FilterMode>("notch50");
  const [activeTab, setActiveTab] = useState<"oscilloscope" | "fft" | "dual">("dual");
  const [showCircuitModal, setShowCircuitModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Audio Input Devices & Engine State
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [audioContextState, setAudioContextState] = useState<string>("closed");

  // Simulation & Test Signal Generator
  const [isSimulating, setIsSimulating] = useState(false);
  const [simFrequency, setSimFrequency] = useState(120);
  const simOscRef = useRef<OscillatorNode | null>(null);
  const simGainRef = useRef<GainNode | null>(null);


  // Live Telemetry Metrics
  const [peakFrequency, setPeakFrequency] = useState(0);
  const [averageRmsDb, setAverageRmsDb] = useState(-60);
  const [peakVoltageVpp, setPeakVoltageVpp] = useState(0);
  const [snrEstDb, setSnrEstDb] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Logged History
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Save Modal Form State
  const [experimentName, setExperimentName] = useState("Optical Laser Vibrometry Test");
  const [studentNotes, setStudentNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Web Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const destinationGainRef = useRef<GainNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Canvas Refs
  const oscCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fftCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load Past History
  const loadHistory = useCallback(async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const data = await telemetryApi.getMyHistory();
      setHistory(data);
    } catch (err: any) {
      console.error("Failed to load telemetry history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, [user]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Session elapsed timer
  useEffect(() => {
    let timer: any;
    if (isConnected && sessionStartTime) {
      timer = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isConnected, sessionStartTime]);

  // Enumerate input devices
  const refreshAudioDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter((d) => d.kind === "audioinput");
      setAudioDevices(inputs);
      if (inputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(inputs[0].deviceId);
      }
    } catch (e) {
      console.warn("Could not enumerate audio devices", e);
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    refreshAudioDevices();
    navigator.mediaDevices?.addEventListener?.("devicechange", refreshAudioDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", refreshAudioDevices);
    };
  }, [refreshAudioDevices]);

  // Switch audio input device on the fly while connected
  const switchAudioDevice = async (newDeviceId: string) => {
    setSelectedDeviceId(newDeviceId);
    if (!isConnected || !audioContextRef.current) return;
    try {
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      };
      if (newDeviceId) {
        audioConstraints.deviceId = { exact: newDeviceId };
      }

      let newStream: MediaStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      } catch (err) {
        newStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      mediaStreamRef.current = newStream;

      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.disconnect();
        } catch (_) {}
      }

      const newSource = audioContextRef.current.createMediaStreamSource(newStream);
      sourceNodeRef.current = newSource;

      if (filterNodeRef.current) {
        newSource.connect(filterNodeRef.current);
      }

      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }
      setAudioContextState(audioContextRef.current.state);

      const deviceLabel = audioDevices.find((d) => d.deviceId === newDeviceId)?.label || "selected input";
      toast.success(`Active feed switched to: ${deviceLabel}`);
    } catch (err: any) {
      console.error("Failed to switch audio input device:", err);
      toast.error(`Could not switch audio input: ${err.message || "Device unavailable"}`);
    }
  };

  // Hardware Connection (Web Audio API)
  const connectHardware = async () => {
    try {
      // 1. Initialize AudioContext and attach state listener
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      ctx.onstatechange = () => {
        setAudioContextState(ctx.state);
      };

      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      setAudioContextState(ctx.state);

      // 2. Request user microphone / line-in stream
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      };
      if (selectedDeviceId) {
        audioConstraints.deviceId = { exact: selectedDeviceId };
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
        });
      } catch (e) {
        console.warn("Exact deviceId failed, falling back to default audio constraint", e);
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
      }

      // Refresh devices to get permission-unlocked labels
      refreshAudioDevices();

      mediaStreamRef.current = stream;

      const source = ctx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      // Digital Gain Node
      const gain = ctx.createGain();
      gain.gain.value = digitalGain;
      gainNodeRef.current = gain;

      // Filter Node
      const filter = ctx.createBiquadFilter();
      setupFilter(filter, filterMode, ctx.sampleRate);
      filterNodeRef.current = filter;

      // Analyser Node (High Resolution FFT)
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0.75;
      analyserNodeRef.current = analyser;

      // Destination Gain Node for Optional Audio Monitoring
      const destGain = ctx.createGain();
      destGain.gain.value = isAudioMuted ? 0 : 0.8;
      destinationGainRef.current = destGain;

      // Audio Graph: Source -> Filter -> Gain -> Analyser -> Output(Optional)
      source.connect(filter);
      filter.connect(gain);
      gain.connect(analyser);
      analyser.connect(destGain);
      destGain.connect(ctx.destination);

      setIsConnected(true);
      setSessionStartTime(Date.now());
      toast.success("Optical Vibrometer Connected (44.1 kHz, 16-bit Raw Feed)");

      // Start 60 FPS Visualizer Loop
      startVisualizerLoop(analyser, ctx.sampleRate);
    } catch (err: any) {
      console.error("Hardware connection failed:", err);
      toast.error(err.message ?? "Could not access 3.5mm line-in port. Please grant microphone permissions.");
    }
  };

  // Toggle Synthetic Laser Vibrometer Test Signal
  const toggleSimulation = async () => {
    if (isSimulating) {
      if (simOscRef.current) {
        try {
          simOscRef.current.stop();
        } catch (_) {}
        simOscRef.current.disconnect();
        simOscRef.current = null;
      }
      if (simGainRef.current) {
        simGainRef.current.disconnect();
        simGainRef.current = null;
      }
      setIsSimulating(false);
      toast.info("Test generator deactivated. Resumed live hardware receiver.");
    } else {
      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        ctx.onstatechange = () => {
          setAudioContextState(ctx.state);
        };

        const gain = ctx.createGain();
        gain.gain.value = digitalGain;
        gainNodeRef.current = gain;

        const filter = ctx.createBiquadFilter();
        setupFilter(filter, filterMode, ctx.sampleRate);
        filterNodeRef.current = filter;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 4096;
        analyser.smoothingTimeConstant = 0.75;
        analyserNodeRef.current = analyser;

        const destGain = ctx.createGain();
        destGain.gain.value = isAudioMuted ? 0 : 0.8;
        destinationGainRef.current = destGain;

        filter.connect(gain);
        gain.connect(analyser);
        analyser.connect(destGain);
        destGain.connect(ctx.destination);

        setIsConnected(true);
        setSessionStartTime(Date.now());
        startVisualizerLoop(analyser, ctx.sampleRate);
      }

      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      setAudioContextState(ctx.state);

      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(simFrequency, ctx.currentTime);

      const simGain = ctx.createGain();
      simGain.gain.setValueAtTime(0.65, ctx.currentTime);

      osc.connect(simGain);
      if (filterNodeRef.current) {
        simGain.connect(filterNodeRef.current);
      }

      osc.start();
      simOscRef.current = osc;
      simGainRef.current = simGain;
      setIsSimulating(true);
      toast.success(`🧪 Simulated Laser Vibrometer signal active (${simFrequency} Hz / ${simFrequency * 60} RPM)`);
    }
  };

  const changeSimFrequency = (freq: number) => {
    setSimFrequency(freq);
    if (simOscRef.current && audioContextRef.current) {
      simOscRef.current.frequency.setTargetAtTime(freq, audioContextRef.current.currentTime, 0.05);
    }
  };

  const disconnectHardware = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (simOscRef.current) {
      try {
        simOscRef.current.stop();
      } catch (_) {}
      simOscRef.current.disconnect();
      simOscRef.current = null;
    }
    if (simGainRef.current) {
      simGainRef.current.disconnect();
      simGainRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsSimulating(false);
    setIsConnected(false);
    setAudioContextState("closed");
    setSessionStartTime(null);
    toast.info("Instrument disconnected.");
  };

  // Setup Biquad Filter Modes
  const setupFilter = (filter: BiquadFilterNode, mode: FilterMode, sampleRate: number) => {
    if (!filter) return;
    switch (mode) {
      case "notch50":
        // 50 Hz Mains Hum Notch Filter with Q = 10
        filter.type = "notch";
        filter.frequency.value = 50;
        filter.Q.value = 8.0;
        break;
      case "bandpass":
        // Voice / Acoustic Bandpass (300 Hz – 3400 Hz)
        filter.type = "bandpass";
        filter.frequency.value = 1850;
        filter.Q.value = 0.7;
        break;
      case "highpass":
        // Highpass (> 20 Hz) to eliminate slow hand tremor / air drift
        filter.type = "highpass";
        filter.frequency.value = 25;
        filter.Q.value = 1.0;
        break;
      case "raw":
      default:
        // Allpass (bypass)
        filter.type = "allpass";
        filter.frequency.value = 1000;
        break;
    }
  };

  // Update Gain when slider changes
  useEffect(() => {
    if (gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(digitalGain, audioContextRef.current.currentTime, 0.05);
    }
  }, [digitalGain]);

  // Update Filter when mode changes
  useEffect(() => {
    if (filterNodeRef.current && audioContextRef.current) {
      setupFilter(filterNodeRef.current, filterMode, audioContextRef.current.sampleRate);
    }
  }, [filterMode]);

  // Update Audio Monitor Mute
  useEffect(() => {
    if (destinationGainRef.current && audioContextRef.current) {
      destinationGainRef.current.gain.setTargetAtTime(
        isAudioMuted ? 0 : 0.8,
        audioContextRef.current.currentTime,
        0.05
      );
    }
  }, [isAudioMuted]);

  // Real-Time 60 FPS HTML5 Canvas Visualizer
  const startVisualizerLoop = (analyser: AnalyserNode, sampleRate: number) => {
    const bufferLength = analyser.frequencyBinCount;
    const timeData = new Uint8Array(bufferLength);
    const freqData = new Uint8Array(bufferLength);
    let lastMetricUpdateTime = 0;

    const render = () => {
      analyser.getByteTimeDomainData(timeData);
      analyser.getByteFrequencyData(freqData);

      // 1. Calculate Peak Frequency & RMS Amplitude
      let maxVal = -1;
      let maxIndex = 0;
      let sumSquares = 0;
      let minWave = 255;
      let maxWave = 0;

      // Start search above DC bin to avoid false 0 Hz dominance
      for (let i = 1; i < bufferLength; i++) {
        const val = freqData[i];
        if (val > maxVal) {
          maxVal = val;
          maxIndex = i;
        }

        // Calculate time domain RMS
        const normalized = (timeData[i] - 128) / 128;
        sumSquares += normalized * normalized;

        if (timeData[i] < minWave) minWave = timeData[i];
        if (timeData[i] > maxWave) maxWave = timeData[i];
      }

      // If peak is above noise floor (> 12), calculate resonant frequency
      const dominantHz = maxVal > 12 ? maxIndex * (sampleRate / analyser.fftSize) : 0;
      const rms = Math.sqrt(sumSquares / bufferLength);
      const rmsDb = rms > 0.00001 ? 20 * Math.log10(rms) : -80;
      const vpp = ((maxWave - minWave) / 255) * 3.3; // Estimated Vpp relative to 3.3V ADC full scale

      // Throttle React state updates to 10 Hz (every 100ms) to ensure smooth 60 FPS animation
      const now = performance.now();
      if (now - lastMetricUpdateTime > 100) {
        lastMetricUpdateTime = now;
        setPeakFrequency(Math.round(dominantHz * 10) / 10);
        setAverageRmsDb(Math.round(rmsDb * 10) / 10);
        setPeakVoltageVpp(Math.round(vpp * 1000) / 1000);
        setSnrEstDb(Math.max(0, Math.round((rmsDb + 65) * 1.4)));
      }

      // 2. Draw Oscilloscope (Time Domain)
      if (oscCanvasRef.current) {
        const canvas = oscCanvasRef.current;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;

          // Clear with dark cyber grid
          ctx.fillStyle = "#090d16";
          ctx.fillRect(0, 0, width, height);

          // Grid lines
          ctx.strokeStyle = "rgba(16, 185, 129, 0.12)";
          ctx.lineWidth = 1;
          const gridStep = 40;
          for (let x = 0; x < width; x += gridStep) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
          }
          for (let y = 0; y < height; y += gridStep) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
          }

          // Center zero-voltage reference
          ctx.strokeStyle = "rgba(16, 185, 129, 0.3)";
          ctx.beginPath();
          ctx.moveTo(0, height / 2);
          ctx.lineTo(width, height / 2);
          ctx.stroke();

          // Laser Phosphor Waveform
          ctx.lineWidth = 2.2;
          ctx.strokeStyle = "#10b981"; // Emerald laser green
          ctx.shadowBlur = 8;
          ctx.shadowColor = "#10b981";

          ctx.beginPath();
          const sliceWidth = width / bufferLength;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            const v = timeData[i] / 128.0;
            const y = (v * height) / 2;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);

            x += sliceWidth;
          }

          ctx.stroke();
          ctx.shadowBlur = 0; // reset
        }
      }

      // 3. Draw FFT Spectrum (Frequency Domain)
      if (fftCanvasRef.current) {
        const canvas = fftCanvasRef.current;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;

          ctx.fillStyle = "#090d16";
          ctx.fillRect(0, 0, width, height);

          // Grid
          ctx.strokeStyle = "rgba(6, 182, 212, 0.12)";
          ctx.lineWidth = 1;
          for (let y = 0; y < height; y += 35) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
          }

          // Frequency Bars with Cyan/Violet Glow
          const barWidth = (width / (bufferLength / 3)) * 2.2;
          let x = 0;

          for (let i = 0; i < bufferLength / 3; i++) {
            const barHeight = (freqData[i] / 255) * (height - 15);

            // Gradient per bar
            const grad = ctx.createLinearGradient(0, height, 0, height - barHeight);
            grad.addColorStop(0, "rgba(6, 182, 212, 0.3)");
            grad.addColorStop(0.7, "#06b6d4");
            grad.addColorStop(1, i === maxIndex ? "#eab308" : "#818cf8");

            ctx.fillStyle = grad;
            ctx.fillRect(x, height - barHeight, Math.max(1, barWidth - 1), barHeight);

            // Highlight Peak frequency with a marker
            if (i === maxIndex && freqData[i] > 30) {
              ctx.fillStyle = "#facc15";
              ctx.beginPath();
              ctx.arc(x + barWidth / 2, height - barHeight - 4, 3.5, 0, Math.PI * 2);
              ctx.fill();
            }

            x += barWidth;
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Save Experiment to Academic Profile
  const handleSaveExperiment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please log in to save lab telemetry.");
      return;
    }
    setIsSaving(true);
    try {
      await telemetryApi.saveSession({
        experimentName: experimentName.trim() || "Optical Laser Vibrometry Test",
        peakFrequencyHz: peakFrequency,
        averageRmsDb: averageRmsDb,
        durationSeconds: Math.max(1, elapsedSeconds),
        isFiltered: filterMode !== "raw",
        studentNotes: studentNotes.trim() || undefined,
        equipmentId: equipmentParam,
      });

      toast.success("✅ Experiment data logged to your academic record!");
      setShowSaveModal(false);
      setStudentNotes("");
      loadHistory();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save telemetry run");
    } finally {
      setIsSaving(false);
    }
  };

  // Classify detected vibration
  const getVibrationCategory = (hz: number) => {
    if (hz < 10) return "Ultra-low drift / Ambient air currents";
    if (hz >= 48 && hz <= 52) return "50 Hz AC Mains Hum / Fluorescent Flicker";
    if (hz >= 98 && hz <= 102) return "100 Hz Full-Wave Rectified Harmonic";
    if (hz >= 118 && hz <= 122) return "120 Hz Dual-Pole Motor Bearing Vibration";
    if (hz < 300) return "Low Mechanical Resonance / Motor Structural Rumble";
    if (hz >= 300 && hz <= 3400) return "Acoustic Band (Speech / Speaker Cone Modulation)";
    return "High Frequency Ultrasonic / Piezo Ringing";
  };

  const estimatedRpm = Math.round(peakFrequency * 60);

  return (
    <div className="container py-8 max-w-7xl space-y-8 animate-fade-in">
      {/* ── Top Header & Hardware Badge ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/15 text-primary border border-primary/30">
              <Zap className="h-3.5 w-3.5" /> Cyber-Physical Smart Lab Suite
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
              <Cpu className="h-3.5 w-3.5" /> Parul University ECE (Honors in IoT)
            </span>
            {isConnected && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 animate-pulse">
                ● Live 44.1 kHz Feed
              </span>
            )}
          </div>

          <h1 className="text-3xl font-extrabold font-display tracking-tight text-foreground flex items-center gap-3">
            Optical Laser Vibrometer &amp; Acoustic Telemetry
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Non-contact micro-Doppler optical vibration sensing via coherent 650 nm laser backscatter. Real-time time-domain oscilloscope, Fourier transform (FFT) harmonic analysis, and academic auto-logging.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowCircuitModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-border bg-card hover:bg-muted text-foreground transition-all shadow-sm"
          >
            <Info className="h-4 w-4 text-primary" />
            Hardware &amp; Circuit
          </button>

          {/* Test Signal / Simulation Toggle */}
          <button
            onClick={toggleSimulation}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all shadow-sm",
              isSimulating
                ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/50"
                : "bg-card border-border hover:bg-muted text-foreground"
            )}
            title="Generate synthetic laser vibration signal for lab verification without physical PCB"
          >
            <FlaskConical className="h-3.5 w-3.5" />
            {isSimulating ? "Stop Test Signal" : "🧪 Test Signal (Demo)"}
          </button>

          {!isConnected ? (
            <div className="flex items-center gap-2">
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="text-xs bg-card border border-border rounded-xl px-3 py-2 text-foreground font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-primary max-w-[200px] truncate"
                title="Select Audio Input Source"
              >
                {audioDevices.length === 0 ? (
                  <option value="">Default Audio Input</option>
                ) : (
                  audioDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Audio Input ${i + 1}`}
                    </option>
                  ))
                )}
              </select>

              <button
                onClick={connectHardware}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all shadow-lg"
              >
                <Radio className="h-4 w-4" />
                Connect 3.5mm Feed
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Allow switching input devices on the fly while connected */}
              <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-2.5 py-1.5 shadow-sm">
                <Mic className="h-3.5 w-3.5 text-primary shrink-0" />
                <select
                  value={selectedDeviceId}
                  onChange={(e) => switchAudioDevice(e.target.value)}
                  className="text-xs bg-transparent text-foreground font-medium focus:outline-none max-w-[170px] truncate"
                  title="Switch Audio Input Source"
                >
                  {audioDevices.length === 0 ? (
                    <option value="">Default Audio Input</option>
                  ) : (
                    audioDevices.map((d, i) => (
                      <option key={d.deviceId || i} value={d.deviceId}>
                        {d.label || `Input ${i + 1}`}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <button
                onClick={() => setShowSaveModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md transition-all"
              >
                <Save className="h-4 w-4" />
                Save Report
              </button>

              <button
                onClick={disconnectHardware}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white transition-all"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Real-Time Instrumentation Gauges HUD ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Dominant Peak Frequency */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Dominant Resonance</span>
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-3xl font-extrabold font-display text-foreground">
              {isConnected ? peakFrequency.toFixed(1) : "—"}
            </span>
            <span className="text-sm font-bold text-muted-foreground">Hz</span>
          </div>
          <p className="text-[11px] text-primary truncate mt-1 font-medium">
            {isConnected ? getVibrationCategory(peakFrequency) : "Awaiting hardware line-in…"}
          </p>
        </div>

        {/* Estimated Motor RPM */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Estimated Motor Speed</span>
            <Gauge className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-3xl font-extrabold font-display text-amber-600 dark:text-amber-400">
              {isConnected ? estimatedRpm.toLocaleString() : "—"}
            </span>
            <span className="text-sm font-bold text-muted-foreground">RPM</span>
          </div>
          <p className="text-[11px] text-muted-foreground truncate mt-1">
            Calculated from 1× rotational harmonic
          </p>
        </div>

        {/* Average RMS Decibels (VU Level) */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Optical RMS Level</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-3xl font-extrabold font-display text-emerald-600 dark:text-emerald-400">
              {isConnected ? averageRmsDb.toFixed(1) : "—"}
            </span>
            <span className="text-sm font-bold text-muted-foreground">dBFS</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-100 rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, (averageRmsDb + 60) * 1.6))}%` }}
            />
          </div>
        </div>

        {/* Session Elapsed / Vpp */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Voltage (Vpp) &amp; Time</span>
            <Clock className="h-4 w-4 text-cyan-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-bold font-mono text-cyan-600 dark:text-cyan-400">
              {isConnected ? `${peakVoltageVpp.toFixed(2)} V` : "0.00 V"}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground truncate mt-1 font-mono">
            Elapsed: {Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s
          </p>
        </div>
      </div>

      {/* ── Audio Engine State & Simulation Banners ── */}
      {isConnected && audioContextState === "suspended" && (
        <div className="bg-amber-500/15 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3 text-xs text-amber-700 dark:text-amber-400">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="font-bold">Audio Engine Paused by Browser</p>
              <p className="text-[11px] opacity-85">Click the button to resume processing incoming sound and vibration telemetry.</p>
            </div>
          </div>
          <button
            onClick={async () => {
              if (audioContextRef.current) {
                await audioContextRef.current.resume();
                setAudioContextState(audioContextRef.current.state);
                toast.success("Audio engine resumed!");
              }
            }}
            className="px-4 py-2 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition-all text-xs shadow-sm"
          >
            Resume Audio Engine
          </button>
        </div>
      )}

      {/* Synthetic Signal Generator Presets Bar */}
      {isSimulating && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400 font-semibold">
            <FlaskConical className="h-5 w-5 shrink-0 text-amber-500 animate-pulse" />
            <div>
              <div className="font-bold text-foreground">Synthetic Laser Vibration Generator Active</div>
              <div className="text-[11px] text-muted-foreground font-mono">
                Current Frequency: <strong className="text-amber-500">{simFrequency} Hz</strong> • Speed: <strong className="text-amber-500">{(simFrequency * 60).toLocaleString()} RPM</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-muted-foreground mr-1">Vibration Presets:</span>
            {[
              { label: "120 Hz Bearing", hz: 120 },
              { label: "50 Hz Mains Hum", hz: 50 },
              { label: "440 Hz Tuning Fork", hz: 440 },
              { label: "1.2 kHz Spindle", hz: 1200 },
            ].map((p) => (
              <button
                key={p.hz}
                onClick={() => changeSimFrequency(p.hz)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shadow-xs",
                  simFrequency === p.hz
                    ? "bg-amber-500 text-black border-amber-500"
                    : "border-border bg-card hover:bg-muted text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Main Oscilloscope & FFT Signal Processing Rack ── */}
      <div
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        onClick={() => {
          if (audioContextRef.current && audioContextRef.current.state === "suspended") {
            audioContextRef.current.resume();
            setAudioContextState(audioContextRef.current.state);
          }
        }}
      >
        {/* Left 2 Cols: Oscilloscope & Spectrum Visualizers */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col">
            {/* Visualizer Mode Header */}
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-foreground font-display">
                  Live 60 FPS Optical Oscilloscope &amp; FFT Spectrogram
                </h3>
              </div>

              <div className="flex bg-muted/60 p-1 rounded-xl border border-border text-xs font-semibold">
                <button
                  onClick={() => setActiveTab("dual")}
                  className={cn(
                    "px-3 py-1 rounded-lg transition-all",
                    activeTab === "dual" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
                  )}
                >
                  Dual Split
                </button>
                <button
                  onClick={() => setActiveTab("oscilloscope")}
                  className={cn(
                    "px-3 py-1 rounded-lg transition-all",
                    activeTab === "oscilloscope" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
                  )}
                >
                  Oscilloscope (Time)
                </button>
                <button
                  onClick={() => setActiveTab("fft")}
                  className={cn(
                    "px-3 py-1 rounded-lg transition-all",
                    activeTab === "fft" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
                  )}
                >
                  FFT Spectrum (Freq)
                </button>
              </div>
            </div>

            {/* Canvas Screens */}
            <div className="space-y-3">
              {(activeTab === "dual" || activeTab === "oscilloscope") && (
                <div className="relative rounded-xl overflow-hidden border border-emerald-950/80 bg-[#090d16] shadow-inner">
                  <div className="absolute top-2 left-3 z-10 text-[10px] font-mono text-emerald-400 bg-black/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    CH1: Time-Domain (Voltage vs Time) • 100 mV/div
                  </div>
                  <canvas
                    ref={oscCanvasRef}
                    width={800}
                    height={activeTab === "dual" ? 180 : 320}
                    className="w-full h-auto block"
                  />
                </div>
              )}

              {(activeTab === "dual" || activeTab === "fft") && (
                <div className="relative rounded-xl overflow-hidden border border-cyan-950/80 bg-[#090d16] shadow-inner">
                  <div className="absolute top-2 left-3 z-10 text-[10px] font-mono text-cyan-400 bg-black/60 px-2 py-0.5 rounded border border-cyan-500/30">
                    FFT: Frequency Spectrum (0 Hz – 7.5 kHz) • Resonant Peak: {peakFrequency} Hz
                  </div>
                  <canvas
                    ref={fftCanvasRef}
                    width={800}
                    height={activeTab === "dual" ? 180 : 320}
                    className="w-full h-auto block"
                  />
                </div>
              )}
            </div>

            {!isConnected && (
              <div className="text-center py-6 text-xs text-muted-foreground bg-muted/20 rounded-xl mt-3 border border-dashed border-border flex flex-col items-center justify-center gap-2">
                <Radio className="h-6 w-6 text-muted-foreground/60 animate-bounce" />
                <p className="font-medium">Connect your laptop 3.5mm line-in cable to begin live streaming</p>
                <div className="flex items-center gap-2 mt-1">
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="text-xs bg-card border border-border rounded-lg px-2.5 py-1.5 text-foreground font-medium max-w-[220px] truncate"
                  >
                    {audioDevices.length === 0 ? (
                      <option value="">Default Audio Input</option>
                    ) : (
                      audioDevices.map((d, i) => (
                        <option key={d.deviceId || i} value={d.deviceId}>
                          {d.label || `Microphone ${i + 1}`}
                        </option>
                      ))
                    )}
                  </select>
                  <button
                    onClick={connectHardware}
                    className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                  >
                    Connect Now
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Signal Conditioning & Filter Controls Rack */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-primary" />
                DSP Signal Conditioning
              </h3>
              <button
                onClick={() => setIsAudioMuted(!isAudioMuted)}
                className={cn(
                  "p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all",
                  isAudioMuted
                    ? "bg-muted text-muted-foreground border-border"
                    : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                )}
                title="Toggle headphone audio monitoring"
              >
                {isAudioMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                <span>{isAudioMuted ? "Audio Muted" : "Monitoring Live"}</span>
              </button>
            </div>

            {/* Filter Mode Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Active Biquad Filter</span>
                <span className="text-[10px] text-muted-foreground uppercase font-mono">
                  {filterMode}
                </span>
              </label>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => setFilterMode("notch50")}
                  className={cn(
                    "p-2.5 rounded-xl border text-left transition-all",
                    filterMode === "notch50"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                      : "border-border hover:bg-muted text-muted-foreground"
                  )}
                >
                  <div className="font-semibold text-xs">50 Hz Notch</div>
                  <div className="text-[10px] opacity-80 mt-0.5">Strips lighting flicker</div>
                </button>

                <button
                  onClick={() => setFilterMode("bandpass")}
                  className={cn(
                    "p-2.5 rounded-xl border text-left transition-all",
                    filterMode === "bandpass"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                      : "border-border hover:bg-muted text-muted-foreground"
                  )}
                >
                  <div className="font-semibold text-xs">Acoustic Band</div>
                  <div className="text-[10px] opacity-80 mt-0.5">300 Hz – 3.4 kHz Voice</div>
                </button>

                <button
                  onClick={() => setFilterMode("highpass")}
                  className={cn(
                    "p-2.5 rounded-xl border text-left transition-all",
                    filterMode === "highpass"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                      : "border-border hover:bg-muted text-muted-foreground"
                  )}
                >
                  <div className="font-semibold text-xs">High-Pass &gt;20Hz</div>
                  <div className="text-[10px] opacity-80 mt-0.5">Eliminates hand drift</div>
                </button>

                <button
                  onClick={() => setFilterMode("raw")}
                  className={cn(
                    "p-2.5 rounded-xl border text-left transition-all",
                    filterMode === "raw"
                      ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold shadow-xs"
                      : "border-border hover:bg-muted text-muted-foreground"
                  )}
                >
                  <div className="font-semibold text-xs">Raw Optical</div>
                  <div className="text-[10px] opacity-80 mt-0.5">Unfiltered Photodiode</div>
                </button>
              </div>
            </div>

            {/* Digital Software Gain Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-foreground">Digital Gain Boost</span>
                <span className="font-mono font-bold text-primary">{digitalGain.toFixed(1)}×</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="4.0"
                step="0.1"
                value={digitalGain}
                onChange={(e) => setDigitalGain(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>0.5× (Attenuate)</span>
                <span>1.0× (Unity)</span>
                <span>4.0× (Boost)</span>
              </div>
            </div>

            {/* Optical Engineering Note */}
            <div className="bg-muted/40 border border-border/80 rounded-xl p-3.5 text-xs text-muted-foreground space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Target Reflectivity Optimization Tip:
              </div>
              <p className="text-[11px] leading-relaxed">
                When targeting dark or diffuse surfaces, stick a piece of <strong className="text-foreground">3M micro-prismatic retroreflective tape</strong> on the vibrating spot to boost backscatter photocurrent by <strong className="text-foreground">+20 dB</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Logged Academic Telemetry History Table ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3 bg-muted/20">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm text-foreground font-display">
              My Verified Telemetry &amp; Lab Experiment Runs
            </h3>
          </div>
          <button
            onClick={loadHistory}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Runs
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Experiment Name</th>
                <th>Dominant Peak (Hz)</th>
                <th>Equivalent RPM</th>
                <th>RMS Amplitude</th>
                <th>Duration</th>
                <th>Filter Mode</th>
                <th>Student Observations</th>
              </tr>
            </thead>
            <tbody>
              {loadingHistory ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-muted-foreground text-xs">
                    Loading academic telemetry history…
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-muted-foreground text-xs">
                    No experiment sessions logged yet. Connect the instrument and click "Save to Lab Report"!
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id}>
                    <td className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                      {new Date(h.createdAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="font-semibold text-foreground">{h.experimentName}</td>
                    <td>
                      <span className="inline-flex items-center font-bold text-primary font-mono text-xs">
                        {h.peakFrequencyHz.toFixed(1)} Hz
                      </span>
                    </td>
                    <td className="font-mono text-xs text-amber-600 dark:text-amber-400 font-semibold">
                      {Math.round(h.peakFrequencyHz * 60).toLocaleString()} RPM
                    </td>
                    <td className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                      {h.averageRmsDb.toFixed(1)} dBFS
                    </td>
                    <td className="text-xs text-muted-foreground font-mono">
                      {h.durationSeconds}s
                    </td>
                    <td>
                      <span
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full",
                          h.isFiltered
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {h.isFiltered ? "DSP Filtered" : "Raw Optical"}
                      </span>
                    </td>
                    <td className="text-xs text-muted-foreground max-w-xs truncate">
                      {h.studentNotes || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Save Experiment Modal ── */}
      <AnimatePresence>
        {showSaveModal && (
          <div
            className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowSaveModal(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Save className="h-5 w-5 text-emerald-500" />
                  <h3 className="font-bold text-sm text-foreground font-display">
                    Save Telemetry to Academic Report
                  </h3>
                </div>
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveExperiment} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Experiment Title</label>
                  <input
                    type="text"
                    required
                    value={experimentName}
                    onChange={(e) => setExperimentName(e.target.value)}
                    placeholder="e.g. BLDC Motor Bearing Resonant Frequency Test"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Telemetry Snapshot Preview */}
                <div className="bg-muted/40 p-3 rounded-xl border border-border grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <div className="text-muted-foreground text-[10px]">Peak Frequency</div>
                    <div className="font-bold text-primary font-mono mt-0.5">{peakFrequency} Hz</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px]">RMS Amplitude</div>
                    <div className="font-bold text-emerald-500 font-mono mt-0.5">{averageRmsDb} dBFS</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px]">Duration</div>
                    <div className="font-bold text-foreground font-mono mt-0.5">{elapsedSeconds}s</div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Student Lab Notes &amp; Observations</label>
                  <textarea
                    rows={3}
                    value={studentNotes}
                    onChange={(e) => setStudentNotes(e.target.value)}
                    placeholder="Describe target material, laser distance, retroreflective tape used, harmonic observations…"
                    className="w-full rounded-xl border border-border bg-background p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSaveModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold border border-border hover:bg-muted transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-sm"
                  >
                    {isSaving ? "Saving to Database…" : "Log to Academic Profile"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Hardware & Circuit Architecture Modal ── */}
      <AnimatePresence>
        {showCircuitModal && (
          <div
            className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowCircuitModal(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-base text-foreground font-display">
                    Optical Laser Vibrometer: Hardware &amp; Circuit Architecture
                  </h3>
                </div>
                <button
                  onClick={() => setShowCircuitModal(false)}
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
                >
                  ✕
                </button>
              </div>

              {/* Parul University ECE Honors in IoT Overview */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-xs text-muted-foreground space-y-2">
                <div className="font-bold text-primary text-sm flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" />
                  Developed for Analog Circuit Design (ECE Honors in IoT, Parul University)
                </div>
                <p className="leading-relaxed text-[11px]">
                  This custom 2-layer battery-powered PCB utilizes non-contact optical micro-Doppler backscatter demodulation to measure microscopic acoustic and mechanical surface vibrations without mass-loading the target.
                </p>
              </div>

              {/* 3-Stage Signal Chain Flowchart */}
              <div className="space-y-3 text-xs">
                <h4 className="font-bold uppercase tracking-wider text-muted-foreground text-[11px]">
                  PCB Receiver Signal Chain
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase">Stage 1: TIA</span>
                    <h5 className="font-bold text-xs text-foreground">Vishay BPW34 + TL082 U1A</h5>
                    <p className="text-[10px] text-muted-foreground">
                      Converts microampere AC optical photocurrent into voltage with 470 kΩ || 22 pF feedback.
                    </p>
                  </div>

                  <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase">Stage 2: Bandpass</span>
                    <h5 className="font-bold text-xs text-foreground">TL082 U1B (1× – 100× RV1)</h5>
                    <p className="text-[10px] text-muted-foreground">
                      Active bandpass filter stripping DC sunlight, with 100 kΩ multiturn potentiometer gain tuning.
                    </p>
                  </div>

                  <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">Stage 3: Power Amp</span>
                    <h5 className="font-bold text-xs text-foreground">TI LM386N-1 (200× Boost)</h5>
                    <p className="text-[10px] text-muted-foreground">
                      Drives the PJ-306 3.5 mm stereo audio line-out with volume RV2 and Zobel stabilization network.
                    </p>
                  </div>
                </div>
              </div>

              {/* Key Engineering Innovations */}
              <div className="space-y-2 text-xs">
                <h4 className="font-bold uppercase tracking-wider text-muted-foreground text-[11px]">
                  Key Engineering Innovations in Hardware Design
                </h4>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-muted-foreground">
                  <li>
                    <strong className="text-foreground">Power Management &amp; Grounding Architecture:</strong> Fixed power short-circuit by isolating MOD1 9V boost rail from ground bus with SW1 galvanic switch and routing switched +9V along the outer perimeter to prevent photodiode noise coupling.
                  </li>
                  <li>
                    <strong className="text-foreground">Overcoming Diffuse Reflectivity:</strong> Utilizes 3M micro-prismatic retroreflective tape to reflect photons directly back along the incident angle, boosting SNR by +20 dB.
                  </li>
                  <li>
                    <strong className="text-foreground">Zero-Latency Web Audio Ingest:</strong> Connects directly to laptop soundcard at 44.1 kHz 16-bit without USB driver overhead or microcontroller quantization noise.
                  </li>
                </ul>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowCircuitModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                >
                  Close Reference
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
