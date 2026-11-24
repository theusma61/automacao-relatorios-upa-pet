import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

function getSpeechRecognitionCtor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export default function VoiceDictationButton({
  onTranscript,
  darkMode = true,
  compact = false,
  label = 'Ditar',
  lang = 'pt-BR',
  title = 'Ditar por voz (Web Speech API)'
}) {
  const [supported] = useState(() => Boolean(getSpeechRecognitionCtor()));
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const onTranscriptRef = useRef(onTranscript);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
        } catch (_) {}
        recognitionRef.current = null;
      }
    };
  }, []);

  if (!supported) return null;

  const toggleListening = () => {
    if (listening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      setListening(false);
      return;
    }

    const SpeechRecognition = getSpeechRecognitionCtor();
    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = lang;
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        let finalChunk = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          if (result && result.isFinal && result[0]?.transcript) {
            finalChunk += (finalChunk ? ' ' : '') + result[0].transcript.trim();
          }
        }
        if (finalChunk && typeof onTranscriptRef.current === 'function') {
          onTranscriptRef.current(finalChunk);
        }
      };

      recognition.onerror = () => {
        setListening(false);
      };

      recognition.onend = () => {
        setListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
    } catch (_) {
      setListening(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleListening}
      title={listening ? 'Parar ditado por voz' : title}
      className={`inline-flex items-center gap-1.5 rounded-lg border font-bold transition ${
        compact ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1 text-[11px]'
      } ${
        listening
          ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 animate-pulse'
          : darkMode
          ? 'bg-[#0A141D] text-[#00D296] border-slate-700 hover:border-[#00D296]'
          : 'bg-white text-[#0D5C56] border-slate-200 hover:border-[#0D5C56]'
      }`}
    >
      {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
      <span>{listening ? 'Ouvindo...' : label}</span>
    </button>
  );
}
