import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Bookmark,
  ShoppingCart,
  CornerDownLeft,
  X,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { usePubStore } from '../../services/store';
import { playVoiceListenChime } from '../../services/voiceAudio';

interface VoiceOrderMicrophoneProps {
  defaultTarget?: 'POS' | 'TAB';
  compact?: boolean;
  className?: string;
  onCommandExecuted?: (result: { success: boolean; message: string; target: 'POS' | 'TAB' }) => void;
}

export const VoiceOrderMicrophone: React.FC<VoiceOrderMicrophoneProps> = ({
  defaultTarget = 'TAB',
  compact = false,
  className = '',
  onCommandExecuted,
}) => {
  const {
    products,
    tabs,
    selectedTabId,
    setSelectedTabId,
    posCart,
    executeVoiceCommand,
  } = usePubStore();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 100
  const [targetMode, setTargetMode] = useState<'POS' | 'TAB'>(defaultTarget);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [audioFeedbackEnabled, setAudioFeedbackEnabled] = useState(true);
  const [manualInput, setManualInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const activeTabs = tabs.filter((t) => t.status === 'OPEN');
  const currentTab = activeTabs.find((t) => t.id === selectedTabId) || activeTabs[0];

  // Audio Stream & Web Speech Recognition Refs
  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Check speech recognition availability on mount
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  // Update targetMode if defaultTarget changes
  useEffect(() => {
    setTargetMode(defaultTarget);
  }, [defaultTarget]);

  // Real-time audio analyzer for mic volume meter
  const startAudioAnalyzer = async (stream: MediaStream) => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        // Compute average volume level
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setAudioLevel(normalized);

        animationFrameRef.current = requestAnimationFrame(tick);
      };

      tick();
    } catch (err) {
      console.warn('Microphone audio analyser error:', err);
    }
  };

  const stopAudioAnalyzer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  };

  // Start microphone and speech recognition
  const startListening = async () => {
    setFeedback(null);
    setTranscript('');
    setInterimTranscript('');

    try {
      playVoiceListenChime();

      // 1. Request real microphone access via getUserMedia
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaStreamRef.current = stream;
          startAudioAnalyzer(stream);
        } catch (micErr) {
          console.warn('getUserMedia mic permission error:', micErr);
        }
      }

      // 2. Initialize Web Speech Recognition
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          let interim = '';
          let final = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }

          if (interim) {
            setInterimTranscript(interim);
          }

          if (final) {
            setTranscript(final);
            setInterimTranscript('');
            handleProcessCommand(final);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setIsListening(false);
          stopAudioAnalyzer();
          if (event.error === 'not-allowed') {
            setFeedback({
              success: false,
              message: 'Microphone permission blocked in browser. Please enable mic access.',
            });
          } else if (event.error !== 'no-speech') {
            setFeedback({
              success: false,
              message: `Voice error: ${event.error}. You can also type or use test chips.`,
            });
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          stopAudioAnalyzer();
        };

        recognitionRef.current = recognition;
        recognition.start();
      } else {
        setIsListening(true);
        // If Web Speech is unsupported, prompt the user or allow manual typing
        setFeedback({
          success: false,
          message: 'Web Speech API is not supported in this browser. Use quick command chips or type below.',
        });
      }
    } catch (err: any) {
      console.error('Failed to start voice recognition:', err);
      setIsListening(false);
      stopAudioAnalyzer();
      setFeedback({
        success: false,
        message: 'Could not activate microphone. Check browser permissions.',
      });
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    stopAudioAnalyzer();
    setIsListening(false);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  // Process and execute spoken / typed command
  const handleProcessCommand = (commandText: string) => {
    if (!commandText || !commandText.trim()) return;

    const result = executeVoiceCommand(commandText.trim(), targetMode);
    setFeedback({
      success: result.success,
      message: result.message,
    });

    if (onCommandExecuted) {
      onCommandExecuted({
        success: result.success,
        message: result.message,
        target: result.target || targetMode,
      });
    }

    if (result.success) {
      // Auto-clear feedback after 6 seconds
      setTimeout(() => {
        setFeedback((prev) => (prev?.message === result.message ? null : prev));
      }, 6000);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    setTranscript(manualInput);
    handleProcessCommand(manualInput);
    setManualInput('');
  };

  // Quick preset voice commands
  const quickTestCommands = [
    { label: 'Add 2 lagers to tab', text: 'Add two lagers to tab' },
    { label: 'Add 2 lagers to POS', text: 'Add two lagers to pos' },
    { label: 'Add 3 Tusker to tab', text: 'Add 3 tusker lagers to tab' },
    { label: 'Add 2 Ciders to tab', text: 'Add two ciders to tab' },
    { label: 'Add 1 Guinness to cart', text: 'Add one guinness to cart' },
    { label: 'Add 4 White Cap to tab', text: 'Add four white cap to tab' },
  ];

  // Compact Header / Nav Bar Button
  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <button
          type="button"
          onClick={() => {
            if (isListening) {
              stopListening();
            } else {
              startListening();
              setIsExpanded(true);
            }
          }}
          className={`px-3 py-1.5 rounded-2xl flex items-center gap-2 text-xs font-bold transition-all cursor-pointer shadow-md ${
            isListening
              ? 'bg-rose-600 text-white animate-pulse shadow-rose-600/30'
              : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30'
          }`}
          title="Voice Mic: Say 'Add two lagers to tab'"
        >
          {isListening ? (
            <>
              <Mic className="w-3.5 h-3.5 animate-bounce text-white" />
              <span className="font-mono">Listening...</span>
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Voice Mic</span>
            </>
          )}
        </button>

        {/* Small floating status popup if active or feedback exists */}
        {(isListening || feedback || isExpanded) && (
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[#12141c] border border-white/10 rounded-2xl p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Voice Order Assistant
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopListening();
                  setIsExpanded(false);
                  setFeedback(null);
                }}
                className="text-white/40 hover:text-white p-1 rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Mic listening visualizer */}
            {isListening ? (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 mb-3 text-center space-y-2">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-xs font-bold text-rose-300 uppercase tracking-wider font-mono">
                    Speak Now: 'Add two lagers to tab'
                  </span>
                </div>
                {/* Audio wave bars */}
                <div className="flex items-center justify-center gap-1 h-6">
                  {[...Array(9)].map((_, i) => {
                    const heightPercent = Math.max(
                      20,
                      Math.min(100, audioLevel * (0.6 + 0.4 * Math.sin(i + Date.now() / 200)))
                    );
                    return (
                      <div
                        key={i}
                        style={{ height: `${heightPercent}%` }}
                        className="w-1.5 bg-rose-400 rounded-full transition-all duration-75"
                      />
                    );
                  })}
                </div>
                <div className="text-xs text-white/90 font-mono italic min-h-[1.5rem]">
                  {interimTranscript || transcript || 'Listening for drink order...'}
                </div>
                <button
                  type="button"
                  onClick={stopListening}
                  className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold uppercase cursor-pointer"
                >
                  Stop Mic
                </button>
              </div>
            ) : (
              <div className="mb-3">
                <button
                  type="button"
                  onClick={startListening}
                  className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow cursor-pointer"
                >
                  <Mic className="w-4 h-4" />
                  <span>Start Microphone</span>
                </button>
              </div>
            )}

            {/* Feedback message */}
            {feedback && (
              <div
                className={`p-2.5 rounded-xl border text-xs font-mono mb-3 flex items-start gap-2 ${
                  feedback.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                {feedback.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* Quick Test Chips */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-mono text-white/40 font-bold block">
                Quick Command Test:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {quickTestCommands.slice(0, 4).map((cmd, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setTranscript(cmd.text);
                      handleProcessCommand(cmd.text);
                    }}
                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-[10px] font-mono transition-colors text-left"
                  >
                    "{cmd.label}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full Inline Component (for POS and Tabs screens)
  return (
    <div
      className={`bg-[#12141c] border border-white/10 rounded-[2rem] p-4 sm:p-5 shadow-xl relative overflow-hidden ${className}`}
    >
      {/* Background glow when listening */}
      {isListening && (
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-rose-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      )}

      {/* Header Row: Title, Target Selector, and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
              isListening
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40 animate-pulse'
                : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
            }`}
          >
            <Mic className={`w-5 h-5 ${isListening ? 'animate-bounce' : ''}`} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <span>Microphone Voice Orders</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                  LIVE SPEECH API
                </span>
              </h3>
            </div>
            <p className="text-[11px] text-white/40 mt-0.5">
              Say e.g. <strong className="text-amber-300 font-mono">"Add two lagers to tab"</strong> or{' '}
              <strong className="text-indigo-300 font-mono">"Add two lagers to POS"</strong>.
            </p>
          </div>
        </div>

        {/* Target Switcher & Audio Toggle */}
        <div className="flex items-center gap-2">
          {/* Target Mode Toggle */}
          <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setTargetMode('TAB')}
              className={`py-1 px-2.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                targetMode === 'TAB'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>To Tab</span>
            </button>
            <button
              type="button"
              onClick={() => setTargetMode('POS')}
              className={`py-1 px-2.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                targetMode === 'POS'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>To POS Cart</span>
            </button>
          </div>

          {/* Audio voice response toggle */}
          <button
            type="button"
            onClick={() => setAudioFeedbackEnabled((prev) => !prev)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              audioFeedbackEnabled
                ? 'bg-white/5 border-white/10 text-white/80 hover:text-white'
                : 'bg-white/[0.02] border-white/5 text-white/20'
            }`}
            title={audioFeedbackEnabled ? 'Voice chime feedback enabled' : 'Muted'}
          >
            {audioFeedbackEnabled ? (
              <Volume2 className="w-3.5 h-3.5" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="pt-3 space-y-3">
        {/* Active Target Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono bg-black/20 px-3 py-1.5 rounded-xl border border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-white/40">Active Destination:</span>
            {targetMode === 'TAB' ? (
              currentTab ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Bookmark className="w-3 h-3" />
                  <span>Tab: {currentTab.customerName}</span>
                  <span className="text-white/40 text-[10px]">
                    (Bill: {currentTab.runningTotal} KSh)
                  </span>
                </span>
              ) : (
                <span className="text-amber-300 font-bold">
                  No tab open (Auto-creates tab upon command)
                </span>
              )
            ) : (
              <span className="text-indigo-400 font-bold flex items-center gap-1">
                <ShoppingCart className="w-3 h-3" />
                <span>POS Cart ({posCart.length} item types)</span>
              </span>
            )}
          </div>

          {/* Quick tab selector dropdown if multiple tabs open */}
          {targetMode === 'TAB' && activeTabs.length > 1 && (
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-white/40">Switch Tab:</span>
              <select
                value={selectedTabId || currentTab?.id || ''}
                onChange={(e) => setSelectedTabId(e.target.value)}
                className="bg-[#181a24] border border-white/10 rounded-lg px-2 py-0.5 text-white text-xs font-sans focus:outline-none"
              >
                {activeTabs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.customerName} (#{t.id.slice(-4)})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Microphone Control & Real-time Live Visualizer */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Mic Action Button */}
          <div className="md:col-span-4">
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`w-full py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-3 transition-all cursor-pointer shadow-xl active:scale-98 ${
                isListening
                  ? 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-rose-900/40 border border-rose-400/40 animate-pulse'
                  : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-indigo-900/40 border border-indigo-400/30'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4 text-white" />
                  <span>Stop Listening</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 text-white" />
                  <span>Tap Mic to Speak Order</span>
                </>
              )}
            </button>
          </div>

          {/* Real-time Frequency Waveform / Speech Status Display */}
          <div className="md:col-span-8 bg-[#181a24] border border-white/5 rounded-2xl p-3 flex items-center justify-between gap-3 min-h-[52px]">
            {isListening ? (
              <div className="flex-1 flex items-center gap-3">
                {/* Visualizer bars */}
                <div className="flex items-center gap-1 h-7 shrink-0">
                  {[...Array(12)].map((_, i) => {
                    const heightPercent = Math.max(
                      15,
                      Math.min(100, audioLevel * (0.5 + 0.5 * Math.sin(i * 0.7 + Date.now() / 150)))
                    );
                    return (
                      <div
                        key={i}
                        style={{ height: `${heightPercent}%` }}
                        className="w-1 bg-rose-400 rounded-full transition-all duration-75"
                      />
                    );
                  })}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase font-mono font-bold text-rose-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                    <span>Listening for voice command...</span>
                  </div>
                  <div className="text-xs text-white font-mono truncate">
                    {interimTranscript || transcript || 'Speak now: "Add two lagers to tab"'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-between gap-2">
                <div className="text-xs text-white/50 font-mono">
                  {transcript ? (
                    <span className="text-white font-bold">
                      Last command: <span className="text-amber-300">"{transcript}"</span>
                    </span>
                  ) : (
                    <span>Ready. Tap mic or click any quick command chip below.</span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-indigo-400/80 bg-indigo-500/10 px-2 py-0.5 rounded-full shrink-0">
                  Speech-to-Text Active
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Feedback Alert Banner */}
        {feedback && (
          <div
            className={`p-3 rounded-2xl border text-xs font-mono flex items-center justify-between gap-3 shadow-lg animate-in fade-in slide-in-from-top-2 ${
              feedback.success
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {feedback.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-white/40 hover:text-white p-1 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Quick Voice Command Chips + Text Input Row */}
        <div className="space-y-2 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] uppercase font-mono font-bold text-white/40">
              One-Tap Voice Command Presets:
            </span>

            {/* Manual Text Simulation Input (for silent/sandbox testing) */}
            <form onSubmit={handleManualSubmit} className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Type e.g. 'Add two lagers to tab'..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                className="bg-[#181a24] border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 w-48 sm:w-64"
              />
              <button
                type="submit"
                disabled={!manualInput.trim()}
                className="p-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white cursor-pointer transition-colors"
                title="Execute typed command"
              >
                <CornerDownLeft className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {quickTestCommands.map((cmd, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setTranscript(cmd.text);
                  handleProcessCommand(cmd.text);
                }}
                className="py-1.5 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] active:scale-95 text-white/80 hover:text-white border border-white/10 text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                <span>"{cmd.label}"</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
