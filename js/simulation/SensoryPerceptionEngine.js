/**
 * SensoryPerceptionEngine.js
 * Motor de Percepción Sensorial Profunda para QICN
 * 
 * Capacidades:
 * - Audio: FFT analysis, speech recognition, environment classification
 * - Video: Scene analysis, face detection, motion tracking
 * - Auto-activation on system start
 * 
 * SINGLETON PATTERN: Only ONE instance ever exists
 */

// ========== SINGLETON INSTANCE (MODULE LEVEL) ==========
let _singletonInstance = null;

class SensoryPerceptionEngine {
    // Static method to get the singleton instance
    static getInstance() {
        if (!_singletonInstance) {
            console.log('🔧 SensoryPerceptionEngine: Creando instancia singleton');
            _singletonInstance = new SensoryPerceptionEngine();
        }
        return _singletonInstance;
    }

    constructor() {
        // Prevent direct instantiation if singleton exists
        if (_singletonInstance) {
            console.warn('⚠️ SensoryPerceptionEngine ya existe - usa getInstance()');
            return _singletonInstance;
        }
        // ========== AUDIO COMPONENTS ==========
        this.audioContext = null;
        this.audioAnalyser = null;
        this.speechRecognition = null;
        this.audioStream = null;

        // ========== VIDEO COMPONENTS ==========
        this.videoElement = null;
        this.videoStream = null;
        this.canvasElement = null;
        this.canvasContext = null;
        this.faceDetector = null;
        this.previousFrame = null;

        // ========== PERCEPTION STATE ==========
        this.audioPerception = {
            volume: 0,
            dynamics: { min: 1, max: 0, variance: 0, history: [] },
            spectrum: {
                bass: 0,
                mid: 0,
                high: 0,
                centroid: 0,
                flatness: 0,
                raw: new Uint8Array(256),
                peak: 0
            },
            speech: {
                detected: false,
                transcript: '',
                interimTranscript: '',
                language: 'es-ES',
                confidence: 0,
                history: [],
                isListening: false,
                state: 'idle'
            },
            environment: {
                type: 'desconocido',
                noiseFloor: 0,
                description: 'Sin datos de audio'
            },
            enabled: false
        };

        this.videoPerception = {
            scene: {
                brightness: 0.5,
                contrast: 0.5,
                colorTemp: 'neutral',
                saturation: 0.5,
                dominantColor: { r: 128, g: 128, b: 128 }
            },
            structure: {
                edgeDensity: 0,
                complexity: 'desconocida',
                horizontalEdges: 0,
                verticalEdges: 0
            },
            faces: [],
            motion: {
                intensity: 0,
                type: 'estático',
                activeZones: ['ninguna'],
                history: []
            },
            humanPresence: {
                detected: false,
                count: 0,
                positions: [],
                identifiedPeople: [] // { name, confidence, descriptor }
            },
            description: 'Percepción visual no inicializada',
            enabled: false
        };

        // ========== FACE RECOGNITION (face-api.js) ==========
        this.faceApiReady = false;
        this.blazeFaceReady = false;  // BlazeFace detection ready
        this.useSsdDetector = false;  // Use SSD for more robust detection
        this.recognitionModelsReady = false;  // Face descriptor models ready
        this.faceApiModels = null;
        this.knownFaces = this.loadKnownFaces(); // Load from localStorage
        this.faceMatchThreshold = 0.5; // Lower = more strict matching (0.5 = good balance)

        // ========== STATUS FLAGS ==========
        this.isReady = false;
        this.isInitializing = false;
        this._isModelLoading = false;  // Prevent duplicate model loads
        this.permissionStatus = { audio: 'pending', video: 'pending' };
        this.lastAnalysisTime = { audio: 0, video: 0 };
        this.analysisIntervals = { audio: null, video: null };
        this.speechRetryCount = 0;
        this.maxSpeechRetries = 5;
        this.isSpeechStarting = false;
        this.speechState = 'idle'; // idle|starting|listening|stopping|offline_loading|offline_active|error
        this.speechRetryTimer = null;
        this.speechHealth = {
            speech_start_attempts: 0,
            speech_start_skipped: 0,
            speech_restart_collisions: 0,
            vosk_source_used: 'none'
        };

        // ========== VOSK OFFLINE SPEECH (Fallback) ==========
        this.voskReady = false;
        this.voskModel = null;
        this.voskRecognizer = null;
        this.voskLoading = false;
        this.usingVoskFallback = false;
        this.allowRemoteVoskModelFallback = false;
        this.voskModelCandidates = ['./assets/models/vosk-model-small-es-0.42.zip'];
        if (this.allowRemoteVoskModelFallback) {
            this.voskModelCandidates.push('https://alphacephei.com/vosk/models/vosk-model-small-es-0.42.zip');
        }
        this.voskModelUrl = this.voskModelCandidates[0];

        // ========== EXPERIENTIAL MEMORY SYSTEM ==========
        this.experientialMemory = {
            events: this.loadExperientialMemory(),  // Persistent events
            conversations: [],      // Active conversation buffer
            currentConversation: null,  // Conversation being built
            activityLog: [],        // Visual activity events
            lastSynthesis: null,    // Last context summary
            lastSynthesisTime: 0,
            settings: {
                maxEvents: 5000,           // Store up to 5000 events
                synthesisIntervalMs: 30000, // Synthesize every 30 seconds
                conversationGapMs: 5000,   // 5 sec of silence = end of conversation
                minConversationLength: 2,  // Min transcripts to form conversation
                detailedMode: true         // Detailed summaries
            }
        };
        this.synthesisInterval = null;
        this.lastSpeechTime = 0;
    }

    // ============================================================================
    // KNOWN FACES PERSISTENCE
    // ============================================================================
    loadKnownFaces() {
        try {
            const stored = localStorage.getItem('qicn_known_faces');
            if (stored) {
                const parsed = JSON.parse(stored);
                console.log(`👤 Cargados ${parsed.length} rostros conocidos de memoria`);
                return parsed;
            }
        } catch (e) {
            console.warn('⚠️ Error cargando rostros conocidos:', e);
        }
        return [];
    }

    saveKnownFaces() {
        try {
            localStorage.setItem('qicn_known_faces', JSON.stringify(this.knownFaces));
            console.log(`💾 Guardados ${this.knownFaces.length} rostros en memoria`);
        } catch (e) {
            console.warn('⚠️ Error guardando rostros:', e);
        }
    }

    addKnownFace(name, descriptor) {
        // Check if person already exists
        const existing = this.knownFaces.findIndex(f => f.name.toLowerCase() === name.toLowerCase());
        if (existing >= 0) {
            // Update descriptor
            this.knownFaces[existing].descriptor = Array.from(descriptor);
            this.knownFaces[existing].updatedAt = Date.now();
            console.log(`🔄 Actualizado rostro de: ${name}`);
        } else {
            // Add new person
            this.knownFaces.push({
                id: Date.now().toString(),
                name: name,
                descriptor: Array.from(descriptor),
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
            console.log(`✨ Nuevo rostro registrado: ${name}`);
        }
        this.saveKnownFaces();
    }

    removeKnownFace(nameOrId) {
        const idx = this.knownFaces.findIndex(f =>
            f.name.toLowerCase() === nameOrId.toLowerCase() || f.id === nameOrId
        );
        if (idx >= 0) {
            const removed = this.knownFaces.splice(idx, 1)[0];
            this.saveKnownFaces();
            console.log(`🗑️ Rostro eliminado: ${removed.name}`);
            return true;
        }
        return false;
    }

    getKnownFaces() {
        return this.knownFaces.map(f => ({
            id: f.id,
            name: f.name,
            createdAt: f.createdAt
        }));
    }

    // ============================================================================
    // EXPERIENTIAL MEMORY PERSISTENCE
    // ============================================================================
    loadExperientialMemory() {
        try {
            const stored = localStorage.getItem('qicn_experiential_memory');
            if (stored) {
                const parsed = JSON.parse(stored);
                console.log(`🧠 Cargados ${parsed.length} eventos de memoria experiencial`);
                return parsed;
            }
        } catch (e) {
            console.warn('⚠️ Error cargando memoria experiencial:', e);
        }
        return [];
    }

    saveExperientialMemory() {
        try {
            // Trim to max events
            const maxEvents = this.experientialMemory.settings.maxEvents;
            if (this.experientialMemory.events.length > maxEvents) {
                this.experientialMemory.events = this.experientialMemory.events.slice(-maxEvents);
            }
            localStorage.setItem('qicn_experiential_memory', JSON.stringify(this.experientialMemory.events));
        } catch (e) {
            console.warn('⚠️ Error guardando memoria experiencial:', e);
        }
    }

    // ============================================================================
    // CONVERSATION DETECTION
    // ============================================================================
    processNewSpeech(transcript, confidence) {
        const now = Date.now();
        const gap = now - this.lastSpeechTime;

        // Detect emotional tone from audio characteristics
        const emotionalTone = this.detectEmotionalTone();

        // Get current visual context and associate voice with faces
        const visualContext = this.videoPerception.description || 'Sin contexto visual';
        const allPresentPeople = this.videoPerception.humanPresence.identifiedPeople || [];
        const knownPeople = allPresentPeople.filter(p => p.isKnown).map(p => p.name);
        const unknownCount = allPresentPeople.filter(p => !p.isKnown).length;

        // Voice-Face Association: Determine most likely speaker
        let likelySpeaker = 'Desconocido';
        if (knownPeople.length === 1) {
            // Only one known person visible = they are speaking
            likelySpeaker = knownPeople[0];
            console.log(`🎤👤 Voz asociada con: ${likelySpeaker}`);
        } else if (knownPeople.length > 1) {
            // Multiple known people - for now, list all (could be enhanced with lip detection)
            likelySpeaker = knownPeople.join(' o ');
            console.log(`🎤👥 Múltiples personas visibles: ${likelySpeaker}`);
        } else if (unknownCount > 0) {
            likelySpeaker = `Persona no identificada (${unknownCount} rostro${unknownCount > 1 ? 's' : ''})`;
        }

        const speechEntry = {
            text: transcript,
            confidence: confidence,
            timestamp: now,
            emotionalTone: emotionalTone,
            presentPeople: knownPeople.length > 0 ? knownPeople : ['Desconocido'],
            likelySpeaker: likelySpeaker,
            facesVisible: allPresentPeople.length
        };

        // Check if this is a new conversation or continuation
        if (!this.experientialMemory.currentConversation || gap > this.experientialMemory.settings.conversationGapMs) {
            // End previous conversation if exists
            if (this.experientialMemory.currentConversation) {
                this.finalizeConversation();
            }
            // Start new conversation
            this.experientialMemory.currentConversation = {
                id: now.toString(),
                startTime: now,
                entries: [speechEntry],
                participants: new Set(knownPeople),
                speakers: new Set([likelySpeaker])
            };
            console.log('🗣️ Nueva conversación iniciada');
        } else {
            // Continue existing conversation
            this.experientialMemory.currentConversation.entries.push(speechEntry);
            knownPeople.forEach(p => this.experientialMemory.currentConversation.participants.add(p));
            this.experientialMemory.currentConversation.speakers.add(likelySpeaker);
        }

        this.lastSpeechTime = now;
    }

    finalizeConversation() {
        const conv = this.experientialMemory.currentConversation;
        if (!conv || conv.entries.length < this.experientialMemory.settings.minConversationLength) {
            this.experientialMemory.currentConversation = null;
            return;
        }

        // Build conversation summary
        const fullText = conv.entries.map(e => e.text).join(' ');
        const duration = (conv.entries[conv.entries.length - 1].timestamp - conv.startTime) / 1000;
        const avgConfidence = conv.entries.reduce((sum, e) => sum + e.confidence, 0) / conv.entries.length;
        const tones = conv.entries.map(e => e.emotionalTone);
        const dominantTone = this.getDominantTone(tones);
        const participants = Array.from(conv.participants);

        // Extract topics (simple keyword extraction)
        const topics = this.extractTopics(fullText);

        const event = {
            id: conv.id,
            type: 'conversation',
            timestamp: conv.startTime,
            endTime: Date.now(),
            data: {
                fullTranscript: fullText,
                entryCount: conv.entries.length,
                duration: Math.round(duration),
                participants: participants.length > 0 ? participants : ['Participantes no identificados'],
                topics: topics,
                emotionalTone: dominantTone,
                confidence: avgConfidence
            },
            summary: this.generateConversationSummary(fullText, participants, duration, dominantTone, topics),
            importance: this.calculateImportance(conv)
        };

        this.experientialMemory.events.push(event);
        this.experientialMemory.conversations.push(event);
        this.saveExperientialMemory();

        console.log(`💬 Conversación guardada: ${event.summary}`);
        this.experientialMemory.currentConversation = null;
    }

    detectEmotionalTone() {
        const volume = this.audioPerception.volume;
        const spectralCentroid = this.audioPerception.spectrum.centroid;
        const variance = this.audioPerception.dynamics.variance;

        // Simple heuristic for emotional tone
        if (volume > 0.7 && variance > 0.1) return 'entusiasta';
        if (volume > 0.5 && spectralCentroid > 0.6) return 'alegre';
        if (volume < 0.2) return 'tranquilo';
        if (spectralCentroid < 0.3 && volume > 0.4) return 'serio';
        if (variance > 0.15) return 'animado';
        return 'neutral';
    }

    getDominantTone(tones) {
        const counts = {};
        tones.forEach(t => counts[t] = (counts[t] || 0) + 1);
        return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
    }

    extractTopics(text) {
        // Simple topic extraction - could be enhanced with NLP
        const words = text.toLowerCase().split(/\s+/);
        const stopWords = new Set(['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'al', 'del', 'los', 'las', 'una', 'como', 'pero', 'más', 'o', 'si', 'ya', 'hay', 'está', 'mi', 'tu', 'me', 'qué', 'muy', 'sin', 'sobre', 'ser', 'tiene', 'también', 'nos', 'cuando', 'todo', 'esta', 'desde', 'hace']);
        const wordCounts = {};
        words.filter(w => w.length > 3 && !stopWords.has(w)).forEach(w => {
            wordCounts[w] = (wordCounts[w] || 0) + 1;
        });
        return Object.entries(wordCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word]) => word);
    }

    generateConversationSummary(text, participants, duration, tone, topics) {
        const participantStr = participants.length > 0 ? participants.join(', ') : 'personas';
        const topicStr = topics.length > 0 ? topics.slice(0, 3).join(', ') : 'temas variados';
        const durationStr = duration > 60 ? `${Math.round(duration / 60)} minutos` : `${Math.round(duration)} segundos`;
        return `Conversación con ${participantStr}. Temas: ${topicStr}. Duración: ${durationStr}. Tono: ${tone}.`;
    }

    calculateImportance(conv) {
        let score = 0;
        score += Math.min(conv.entries.length * 0.5, 3); // More entries = more important
        score += conv.participants.size > 1 ? 2 : 0; // Multiple people = important
        const hasKnownPerson = Array.from(conv.participants).some(p => p !== 'Desconocido');
        score += hasKnownPerson ? 3 : 0;
        return Math.min(Math.round(score), 10);
    }

    // ============================================================================
    // ACTIVITY DETECTION (Visual Events)
    // ============================================================================
    detectVisualActivity() {
        const motion = this.videoPerception.motion;
        const presence = this.videoPerception.humanPresence;
        const now = Date.now();

        // Detect significant activity changes
        if (motion.type === 'movimiento-fuerte' || motion.type === 'movimiento-moderado') {
            const lastActivity = this.experientialMemory.activityLog[this.experientialMemory.activityLog.length - 1];
            const timeSinceLast = lastActivity ? now - lastActivity.timestamp : Infinity;

            // Only log if enough time has passed since last activity
            if (timeSinceLast > 10000) { // 10 seconds
                const event = {
                    id: now.toString(),
                    type: 'activity',
                    timestamp: now,
                    data: {
                        motionType: motion.type,
                        motionIntensity: motion.intensity,
                        activeZones: motion.activeZones,
                        peopleCount: presence.count,
                        identifiedPeople: presence.identifiedPeople.filter(p => p.isKnown).map(p => p.name),
                        sceneDescription: this.videoPerception.description
                    },
                    summary: this.generateActivitySummary(motion, presence),
                    importance: presence.count > 0 ? 5 : 2
                };

                this.experientialMemory.events.push(event);
                this.experientialMemory.activityLog.push(event);
                this.saveExperientialMemory();
                console.log(`👁️ Actividad detectada: ${event.summary}`);
            }
        }

        // Detect presence changes
        this.detectPresenceChange(presence);
    }

    detectPresenceChange(presence) {
        const lastPresenceCount = this._lastPresenceCount || 0;
        const now = Date.now();

        if (presence.count !== lastPresenceCount) {
            const change = presence.count > lastPresenceCount ? 'llegada' : 'salida';
            const people = presence.identifiedPeople.filter(p => p.isKnown).map(p => p.name);

            const event = {
                id: now.toString(),
                type: 'presence',
                timestamp: now,
                data: {
                    change: change,
                    previousCount: lastPresenceCount,
                    currentCount: presence.count,
                    identifiedPeople: people
                },
                summary: `${change === 'llegada' ? 'Alguien llegó' : 'Alguien se fue'}. ${people.length > 0 ? `Personas: ${people.join(', ')}` : 'No identificado'}.`,
                importance: people.length > 0 ? 6 : 3
            };

            this.experientialMemory.events.push(event);
            this.saveExperientialMemory();
            console.log(`👤 Cambio de presencia: ${event.summary}`);
        }

        this._lastPresenceCount = presence.count;
    }

    generateActivitySummary(motion, presence) {
        const peopleStr = presence.identifiedPeople.filter(p => p.isKnown).map(p => p.name).join(', ');
        const zoneStr = motion.activeZones.filter(z => z !== 'ninguna').join(', ') || 'área general';
        return `Movimiento ${motion.type} detectado en ${zoneStr}. ${presence.count > 0 ? `Personas: ${peopleStr || presence.count}` : 'Sin personas visibles'}.`;
    }

    // ============================================================================
    // CONTEXT SYNTHESIS
    // ============================================================================
    synthesizeContext() {
        const now = Date.now();
        const recentEvents = this.getRecentEvents(5); // Last 5 minutes

        if (recentEvents.length === 0) {
            this.experientialMemory.lastSynthesis = {
                timestamp: now,
                summary: 'No hay eventos significativos recientes.',
                eventCount: 0,
                conversations: 0,
                activities: 0
            };
            return;
        }

        const conversations = recentEvents.filter(e => e.type === 'conversation');
        const activities = recentEvents.filter(e => e.type === 'activity');
        const presenceChanges = recentEvents.filter(e => e.type === 'presence');

        let summary = `En los últimos 5 minutos: `;
        const parts = [];

        if (conversations.length > 0) {
            const topics = conversations.flatMap(c => c.data.topics || []).slice(0, 5);
            parts.push(`${conversations.length} conversación(es) sobre ${topics.join(', ') || 'temas varios'}`);
        }

        if (activities.length > 0) {
            parts.push(`${activities.length} evento(s) de actividad`);
        }

        if (presenceChanges.length > 0) {
            parts.push(`${presenceChanges.length} cambio(s) de presencia`);
        }

        summary += parts.join('; ') + '.';

        // Add current state
        const currentPeople = this.videoPerception.humanPresence.identifiedPeople.filter(p => p.isKnown).map(p => p.name);
        if (currentPeople.length > 0) {
            summary += ` Actualmente veo a: ${currentPeople.join(', ')}.`;
        }

        this.experientialMemory.lastSynthesis = {
            timestamp: now,
            summary: summary,
            eventCount: recentEvents.length,
            conversations: conversations.length,
            activities: activities.length,
            recentTopics: conversations.flatMap(c => c.data.topics || []).slice(0, 10),
            currentPeople: currentPeople
        };

        this.experientialMemory.lastSynthesisTime = now;
        console.log(`🧠 Síntesis: ${summary}`);
    }

    getRecentEvents(minutes = 5) {
        const cutoff = Date.now() - (minutes * 60 * 1000);
        return this.experientialMemory.events.filter(e => e.timestamp > cutoff);
    }

    getExperienceForLLM() {
        // Finalize any ongoing conversation
        if (this.experientialMemory.currentConversation &&
            Date.now() - this.lastSpeechTime > this.experientialMemory.settings.conversationGapMs) {
            this.finalizeConversation();
        }

        // Synthesize if needed
        if (Date.now() - this.experientialMemory.lastSynthesisTime > 60000) {
            this.synthesizeContext();
        }

        const synthesis = this.experientialMemory.lastSynthesis;
        const recentEvents = this.getRecentEvents(10);

        let context = '';

        if (synthesis) {
            context += `[PERCEPCIÓN AMBIENTAL RECIENTE]\n${synthesis.summary}\n\n`;
        }

        // Add detailed recent conversations
        const recentConvs = recentEvents.filter(e => e.type === 'conversation').slice(-3);
        if (recentConvs.length > 0) {
            context += '[CONVERSACIONES RECIENTES]\n';
            recentConvs.forEach(conv => {
                const time = new Date(conv.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                context += `- ${time}: ${conv.summary}\n`;
                if (this.experientialMemory.settings.detailedMode) {
                    context += `  Transcripción: "${conv.data.fullTranscript.substring(0, 200)}..."\n`;
                }
            });
            context += '\n';
        }

        return context;
    }

    startExperienceSynthesis() {
        if (this.synthesisInterval) return;

        this.synthesisInterval = setInterval(() => {
            // Finalize stale conversations
            if (this.experientialMemory.currentConversation &&
                Date.now() - this.lastSpeechTime > this.experientialMemory.settings.conversationGapMs) {
                this.finalizeConversation();
            }

            // Synthesize context
            this.synthesizeContext();

            // Detect visual activity
            this.detectVisualActivity();

        }, this.experientialMemory.settings.synthesisIntervalMs);

        console.log('🧠 Síntesis de experiencia iniciada');
    }

    stopExperienceSynthesis() {
        if (this.synthesisInterval) {
            clearInterval(this.synthesisInterval);
            this.synthesisInterval = null;
        }
    }

    // ============================================================================
    // AUTO-ACTIVATION
    // ============================================================================
    async autoActivate() {
        if (this.isInitializing) {
            console.log('⏳ Percepción ya inicializándose...');
            return { audio: false, video: false };
        }

        this.isInitializing = true;
        console.log('🔮 QICN: Auto-activando percepción sensorial profunda...');

        let audioOk = false;
        let videoOk = false;

        try {
            // Initialize audio first
            audioOk = await this.initializeAudio();
            console.log(audioOk ? '🎤 Audio: ACTIVO' : '🎤 Audio: FALLIDO');
        } catch (e) {
            console.warn('⚠️ Error inicializando audio:', e.message);
        }

        try {
            // Initialize video
            videoOk = await this.initializeVideo();
            console.log(videoOk ? '📷 Video: ACTIVO' : '📷 Video: FALLIDO');
        } catch (e) {
            console.warn('⚠️ Error inicializando video:', e.message);
        }

        this.isReady = audioOk || videoOk;
        this.isInitializing = false;

        if (this.isReady) {
            console.log('✅ QICN: Percepción sensorial ACTIVA');
            // Start continuous experience synthesis
            this.startExperienceSynthesis();
        } else {
            console.warn('❌ QICN: Percepción sensorial NO DISPONIBLE (permisos denegados)');
        }

        return { audio: audioOk, video: videoOk };
    }

    // ============================================================================
    // AUDIO INITIALIZATION
    // ============================================================================
    async initializeAudio() {
        try {
            // Request microphone access
            this.audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100
                }
            });

            this.permissionStatus.audio = 'granted';

            // Create Audio Context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = this.audioContext.createMediaStreamSource(this.audioStream);

            // Create Analyser Node with higher resolution
            this.audioAnalyser = this.audioContext.createAnalyser();
            this.audioAnalyser.fftSize = 1024; // Increased for better spectrum resolution
            this.audioAnalyser.smoothingTimeConstant = 0.5; // Less smoothing for faster response
            this.audioAnalyser.minDecibels = -90; // More sensitive to quiet sounds
            this.audioAnalyser.maxDecibels = -10; // Better dynamic range
            source.connect(this.audioAnalyser);

            // Initialize Speech Recognition
            this.initializeSpeechRecognition();

            // Start analysis loop
            this.startAudioAnalysis();

            this.audioPerception.enabled = true;
            return true;

        } catch (e) {
            this.permissionStatus.audio = 'denied';
            console.warn('❌ Permiso de audio denegado:', e.message);
            return false;
        }
    }

    setSpeechState(nextState) {
        this.speechState = nextState;
        this.audioPerception.speech.state = nextState;
    }

    clearSpeechRetryTimer() {
        if (this.speechRetryTimer) {
            clearTimeout(this.speechRetryTimer);
            this.speechRetryTimer = null;
        }
    }

    scheduleSpeechRetry(delayMs, reason = 'retry') {
        this.clearSpeechRetryTimer();
        this.speechRetryTimer = setTimeout(() => {
            this.speechRetryTimer = null;
            this.retrySpeechRecognition(reason);
        }, delayMs);
    }

    initializeSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            // Browser doesn't support Web Speech API (Brave, Firefox, etc.)
            console.warn('⚠️ Web Speech API no soportada en este navegador');
            console.log('💡 Para reconocimiento de voz, usa Google Chrome');
            this.audioPerception.speech.error = 'browser-not-supported';
            this.audioPerception.speech.errorMessage = 'Reconocimiento de voz solo disponible en Chrome. Usa Chrome para esta función.';
            this.audioPerception.speech.isListening = false;
            this.setSpeechState('error');
            return;
        }

        try {
            this.speechRecognition = new SpeechRecognition();
            this.speechRecognition.continuous = true;
            this.speechRecognition.interimResults = true;
            this.speechRecognition.lang = 'es-ES';
            this.speechRecognition.maxAlternatives = 3;

            this.speechRecognition.onstart = () => {
                console.log('🎤 Speech Recognition: ESCUCHANDO');
                this.isSpeechStarting = false;
                this.audioPerception.speech.isListening = true;
                this.audioPerception.speech.error = null;
                this.speechRetryCount = 0;
                this.setSpeechState('listening');
            };

            this.speechRecognition.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const result = event.results[i];
                    if (result.isFinal) {
                        finalTranscript += result[0].transcript;
                        console.log('🗣️ Voz detectada:', result[0].transcript);

                        // Store in history
                        this.audioPerception.speech.history.push({
                            text: result[0].transcript.trim(),
                            timestamp: Date.now(),
                            confidence: result[0].confidence
                        });

                        // Keep last 30 transcripts
                        if (this.audioPerception.speech.history.length > 30) {
                            this.audioPerception.speech.history.shift();
                        }

                        this.audioPerception.speech.confidence = result[0].confidence;
                        this.audioPerception.speech.detected = true;

                        // Feed to experiential memory
                        this.processNewSpeech(result[0].transcript.trim(), result[0].confidence);
                    } else {
                        interimTranscript += result[0].transcript;
                    }
                }

                if (finalTranscript) {
                    this.audioPerception.speech.transcript = finalTranscript.trim();
                }
                this.audioPerception.speech.interimTranscript = interimTranscript;
            };

            this.speechRecognition.onerror = (event) => {
                console.warn('⚠️ Speech recognition error:', event.error);
                this.isSpeechStarting = false;
                this.audioPerception.speech.isListening = false;
                this.audioPerception.speech.error = event.error;
                this.setSpeechState('error');

                // Handle specific errors
                if (event.error === 'not-allowed') {
                    this.audioPerception.speech.isListening = false;
                    console.error('❌ Permiso de micrófono denegado para reconocimiento de voz');
                } else if (event.error === 'network') {
                    console.warn('🌐 Error de red en reconocimiento de voz');
                    // Retry with exponential backoff
                    if (this.speechRetryCount < this.maxSpeechRetries) {
                        const delay = Math.pow(2, this.speechRetryCount) * 1000; // 1s, 2s, 4s, 8s, 16s
                        this.speechRetryCount++;
                        console.log(`🔄 Reintentando reconocimiento de voz en ${delay / 1000}s... (intento ${this.speechRetryCount}/${this.maxSpeechRetries})`);
                        this.scheduleSpeechRetry(delay, 'network-error');
                    } else {
                        console.error('❌ Máximo de reintentos alcanzado - activando modo OFFLINE (Vosk)');
                        this.audioPerception.speech.error = 'network-switching-offline';
                        // Auto-switch to Vosk offline
                        this.switchToVoskFallback();
                    }
                } else if (event.error === 'aborted') {
                    // User or browser aborted, don't retry
                } else if (event.error === 'no-speech') {
                    // No speech detected, this is normal, reset retry count
                    this.speechRetryCount = 0;
                }
            };

            this.speechRecognition.onend = () => {
                console.log('🔇 Speech Recognition terminó');
                this.isSpeechStarting = false;
                this.audioPerception.speech.isListening = false;
                if (this.speechState !== 'offline_active' && this.speechState !== 'offline_loading') {
                    this.setSpeechState('idle');
                }

                // DON'T restart if we're switching to Vosk offline mode
                if (this.usingVoskFallback || this.voskLoading) {
                    console.log('📴 No reiniciando Web Speech - modo offline activo o cargando');
                    return;
                }

                // Auto-restart if still enabled and no critical error
                if (this.audioPerception.enabled && this.speechRecognition) {
                    const lastError = this.audioPerception.speech.error;
                    // Don't restart for these errors or when switching to offline
                    if (lastError !== 'not-allowed' &&
                        lastError !== 'aborted' &&
                        lastError !== 'network' &&
                        lastError !== 'network-switching-offline' &&
                        lastError !== 'loading-vosk') {
                        this.scheduleSpeechRetry(100, 'auto-restart-onend');
                    }
                }
            };

            this.speechRecognition.onnomatch = () => {
                console.log('❓ No se reconoció el audio');
            };

            // Start recognition
            if (this.safeStartSpeechRecognition('initial-setup')) {
                console.log('🗣️ Reconocimiento de voz INICIADO');
            }

        } catch (e) {
            console.error('❌ Error fatal iniciando reconocimiento de voz:', e);
            this.isSpeechStarting = false;
            this.audioPerception.speech.error = e.message;
            this.audioPerception.speech.isListening = false;
            this.setSpeechState('error');
        }
    }

    safeStartSpeechRecognition(reason = 'manual') {
        this.speechHealth.speech_start_attempts++;
        if (!this.speechRecognition) {
            this.speechHealth.speech_start_skipped++;
            return false;
        }
        if (this.usingVoskFallback || this.voskLoading || this.speechState === 'offline_active' || this.speechState === 'offline_loading') {
            this.speechHealth.speech_start_skipped++;
            return false;
        }
        if (this.audioPerception.speech.isListening || this.isSpeechStarting || this.speechState === 'starting' || this.speechState === 'listening') {
            this.speechHealth.speech_start_skipped++;
            return false;
        }

        this.isSpeechStarting = true;
        this.setSpeechState('starting');
        try {
            this.speechRecognition.start();
            return true;
        } catch (e) {
            this.isSpeechStarting = false;
            this.speechHealth.speech_start_skipped++;
            this.setSpeechState('error');
            const message = String(e?.message || '');
            if (message.includes('already started')) {
                this.speechHealth.speech_restart_collisions++;
                this.setSpeechState('listening');
                this.audioPerception.speech.isListening = true;
            }
            console.warn(`⚠️ No se pudo iniciar Speech Recognition (${reason}):`, e.message);
            return false;
        }
    }

    retrySpeechRecognition(reason = 'retry') {
        // DON'T restart Web Speech if we are intentionally using Vosk or loading it
        if (this.usingVoskFallback || this.voskLoading) {
            console.log('📴 Reintento de voz: Ignorando porque el modo offline (Vosk) está activo o cargando.');
            return;
        }

        if (!this.speechRecognition) {
            console.warn('⚠️ Speech recognition no inicializado');
            return;
        }

        if (this.speechState === 'starting') {
            this.speechHealth.speech_start_skipped++;
            return;
        }

        if (this.speechState === 'listening') {
            this.speechHealth.speech_start_skipped++;
            return;
        }

        // Check network first
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            console.warn('📴 Sin conexión a internet - no se puede reintentar Web Speech');
            this.audioPerception.speech.error = 'offline';
            this.setSpeechState('error');
            return;
        }

        this.clearSpeechRetryTimer();

        try {
            this.setSpeechState('stopping');
            this.speechRecognition.stop();
        } catch (e) {
            // May already be stopped
            this.setSpeechState('idle');
        }

        this.speechRetryTimer = setTimeout(() => {
            this.speechRetryTimer = null;
            try {
                // If we got here, we are trying to go back to Web Speech
                this.audioPerception.speech.error = null;
                this.setSpeechState('idle');
                if (this.safeStartSpeechRecognition(reason)) {
                    console.log('🔄 Reconocimiento de voz (Web Speech) reiniciado');
                }
            } catch (e) {
                console.warn('⚠️ No se pudo reiniciar Web Speech:', e.message);
                this.setSpeechState('error');
            }
        }, 500);
    }

    // Manual retry function for UI button
    manualRetrySpeech() {
        console.log('🔄 Reintento manual de reconocimiento de voz...');
        this.clearSpeechRetryTimer();

        // If we were using Vosk, stop it first to try Web Speech again
        if (this.usingVoskFallback) {
            console.log('🔄 Desactivando modo offline para intentar Web Speech...');
            this.usingVoskFallback = false;
            // No need to stop Vosk processing explicitly here as it's handled inonaudioprocess,
            // but we reset the error state and counter.
        }

        this.voskLoading = false; // Reset loading flag in case it was stuck
        this.isSpeechStarting = false;
        this.setSpeechState('idle');
        this.speechRetryCount = 0; // Reset counter
        this.audioPerception.speech.error = null;

        this.retrySpeechRecognition('manual-retry');
    }

    async loadVoskModelWithFallback() {
        const candidates = Array.isArray(this.voskModelCandidates) && this.voskModelCandidates.length > 0
            ? this.voskModelCandidates
            : [this.voskModelUrl];
        let lastError = null;

        for (const candidate of candidates) {
            this.voskModelUrl = candidate;
            console.log(`🔗 Intentando cargar modelo Vosk desde: ${candidate}`);

            try {
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Timeout: modelo tardó demasiado en cargar')), 45000);
                });

                const model = await Promise.race([
                    Vosk.createModel(candidate),
                    timeoutPromise
                ]);

                this.speechHealth.vosk_source_used = /^https?:\/\//i.test(candidate) ? 'remote' : 'local';
                console.log(`✅ Modelo Vosk cargado desde: ${candidate}`);
                return model;
            } catch (e) {
                lastError = e;
                console.warn(`⚠️ Falló carga Vosk (${candidate}):`, e?.message || e);
            }
        }

        throw new Error(`No se pudo cargar modelo Vosk desde ningún origen. Último error: ${lastError?.message || 'desconocido'}`);
    }

    // ============================================================================
    // VOSK OFFLINE SPEECH RECOGNITION (Fallback)
    // ============================================================================
    async initializeVoskFallback() {
        // Wait for Vosk to load (like face-api)
        let attempts = 0;
        const maxAttempts = 20;

        while (typeof Vosk === 'undefined' && attempts < maxAttempts) {
            console.log(`⏳ Esperando Vosk.js... (${attempts + 1}/${maxAttempts})`);
            await new Promise(r => setTimeout(r, 500));
            attempts++;
        }

        if (typeof Vosk === 'undefined') {
            console.warn('⚠️ Vosk.js no disponible - reconocimiento de voz deshabilitado');
            this.audioPerception.speech.error = 'vosk-unavailable';
            this.audioPerception.speech.errorMessage = 'Reconocimiento de voz no disponible en este navegador';
            this.voskLoading = false;
            this.setSpeechState('error');
            return false;
        }

        if (this.voskReady) {
            return true;
        }

        this.voskLoading = true;
        this.setSpeechState('offline_loading');
        this.audioPerception.speech.error = 'loading-vosk';
        this.audioPerception.speech.errorMessage = 'Cargando modelo de voz offline (~40MB)...';
        console.log('📥 Iniciando Vosk (modo offline)...');
        console.log('📦 Descargando modelo español (~40MB, solo la primera vez)...');

        try {
            // Load model with deterministic fallback chain (local -> direct)
            this.voskModel = await this.loadVoskModelWithFallback();

            // Create recognizer with sample rate (usually 16000 for Vosk)
            this.voskRecognizer = new this.voskModel.KaldiRecognizer(16000);

            // Set up event handlers
            this.voskRecognizer.on('result', (message) => {
                const result = message.result;
                if (result && result.text && result.text.trim()) {
                    console.log('🗣️ [VOSK] Voz detectada:', result.text);

                    this.audioPerception.speech.transcript = result.text.trim();
                    this.audioPerception.speech.detected = true;
                    this.audioPerception.speech.confidence = 0.8; // Vosk doesn't provide confidence

                    // Feed to experiential memory
                    this.processNewSpeech(result.text.trim(), 0.8);

                    // Store in history
                    this.audioPerception.speech.history.push({
                        text: result.text.trim(),
                        timestamp: Date.now(),
                        confidence: 0.8,
                        source: 'vosk-offline'
                    });

                    if (this.audioPerception.speech.history.length > 30) {
                        this.audioPerception.speech.history.shift();
                    }
                }
            });

            this.voskRecognizer.on('partialresult', (message) => {
                if (message.result && message.result.partial) {
                    this.audioPerception.speech.interimTranscript = message.result.partial;
                }
            });

            this.voskReady = true;
            this.voskLoading = false;
            this.usingVoskFallback = true;
            this.audioPerception.speech.error = null;
            this.audioPerception.speech.errorMessage = null;
            this.audioPerception.speech.isListening = true;
            this.setSpeechState('offline_active');
            console.log('🎤 Vosk OFFLINE reconocimiento de voz ACTIVO');

            // Start processing audio for Vosk
            this.startVoskAudioProcessing();

            return true;
        } catch (e) {
            console.error('❌ Error inicializando Vosk:', e);
            this.voskLoading = false;
            this.audioPerception.speech.error = 'vosk-load-failed';
            this.audioPerception.speech.errorMessage = `Error: ${e.message}. Habla en Chrome para mejor compatibilidad.`;
            this.setSpeechState('error');
            return false;
        }
    }

    async startVoskAudioProcessing() {
        if (!this.voskRecognizer || !this.audioStream) {
            console.warn('⚠️ Vosk o audio stream no disponible');
            return;
        }

        try {
            // Create AudioContext for Vosk (needs 16kHz sample rate)
            const voskContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 16000
            });

            const source = voskContext.createMediaStreamSource(this.audioStream);
            const processor = voskContext.createScriptProcessor(4096, 1, 1);

            processor.onaudioprocess = (e) => {
                if (this.voskRecognizer && this.usingVoskFallback) {
                    const inputData = e.inputBuffer.getChannelData(0);
                    // Convert float32 to int16 for Vosk
                    const int16Data = new Int16Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) {
                        int16Data[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
                    }
                    this.voskRecognizer.acceptWaveform(int16Data);
                }
            };

            source.connect(processor);
            processor.connect(voskContext.destination);

            console.log('🎤 Procesamiento de audio Vosk iniciado');
        } catch (e) {
            console.error('❌ Error iniciando procesamiento Vosk:', e);
        }
    }

    // Switch to Vosk fallback
    async switchToVoskFallback() {
        console.log('🔄 Cambiando a reconocimiento de voz OFFLINE (Vosk)...');

        // Critical: Set loading flag to prevent any other logic from interfering
        this.clearSpeechRetryTimer();
        this.voskLoading = true;
        this.isSpeechStarting = false;
        this.setSpeechState('offline_loading');
        this.audioPerception.speech.error = 'network-switching-offline';

        // Stop Web Speech completely and remove ALL listeners
        if (this.speechRecognition) {
            try {
                // Remove handlers immediately to prevent any event firing during abort
                this.speechRecognition.onend = null;
                this.speechRecognition.onerror = null;
                this.speechRecognition.onnomatch = null;
                this.speechRecognition.onresult = null;
                this.speechRecognition.onstart = null;

                this.speechRecognition.abort();
                console.log('🛑 Web Speech detenido y handlers eliminados para evitar reinicios');
            } catch (e) {
                console.warn('⚠️ Error deteniendo Web Speech:', e.message);
            }
        }

        const success = await this.initializeVoskFallback();
        if (success) {
            this.audioPerception.speech.error = null;
            return true;
        }

        // If Vosk failed, show error but DO NOT restart Web Speech automatically
        this.voskLoading = false;
        this.isSpeechStarting = false;
        this.audioPerception.speech.error = 'vosk-load-failed';
        this.audioPerception.speech.isListening = false;
        this.setSpeechState('error');
        console.error('❌ Fallo modo offline. Esperando acción manual.');
        return false;
    }

    startAudioAnalysis() {
        const analyzeLoop = () => {
            try {
                if (!this.audioPerception.enabled) return;

                this.analyzeAudioDeep();
                this.lastAnalysisTime.audio = Date.now();
            } catch (e) {
                // Throttled logging to prevent main thread saturation
                if (!this._lastAudioErrorLog || Date.now() - this._lastAudioErrorLog > 10000) {
                    console.error('🚨 [SΣ_AUDIO_LOOP_FAIL]:', e.message);
                    this._lastAudioErrorLog = Date.now();
                }
            }
        };

        // Analyze every 100ms
        this.analysisIntervals.audio = setInterval(analyzeLoop, 100);
        analyzeLoop(); // Run immediately
    }

    analyzeAudioDeep() {
        if (!this.audioAnalyser) return;

        const bufferLength = this.audioAnalyser.frequencyBinCount;
        const frequencyData = new Uint8Array(bufferLength);
        const timeData = new Uint8Array(bufferLength);

        this.audioAnalyser.getByteFrequencyData(frequencyData);
        this.audioAnalyser.getByteTimeDomainData(timeData);

        // Store raw spectrum for visualization
        this.audioPerception.spectrum.raw = frequencyData;

        // === VOLUME (RMS) with amplification ===
        let sumSquares = 0;
        let peak = 0;
        for (let i = 0; i < timeData.length; i++) {
            const normalized = (timeData[i] - 128) / 128;
            sumSquares += normalized * normalized;
            peak = Math.max(peak, Math.abs(normalized));
        }
        const rms = Math.sqrt(sumSquares / timeData.length);
        // Amplify for better sensitivity (10x) and clamp to [0, 1]
        this.audioPerception.volume = Math.min(rms * 10, 1);
        this.audioPerception.spectrum.peak = peak;

        // Track dynamics
        this.audioPerception.dynamics.history.push(rms);
        if (this.audioPerception.dynamics.history.length > 50) {
            this.audioPerception.dynamics.history.shift();
        }
        const history = this.audioPerception.dynamics.history;
        this.audioPerception.dynamics.min = Math.min(...history);
        this.audioPerception.dynamics.max = Math.max(...history);
        const mean = history.reduce((a, b) => a + b, 0) / history.length;
        this.audioPerception.dynamics.variance = history.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / history.length;

        // === FREQUENCY BANDS ===
        const third = Math.floor(bufferLength / 3);
        let bass = 0, mid = 0, high = 0;
        for (let i = 0; i < bufferLength; i++) {
            if (i < third) bass += frequencyData[i];
            else if (i < third * 2) mid += frequencyData[i];
            else high += frequencyData[i];
        }
        this.audioPerception.spectrum.bass = bass / (third * 255);
        this.audioPerception.spectrum.mid = mid / (third * 255);
        this.audioPerception.spectrum.high = high / (third * 255);

        // === SPECTRAL CENTROID (Sound Brightness) ===
        let weightedSum = 0, totalEnergy = 0;
        for (let i = 0; i < bufferLength; i++) {
            weightedSum += i * frequencyData[i];
            totalEnergy += frequencyData[i];
        }
        const nyquist = this.audioContext.sampleRate / 2;
        this.audioPerception.spectrum.centroid = totalEnergy > 0
            ? (weightedSum / totalEnergy) * (nyquist / bufferLength)
            : 0;

        // === SPECTRAL FLATNESS (Noise vs Tonal) ===
        const epsilon = 1e-10;
        let geometricMean = 0;
        let arithmeticMean = 0;
        for (let i = 0; i < bufferLength; i++) {
            const val = frequencyData[i] + epsilon;
            geometricMean += Math.log(val);
            arithmeticMean += val;
        }
        geometricMean = Math.exp(geometricMean / bufferLength);
        arithmeticMean = arithmeticMean / bufferLength;
        this.audioPerception.spectrum.flatness = geometricMean / (arithmeticMean + epsilon);

        // === VOICE CHARACTERISTICS (F0, Formants, Human Voice Detection) ===
        this.analyzeVoiceCharacteristics(frequencyData, timeData, bufferLength, nyquist);

        // === ENVIRONMENT CLASSIFICATION ===
        this.classifyAudioEnvironment();
    }

    // PHASE 2: Voice fingerprinting and human voice detection
    analyzeVoiceCharacteristics(frequencyData, timeData, bufferLength, nyquist) {
        // Initialize voice perception object if needed
        if (!this.audioPerception.voice) {
            this.audioPerception.voice = {
                isHumanVoice: false,
                isSpeaking: false,
                pitch: 0,           // Fundamental frequency (F0) in Hz
                pitchCategory: 'unknown', // bajo, medio, alto
                formants: { f1: 0, f2: 0, f3: 0 },
                voiceEnergy: 0,     // Energy in voice range
                clarity: 0,         // How clear/distinct the voice is
                emotion: 'neutral', // Estimated emotion
                speechRate: 'normal' // slow, normal, fast
            };
        }

        const voice = this.audioPerception.voice;
        const sampleRate = this.audioContext?.sampleRate || 44100;
        const binHz = nyquist / bufferLength;

        // === F0 PITCH DETECTION (Human voice range: 85-255 Hz) ===
        // Find the dominant frequency in the human voice fundamental range
        const voiceStartBin = Math.floor(85 / binHz);
        const voiceEndBin = Math.floor(255 / binHz);

        let maxVoiceEnergy = 0;
        let dominantBin = 0;

        for (let i = voiceStartBin; i <= voiceEndBin && i < bufferLength; i++) {
            if (frequencyData[i] > maxVoiceEnergy) {
                maxVoiceEnergy = frequencyData[i];
                dominantBin = i;
            }
        }

        voice.pitch = dominantBin * binHz;

        // Categorize pitch
        if (voice.pitch < 120) voice.pitchCategory = 'grave';
        else if (voice.pitch < 180) voice.pitchCategory = 'medio';
        else voice.pitchCategory = 'agudo';

        // === FORMANT DETECTION (F1: 300-900Hz, F2: 900-2500Hz, F3: 2500-3500Hz) ===
        const findPeak = (startHz, endHz) => {
            const startBin = Math.floor(startHz / binHz);
            const endBin = Math.floor(endHz / binHz);
            let max = 0, peakBin = startBin;
            for (let i = startBin; i <= endBin && i < bufferLength; i++) {
                if (frequencyData[i] > max) {
                    max = frequencyData[i];
                    peakBin = i;
                }
            }
            return peakBin * binHz;
        };

        voice.formants.f1 = findPeak(300, 900);
        voice.formants.f2 = findPeak(900, 2500);
        voice.formants.f3 = findPeak(2500, 3500);

        // === VOICE ENERGY (300-3400 Hz speech bandwidth) ===
        const speechStartBin = Math.floor(300 / binHz);
        const speechEndBin = Math.floor(3400 / binHz);
        let speechEnergy = 0, totalEnergy = 0;

        for (let i = 0; i < bufferLength; i++) {
            totalEnergy += frequencyData[i];
            if (i >= speechStartBin && i <= speechEndBin) {
                speechEnergy += frequencyData[i];
            }
        }

        voice.voiceEnergy = totalEnergy > 0 ? speechEnergy / totalEnergy : 0;

        // === HUMAN VOICE DETECTION ===
        // Human voice has: high energy in 300-3400Hz, clear formants, F0 in 85-255Hz
        const hasVoiceF0 = voice.pitch >= 85 && voice.pitch <= 255 && maxVoiceEnergy > 50;
        const hasVoiceEnergy = voice.voiceEnergy > 0.3;
        const hasFormants = voice.formants.f1 > 300 && voice.formants.f2 > 900;

        voice.isHumanVoice = hasVoiceF0 && hasVoiceEnergy && hasFormants;
        voice.isSpeaking = voice.isHumanVoice && this.audioPerception.volume > 0.08;

        // === VOICE CLARITY (Based on spectral peaks vs noise) ===
        const peakToAvg = maxVoiceEnergy / (totalEnergy / bufferLength + 1);
        voice.clarity = Math.min(peakToAvg / 10, 1);

        // === EMOTION ESTIMATION (Based on pitch variation and energy) ===
        const pitchVariation = this.audioPerception.dynamics.variance || 0;
        const energyLevel = this.audioPerception.volume;

        if (energyLevel > 0.5 && pitchVariation > 0.1) {
            voice.emotion = 'excitado';
        } else if (energyLevel > 0.3 && voice.pitchCategory === 'agudo') {
            voice.emotion = 'alegre';
        } else if (energyLevel < 0.1 && voice.pitchCategory === 'grave') {
            voice.emotion = 'tranquilo';
        } else if (voice.pitchCategory === 'grave' && pitchVariation < 0.05) {
            voice.emotion = 'serio';
        } else {
            voice.emotion = 'neutral';
        }
    }

    classifyAudioEnvironment() {
        const { volume, spectrum, speech, voice } = this.audioPerception;

        let type = 'ambiente-general';
        let description = '';
        let intensity = 'bajo';
        let tags = [];

        // Determine intensity based on amplified volume
        if (volume > 0.7) intensity = 'muy-alto';
        else if (volume > 0.4) intensity = 'alto';
        else if (volume > 0.15) intensity = 'moderado';
        else if (volume > 0.05) intensity = 'bajo';
        else intensity = 'muy-bajo';

        // === SILENCE ===
        if (volume < 0.03) {
            type = 'silencio';
            description = 'Ambiente silencioso';
            tags.push('silencio', 'calma');
        }
        // === HUMAN VOICE DETECTION (Primary - using voice analysis) ===
        else if (voice?.isSpeaking || (speech.detected && Date.now() - (speech.history[speech.history.length - 1]?.timestamp || 0) < 5000)) {
            type = 'voz-humana';

            // Classify voice type based on pitch
            if (voice?.pitchCategory === 'grave') {
                tags.push('voz-humana', 'voz-masculina');
                description = `Voz masculina detectada (tono: ${voice.pitch?.toFixed(0) || '?'}Hz, ${voice.emotion || 'neutral'})`;
            } else if (voice?.pitchCategory === 'agudo') {
                tags.push('voz-humana', 'voz-femenina');
                description = `Voz femenina detectada (tono: ${voice.pitch?.toFixed(0) || '?'}Hz, ${voice.emotion || 'neutral'})`;
            } else {
                tags.push('voz-humana');
                description = `Voz humana detectada (tono ${voice?.pitchCategory || 'medio'}, ${voice?.emotion || 'neutral'})`;
            }

            // Check for multiple voices (high variance in formants)
            if (voice?.clarity < 0.3 && volume > 0.3) {
                tags.push('múltiples-voces');
                type = 'conversación';
                description = 'Múltiples voces en conversación';
            }
        }
        // === MUSIC DETECTION ===
        else if (spectrum.bass > 0.15 && (spectrum.mid > 0.1 || spectrum.high > 0.05)) {
            type = 'música';
            tags.push('música');

            if (spectrum.bass > 0.4) {
                tags.push('bass-intenso', 'electrónica');
                description = `Música electrónica/bass (${(spectrum.bass * 100).toFixed(0)}% graves)`;
            } else if (spectrum.high > 0.2) {
                tags.push('música-aguda', 'melodía');
                description = 'Música melódica con agudos claros';
            } else {
                description = 'Música o contenido rítmico detectado';
            }
        }
        // === RHYTHM/PERCUSSION ===
        else if (spectrum.bass > 0.2 && spectrum.flatness < 0.3) {
            type = 'percusión';
            tags.push('percusión', 'ritmo');
            description = 'Sonidos rítmicos o percusión';
        }
        // === APPLIANCES/MACHINES (Continuous steady noise) ===
        else if (spectrum.flatness > 0.5 && volume > 0.05 && volume < 0.3) {
            type = 'electrodoméstico';
            tags.push('electrodoméstico', 'ruido-constante');

            if (spectrum.bass > spectrum.high) {
                description = 'Electrodoméstico (ventilador, aire acondicionado)';
                tags.push('ventilador');
            } else {
                description = 'Ruido de máquina o electrodoméstico';
            }
        }
        // === HIGH PITCHED ALERTS ===
        else if (spectrum.high > 0.4 && spectrum.bass < 0.1) {
            type = 'alerta';
            tags.push('alerta', 'tono-agudo');
            description = 'Sonido de alerta o notificación';
        }
        // === URBAN SOUNDS ===
        else if (spectrum.flatness > 0.4 && volume > 0.2) {
            type = 'urbano';
            tags.push('urbano', 'exterior');
            description = 'Ruido urbano (tráfico, calle)';
        }
        // === NATURE SOUNDS ===
        else if (spectrum.high > 0.15 && spectrum.flatness > 0.3 && volume < 0.2) {
            type = 'naturaleza';
            tags.push('naturaleza', 'ambiente');
            description = 'Sonidos naturales (viento, agua, aves)';
        }
        // === TYPING/CLICKS ===
        else if (spectrum.high > 0.2 && volume > 0.1 && volume < 0.3) {
            type = 'typing';
            tags.push('typing', 'clicks');
            description = 'Sonidos de teclado o clicks';
        }
        // === GENERAL ACTIVITY ===
        else if (volume > 0.1) {
            type = 'actividad';
            tags.push('actividad');
            description = `Actividad sonora ${intensity}`;
        }
        // === SUBTLE SOUNDS ===
        else if (volume > 0.03) {
            type = 'sonidos-sutiles';
            tags.push('sutil', 'ambiente');
            description = 'Sonidos ambientales sutiles';
        }
        // === CALM ===
        else {
            type = 'calma';
            tags.push('calma', 'tranquilo');
            description = 'Ambiente tranquilo';
        }

        // Store all classification data
        this.audioPerception.environment.type = type;
        this.audioPerception.environment.description = description;
        this.audioPerception.environment.intensity = intensity;
        this.audioPerception.environment.tags = tags;
        this.audioPerception.environment.noiseFloor = this.audioPerception.dynamics.min;

        // Add voice summary if speaking
        if (voice?.isSpeaking) {
            this.audioPerception.environment.voiceSummary =
                `${voice.pitchCategory} (${voice.pitch?.toFixed(0)}Hz) | ${voice.emotion}`;
        } else {
            this.audioPerception.environment.voiceSummary = null;
        }
    }

    // ============================================================================
    // VIDEO INITIALIZATION
    // ============================================================================
    async initializeVideo() {
        try {
            console.log('📷 Solicitando acceso a cámara...');

            // Request camera access
            this.videoStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user',
                    frameRate: { ideal: 15 }
                }
            });

            console.log('✅ Cámara accedida correctamente');
            this.permissionStatus.video = 'granted';

            // Create video element
            this.videoElement = document.createElement('video');
            this.videoElement.srcObject = this.videoStream;
            this.videoElement.setAttribute('playsinline', '');
            this.videoElement.setAttribute('muted', '');
            this.videoElement.setAttribute('autoplay', '');

            // Wait for video to be ready
            await new Promise((resolve, reject) => {
                this.videoElement.onloadedmetadata = () => {
                    console.log('✅ Video metadata cargada');
                    resolve();
                };
                this.videoElement.onerror = (e) => {
                    console.error('❌ Error en video element:', e);
                    reject(e);
                };
                // Timeout safety
                setTimeout(() => {
                    console.warn('⚠️ Timeout esperando metadata, continuando...');
                    resolve();
                }, 3000);
            });

            await this.videoElement.play();
            console.log('✅ Video reproduciendo');

            // Create canvas for analysis (lower resolution for performance)
            this.canvasElement = document.createElement('canvas');
            this.canvasElement.width = 320;
            this.canvasElement.height = 240;
            this.canvasContext = this.canvasElement.getContext('2d', { willReadFrequently: true });

            // Mark video as enabled BEFORE face detection
            this.videoPerception.enabled = true;

            // Start analysis loop IMMEDIATELY (don't wait for face detection)
            this.startVideoAnalysis();
            console.log('✅ Análisis de video iniciado');

            // Initialize face detection IN BACKGROUND (non-blocking)
            this.initializeFaceDetection().then(() => {
                console.log('✅ Detección facial lista');
            }).catch(e => {
                console.warn('⚠️ Detección facial no disponible:', e.message);
            });

            return true;

        } catch (e) {
            this.permissionStatus.video = 'denied';
            console.error('❌ Error inicializando video:', e.message);
            console.error('Detalles:', e);
            return false;
        }
    }

    async initializeFaceDetection() {
        if (this.faceApiReady) {
            console.log('? face-api.js: Ya está listo');
            return;
        }
        if (this._isModelLoading) {
            console.log('? Modelos en proceso de carga...');
            return;
        }

        this._isModelLoading = true;
        console.log('?? Inicializando detección facial...');

        let attempts = 0;
        const maxAttempts = 20;

        while (typeof faceapi === 'undefined' && attempts < maxAttempts) {
            console.log('? Esperando face-api.js... (' + (attempts + 1) + '/' + maxAttempts + ')');
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }

        if (typeof faceapi === 'undefined') {
            console.log('?? face-api.js no disponible — usando detección por heurísticas');
            this._isModelLoading = false;
            return;
        }

        try {
            console.log('?? Cargando modelos de face-api.js...');
            const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/model/';

            await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
            console.log('? SsdMobilenetv1: Cargado');

            await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
            console.log('? TinyFaceDetector: Cargado');

            this.faceApiReady = true;
            this.useSsdDetector = true;
            this._isModelLoading = false;
            console.log('? face-api.js: Detección facial ACTIVA');

            this.loadRecognitionModels(MODEL_URL).catch(e => {
                console.log('?? Modelos de reconocimiento no disponibles:', e.message);
            });
        } catch (e) {
            console.warn('?? Error cargando face-api.js:', e.message);
            this._isModelLoading = false;
        }
    }

    async loadRecognitionModels(modelUrl) {
        if (typeof faceapi === 'undefined') {
            console.warn('?? faceapi no disponible para modelos de reconocimiento');
            return;
        }
        try {
            await Promise.all([
                faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
                faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl)
            ]);
            this.recognitionModelsReady = true;
            console.log('✅ Modelos de reconocimiento facial cargados');
            console.log('   📐 faceLandmark68Net: Listo');
            console.log('   🔍 faceRecognitionNet: Listo (128-dim descriptors)');
        } catch (e) {
            console.warn('⚠️ Error cargando modelos de reconocimiento:', e.message);
            this.recognitionModelsReady = false;
        }
    }

    startVideoAnalysis() {
        const analyzeLoop = async () => {
            try {
                if (!this.videoPerception.enabled) return;

                await this.analyzeVideoDeep();
                this.lastAnalysisTime.video = Date.now();
            } catch (e) {
                // Throttled logging to preserve system performance
                if (!this._lastVideoErrorLog || Date.now() - this._lastVideoErrorLog > 10000) {
                    console.error('🚨 [SΣ_VIDEO_LOOP_FAIL]:', e.message);
                    this._lastVideoErrorLog = Date.now();
                }
            }
        };

        // Analyze every 200ms (5 FPS analysis)
        this.analysisIntervals.video = setInterval(analyzeLoop, 200);
        analyzeLoop(); // Run immediately
    }

    async analyzeVideoDeep() {
        if (!this.videoElement || !this.canvasContext) return;

        // Draw current frame to canvas
        this.canvasContext.drawImage(this.videoElement, 0, 0, 320, 240);
        const imageData = this.canvasContext.getImageData(0, 0, 320, 240);
        const pixels = imageData.data;
        const numPixels = pixels.length / 4;

        // === SCENE ANALYSIS ===
        this.analyzeScene(pixels, numPixels);

        // === EDGE DETECTION ===
        this.analyzeEdges(pixels);

        // === MOTION DETECTION ===
        this.analyzeMotion(pixels);

        // === FACE DETECTION ===
        await this.analyzeFaces();

        // === GENERATE DESCRIPTION ===
        this.generateSceneDescription();

        // Store current frame for motion comparison
        this.previousFrame = new Uint8Array(pixels);
    }

    analyzeScene(pixels, numPixels) {
        let totalR = 0, totalG = 0, totalB = 0;
        let totalBrightness = 0;
        let brightnessValues = [];

        // Sample every 4th pixel for performance
        for (let i = 0; i < pixels.length; i += 16) {
            const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
            totalR += r; totalG += g; totalB += b;

            const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            totalBrightness += brightness;
            brightnessValues.push(brightness);
        }

        const sampleCount = pixels.length / 16;
        const avgBrightness = totalBrightness / sampleCount;
        const avgR = totalR / sampleCount;
        const avgG = totalG / sampleCount;
        const avgB = totalB / sampleCount;

        // Brightness
        this.videoPerception.scene.brightness = avgBrightness;

        // Contrast (standard deviation of brightness)
        const meanBrightness = brightnessValues.reduce((a, b) => a + b, 0) / brightnessValues.length;
        const variance = brightnessValues.reduce((sum, b) => sum + Math.pow(b - meanBrightness, 2), 0) / brightnessValues.length;
        this.videoPerception.scene.contrast = Math.sqrt(variance);

        // Color temperature
        if (avgR > avgB + 30) {
            this.videoPerception.scene.colorTemp = 'cálido';
        } else if (avgB > avgR + 30) {
            this.videoPerception.scene.colorTemp = 'frío';
        } else {
            this.videoPerception.scene.colorTemp = 'neutral';
        }

        // Dominant color
        this.videoPerception.scene.dominantColor = {
            r: Math.round(avgR),
            g: Math.round(avgG),
            b: Math.round(avgB)
        };

        // Saturation (simplified)
        const maxC = Math.max(avgR, avgG, avgB);
        const minC = Math.min(avgR, avgG, avgB);
        this.videoPerception.scene.saturation = maxC > 0 ? (maxC - minC) / maxC : 0;
    }

    analyzeEdges(pixels) {
        let edgeSum = 0;
        let horizontalEdges = 0;
        let verticalEdges = 0;

        // Simple Sobel-like edge detection (sample every other row/col)
        for (let y = 2; y < 238; y += 2) {
            for (let x = 2; x < 318; x += 2) {
                const idx = (y * 320 + x) * 4;

                // Get luminance of neighboring pixels
                const center = pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114;
                const left = pixels[idx - 4] * 0.299 + pixels[idx - 3] * 0.587 + pixels[idx - 2] * 0.114;
                const right = pixels[idx + 4] * 0.299 + pixels[idx + 5] * 0.587 + pixels[idx + 6] * 0.114;
                const top = pixels[idx - 320 * 4] * 0.299 + pixels[idx - 320 * 4 + 1] * 0.587 + pixels[idx - 320 * 4 + 2] * 0.114;
                const bottom = pixels[idx + 320 * 4] * 0.299 + pixels[idx + 320 * 4 + 1] * 0.587 + pixels[idx + 320 * 4 + 2] * 0.114;

                const gx = Math.abs(right - left);
                const gy = Math.abs(bottom - top);

                horizontalEdges += gy;
                verticalEdges += gx;
                edgeSum += Math.sqrt(gx * gx + gy * gy);
            }
        }

        const sampleCount = 118 * 158;
        this.videoPerception.structure.edgeDensity = edgeSum / (sampleCount * 255);
        this.videoPerception.structure.horizontalEdges = horizontalEdges / (sampleCount * 255);
        this.videoPerception.structure.verticalEdges = verticalEdges / (sampleCount * 255);

        // Complexity classification
        const density = this.videoPerception.structure.edgeDensity;
        if (density > 0.25) {
            this.videoPerception.structure.complexity = 'alta';
        } else if (density > 0.12) {
            this.videoPerception.structure.complexity = 'media';
        } else {
            this.videoPerception.structure.complexity = 'baja';
        }
    }

    analyzeMotion(pixels) {
        // On first frame, set to static and store current frame for next comparison
        if (!this.previousFrame) {
            this.videoPerception.motion.type = 'estático';
            this.videoPerception.motion.intensity = 0;
            this.videoPerception.motion.activeZones = ['ninguna'];
            // Store current frame so next call can compare
            this.previousFrame = new Uint8Array(pixels);
            console.log('📹 Primera frame capturada para detección de movimiento');
            return;
        }

        let motionSum = 0;
        const zones = { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, center: 0 };

        // Sample every 4th pixel for performance
        for (let y = 0; y < 240; y += 2) {
            for (let x = 0; x < 320; x += 2) {
                const idx = (y * 320 + x) * 4;
                const diff = Math.abs(pixels[idx] - this.previousFrame[idx]) +
                    Math.abs(pixels[idx + 1] - this.previousFrame[idx + 1]) +
                    Math.abs(pixels[idx + 2] - this.previousFrame[idx + 2]);

                const normalizedDiff = diff / (3 * 255);
                motionSum += normalizedDiff;

                // Zone detection
                if (normalizedDiff > 0.1) {
                    if (x < 106 && y < 80) zones.topLeft += normalizedDiff;
                    else if (x >= 213 && y < 80) zones.topRight += normalizedDiff;
                    else if (x < 106 && y >= 160) zones.bottomLeft += normalizedDiff;
                    else if (x >= 213 && y >= 160) zones.bottomRight += normalizedDiff;
                    else zones.center += normalizedDiff;
                }
            }
        }

        const sampleCount = 120 * 160;
        const intensity = motionSum / sampleCount;
        this.videoPerception.motion.intensity = intensity;

        // Motion type classification
        if (intensity > 0.15) {
            this.videoPerception.motion.type = 'movimiento-fuerte';
        } else if (intensity > 0.05) {
            this.videoPerception.motion.type = 'movimiento-moderado';
        } else if (intensity > 0.01) {
            this.videoPerception.motion.type = 'movimiento-sutil';
        } else {
            this.videoPerception.motion.type = 'estático';
        }

        // Active zones
        const activeZones = [];
        Object.entries(zones).forEach(([zone, value]) => {
            if (value > 0.5) activeZones.push(zone);
        });
        this.videoPerception.motion.activeZones = activeZones.length > 0 ? activeZones : ['ninguna'];

        // Track motion history
        this.videoPerception.motion.history.push(intensity);
        if (this.videoPerception.motion.history.length > 30) {
            this.videoPerception.motion.history.shift();
        }
    }

    async analyzeFaces() {
        if (!this.videoElement) return;

        // PRIMARY: Use face-api.js TinyFaceDetector (most reliable)
        if (this.faceApiReady && typeof faceapi !== 'undefined') {
            try {
                // Create enhanced image for better detection in low light
                const enhancedCanvas = this.createEnhancedImage();
                const inputElement = enhancedCanvas || this.videoElement;

                // FIX: Handle both canvas (width/height) and video (videoWidth/videoHeight)
                const inputWidth = inputElement.width || inputElement.videoWidth || 640;
                const inputHeight = inputElement.height || inputElement.videoHeight || 480;

                // SEGURIDAD: Verificar que el elemento de entrada sea válido y no esté vacío
                if (!inputElement || (inputElement instanceof HTMLCanvasElement && inputElement.width === 0)) {
                    return;
                }

                // Scope Declaration FIX: Using 'let' to block global-scope leaking and maintain thread integrity
                let detections = [];

                // Try SSD detector first (most robust for varied lighting)
                if (this.useSsdDetector && faceapi.nets.ssdMobilenetv1.isLoaded) {
                    detections = await faceapi.detectAllFaces(
                        inputElement,
                        new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 })
                    );
                }

                // Fallback to TinyFaceDetector if SSD found nothing
                if (detections.length === 0 && faceapi.nets.tinyFaceDetector.isLoaded) {
                    detections = await faceapi.detectAllFaces(
                        inputElement,
                        new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.1 })
                    );
                }

                if (detections.length > 0) {
                    const now = Date.now();
                    const identifiedPeople = [];

                    this.videoPerception.faces = detections.map((detection, i) => {
                        const box = detection.box;
                        const identity = { name: 'Persona ' + (i + 1), confidence: detection.score, isKnown: false };
                        identifiedPeople.push(identity);

                        return {
                            id: i,
                            x: box.x / inputWidth,
                            y: box.y / inputHeight,
                            width: box.width / inputWidth,
                            height: box.height / inputHeight,
                            probability: detection.score,
                            identity: identity,
                            box: {
                                topLeft: [box.x, box.y],
                                bottomRight: [box.x + box.width, box.y + box.height]
                            }
                        };
                    });

                    this.videoPerception.humanPresence.detected = true;
                    this.videoPerception.humanPresence.count = detections.length;
                    this.videoPerception.humanPresence.identifiedPeople = identifiedPeople;
                    this.videoPerception.humanPresence.positions = detections.map(d => ({
                        centerX: (d.box.x + d.box.width / 2) / inputWidth,
                        centerY: (d.box.y + d.box.height / 2) / inputHeight
                    }));

                    // Auto-register new faces
                    this.autoRegisterFaces(detections);

                    // Throttled logging
                    if (!this._lastFaceLog || now - this._lastFaceLog > 3000) {
                        console.log(`👁️ Rostros detectados: ${detections.length}`);
                        this._lastFaceLog = now;
                    }
                } else {
                    this.videoPerception.faces = [];
                    this.videoPerception.humanPresence.detected = false;
                    this.videoPerception.humanPresence.count = 0;
                    this.videoPerception.humanPresence.identifiedPeople = [];
                }
                return;
            } catch (e) {
                // Log detailed error for debugging
                if (!this._lastErrorLog || Date.now() - this._lastErrorLog > 5000) {
                    console.warn('⚠️ Error en face-api.js:', e.message);
                    this._lastErrorLog = Date.now();
                }
            }
        }

        // FALLBACK: BlazeFace if available
        if (this.blazeFaceReady && this.faceDetector) {
            try {
                const predictions = await this.faceDetector.estimateFaces(this.videoElement, false);

                this.videoPerception.humanPresence.detected = predictions.length > 0;
                this.videoPerception.humanPresence.count = predictions.length;
                this.videoPerception.faces = predictions.map((pred, i) => ({
                    id: i,
                    x: pred.topLeft[0] / this.videoElement.videoWidth,
                    y: pred.topLeft[1] / this.videoElement.videoHeight,
                    width: (pred.bottomRight[0] - pred.topLeft[0]) / this.videoElement.videoWidth,
                    height: (pred.bottomRight[1] - pred.topLeft[1]) / this.videoElement.videoHeight,
                    probability: pred.probability[0],
                    identity: { name: 'Persona ' + (i + 1), confidence: 0, isKnown: false },
                    box: {
                        topLeft: pred.topLeft,
                        bottomRight: pred.bottomRight
                    }
                }));
                return;
            } catch (e) {
                console.warn('⚠️ Error en BlazeFace:', e.message);
            }
        }

        // FINAL FALLBACK: Heuristic-based detection
        this.detectHumanPresenceHeuristic();
    }

    // Create brightness/contrast enhanced image for better face detection in low light
    createEnhancedImage() {
        if (!this.videoElement || !this.canvasElement) return null;

        try {
            const brightness = this.videoPerception.scene.brightness || 0.5;

            // ENHANCED: Apply enhancement at brightness < 70% (was 50%)
            if (brightness >= 0.7) {
                return null; // Use original video, no enhancement needed
            }

            // Create enhancement canvas if needed
            if (!this._enhancedCanvas) {
                this._enhancedCanvas = document.createElement('canvas');
                this._enhancedCanvas.width = this.videoElement.videoWidth || 640;
                this._enhancedCanvas.height = this.videoElement.videoHeight || 480;
                this._enhancedCtx = this._enhancedCanvas.getContext('2d');
            }

            const ctx = this._enhancedCtx;
            const w = this._enhancedCanvas.width;
            const h = this._enhancedCanvas.height;

            // Draw original frame
            ctx.drawImage(this.videoElement, 0, 0, w, h);

            // Get image data for manipulation
            const imageData = ctx.getImageData(0, 0, w, h);
            const data = imageData.data;

            // Calculate enhancement factors based on how dark it is
            // BOOSTED: Lower brightness = more enhancement needed
            const brightnessBoost = 1 + (0.7 - brightness) * 1.7; // Up to 120% brighter
            const contrastBoost = 1 + (0.7 - brightness) * 0.85;  // Up to 60% more contrast

            // Apply brightness and contrast enhancement
            for (let i = 0; i < data.length; i += 4) {
                // Brightness increase
                let r = data[i] * brightnessBoost;
                let g = data[i + 1] * brightnessBoost;
                let b = data[i + 2] * brightnessBoost;

                // Contrast increase (move values away from 128)
                r = ((r - 128) * contrastBoost) + 128;
                g = ((g - 128) * contrastBoost) + 128;
                b = ((b - 128) * contrastBoost) + 128;

                // Clamp to valid range
                data[i] = Math.max(0, Math.min(255, r));
                data[i + 1] = Math.max(0, Math.min(255, g));
                data[i + 2] = Math.max(0, Math.min(255, b));
            }

            // Put enhanced image back
            ctx.putImageData(imageData, 0, 0);

            // Log enhancement (throttled)
            const now = Date.now();
            if (!this._lastEnhanceLog || now - this._lastEnhanceLog > 5000) {
                console.log(`🔆 Imagen mejorada: brillo +${((brightnessBoost - 1) * 100).toFixed(0)}%, contraste +${((contrastBoost - 1) * 100).toFixed(0)}%`);
                this._lastEnhanceLog = now;
            }

            return this._enhancedCanvas;
        } catch (e) {
            return null; // Fall back to original video
        }
    }

    // AUTO-REGISTER: Automatically detect, track, and save faces with voice association
    autoRegisterFaces(detections) {
        if (!detections || detections.length === 0) return;

        const now = Date.now();

        // Initialize tracking if needed
        if (!this._faceTracking) {
            this._faceTracking = new Map();
        }

        // Get current voice state
        const isSpeaking = this.audioPerception.speech.detected ||
            this.audioPerception.volume > 0.15;
        const voiceData = isSpeaking ? {
            transcript: this.audioPerception.speech.transcript || '',
            volume: this.audioPerception.volume,
            spectrum: {
                centroid: this.audioPerception.spectrum?.centroid || 0,
                bass: this.audioPerception.spectrum?.bass || 0,
                mid: this.audioPerception.spectrum?.mid || 0,
                high: this.audioPerception.spectrum?.high || 0
            }
        } : null;

        detections.forEach((detection, i) => {
            const box = detection.box;
            const centerX = box.x + box.width / 2;
            const centerY = box.y + box.height / 2;

            // Create face signature based on position
            const faceKey = `face_${Math.round(centerX / 50)}_${Math.round(centerY / 50)}`;

            // Check if this is a known face
            const knownFace = this.findMatchingKnownFace(box);

            if (knownFace) {
                // Update known face with current position and voice
                this.videoPerception.faces[i].identity = {
                    name: knownFace.name,
                    confidence: detection.score,
                    isKnown: true
                };

                // Associate voice if speaking
                if (voiceData && detections.length === 1) {
                    this.updateFaceVoice(knownFace.id, voiceData);
                }
            } else {
                // Track new face for consistency
                let tracking = this._faceTracking.get(faceKey);

                if (!tracking) {
                    tracking = {
                        firstSeen: now,
                        frameCount: 0,
                        registered: false,
                        box: box
                    };
                    this._faceTracking.set(faceKey, tracking);
                }

                tracking.frameCount++;
                tracking.lastSeen = now;
                tracking.box = box;

                // Auto-register after 30 consistent frames (~1 second at 30fps)
                if (tracking.frameCount >= 30 && !tracking.registered) {
                    this.autoSaveNewFace(box, voiceData, i);
                    tracking.registered = true;
                    console.log(`👤 Nueva persona detectada - Persona ${this.knownFaces.length}`);
                }
            }
        });

        // Clean up old tracking entries
        this._faceTracking.forEach((value, key) => {
            if (now - value.lastSeen > 5000) {
                this._faceTracking.delete(key);
            }
        });
    }

    // Find matching known face using descriptor distance (true recognition)
    findMatchingKnownFace(box, descriptor = null) {
        if (!this.knownFaces || this.knownFaces.length === 0) return null;

        // PRIMARY: Use face descriptor matching if available
        if (descriptor && descriptor.length === 128) {
            let bestMatch = null;
            let bestDistance = Infinity;

            for (const face of this.knownFaces) {
                if (face.descriptor && face.descriptor.length === 128) {
                    // Calculate Euclidean distance between descriptors
                    const distance = faceapi.euclideanDistance(descriptor, face.descriptor);

                    if (distance < bestDistance && distance < this.faceMatchThreshold) {
                        bestDistance = distance;
                        bestMatch = face;
                    }
                }
            }

            if (bestMatch) {
                bestMatch.matchConfidence = 1 - bestDistance; // Higher = better
                return bestMatch;
            }
        }

        // FALLBACK: Use position matching
        const boxCenterX = box.x + box.width / 2;
        const boxCenterY = box.y + box.height / 2;

        for (const face of this.knownFaces) {
            if (face.facePosition) {
                const knownCenterX = (face.facePosition.x + face.facePosition.width / 2) * (this.videoElement?.videoWidth || 640);
                const knownCenterY = (face.facePosition.y + face.facePosition.height / 2) * (this.videoElement?.videoHeight || 480);

                const distance = Math.sqrt(
                    Math.pow(boxCenterX - knownCenterX, 2) +
                    Math.pow(boxCenterY - knownCenterY, 2)
                );

                // Match if within 100 pixels
                if (distance < 100) {
                    face.matchConfidence = 0.5; // Lower confidence for position match
                    return face;
                }
            }
        }
        return null;
    }

    // Auto-save a new face to known faces with descriptor extraction
    async autoSaveNewFace(box, voiceData, index) {
        try {
            const videoWidth = this.videoElement?.videoWidth || 640;
            const videoHeight = this.videoElement?.videoHeight || 480;

            // Create thumbnail (larger for better descriptor extraction)
            const faceCanvas = document.createElement('canvas');
            faceCanvas.width = 128;  // Larger for better quality
            faceCanvas.height = 128;
            const ctx = faceCanvas.getContext('2d');

            ctx.drawImage(
                this.videoElement,
                box.x, box.y, box.width, box.height,
                0, 0, 128, 128
            );

            const thumbnail = faceCanvas.toDataURL('image/jpeg', 0.8);

            // Extract face descriptor if recognition models are ready
            let descriptor = null;
            if (this.recognitionModelsReady && typeof faceapi !== 'undefined') {
                try {
                    const detection = await faceapi
                        .detectSingleFace(faceCanvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
                        .withFaceLandmarks()
                        .withFaceDescriptor();

                    if (detection && detection.descriptor) {
                        descriptor = Array.from(detection.descriptor); // Convert Float32Array to Array
                        console.log('   📐 Descriptor extraído (128-dim)');
                    }
                } catch (e) {
                    console.warn('⚠️ No se pudo extraer descriptor:', e.message);
                }
            }

            const faceRecord = {
                id: Date.now().toString(),
                name: `Persona ${this.knownFaces.length + 1}`,
                thumbnail: thumbnail,
                descriptor: descriptor,  // 128-dimension face embedding
                voiceSignature: voiceData,
                facePosition: {
                    x: box.x / videoWidth,
                    y: box.y / videoHeight,
                    width: box.width / videoWidth,
                    height: box.height / videoHeight
                },
                registeredAt: new Date().toISOString(),
                isAutoRegistered: true,
                hasDescriptor: descriptor !== null
            };

            this.knownFaces.push(faceRecord);
            this.saveKnownFaces();

            return faceRecord;
        } catch (e) {
            console.warn('⚠️ Error auto-guardando rostro:', e.message);
            return null;
        }
    }

    // Update voice signature for a known face
    updateFaceVoice(faceId, voiceData) {
        const face = this.knownFaces.find(f => f.id === faceId);
        if (face) {
            face.voiceSignature = voiceData;
            face.lastVoiceUpdate = new Date().toISOString();
            this.saveKnownFaces();
        }
    }
    // Capture face thumbnail for storage
    captureCurrentFace(faceBox) {
        if (!this.videoElement || !this.canvasContext) return null;

        try {
            const { topLeft, bottomRight } = faceBox;
            const width = bottomRight[0] - topLeft[0];
            const height = bottomRight[1] - topLeft[1];

            // Create small canvas for face thumbnail
            const faceCanvas = document.createElement('canvas');
            faceCanvas.width = 64;
            faceCanvas.height = 64;
            const ctx = faceCanvas.getContext('2d');

            ctx.drawImage(
                this.videoElement,
                topLeft[0], topLeft[1], width, height,
                0, 0, 64, 64
            );

            return faceCanvas.toDataURL('image/jpeg', 0.7);
        } catch (e) {
            return null;
        }
    }

    // Register face with voice association
    async registerFaceWithVoice(name) {
        if (!this.videoElement) {
            return { success: false, error: 'Cámara no disponible' };
        }

        // Get current face detection
        const faces = this.videoPerception.faces;
        if (!faces || faces.length === 0) {
            return { success: false, error: 'No se detecta ningún rostro' };
        }

        const face = faces[0]; // Register first visible face
        const thumbnail = this.captureCurrentFace(face.box);

        // Get current voice fingerprint if speaking
        const voiceData = {
            lastTranscript: this.audioPerception.speech.transcript,
            volume: this.audioPerception.volume,
            spectrum: this.audioPerception.spectrum ? {
                centroid: this.audioPerception.spectrum.centroid,
                brightness: this.audioPerception.spectrum.brightness
            } : null
        };

        const faceRecord = {
            id: Date.now().toString(),
            name: name.trim(),
            thumbnail: thumbnail,
            voiceSignature: voiceData,
            facePosition: {
                x: face.x,
                y: face.y,
                width: face.width,
                height: face.height
            },
            createdAt: Date.now()
        };

        // Save to known faces
        this.knownFaces.push(faceRecord);
        this.saveKnownFaces();

        console.log(`✨ Registrado: ${name} (con ${thumbnail ? 'foto' : 'sin foto'})`);
        return { success: true, name: name.trim(), hasThumbnail: !!thumbnail };
    }

    // Backward compatible wrapper for face registration
    async registerCurrentFace(name) {
        return await this.registerFaceWithVoice(name);
    }

    detectHumanPresenceHeuristic() {
        if (!this.canvasContext) return;

        try {
            const imageData = this.canvasContext.getImageData(0, 0, 320, 240);
            const pixels = imageData.data;
            let skinPixels = 0;

            for (let i = 0; i < pixels.length; i += 16) {
                const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
                if (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15 && r - g > 15) {
                    skinPixels++;
                }
            }

            const skinRatio = skinPixels / (pixels.length / 16);
            this.videoPerception.humanPresence.detected = skinRatio > 0.1;
            this.videoPerception.humanPresence.count = skinRatio > 0.1 ? 1 : 0;
        } catch (e) {
            // Silent fail
        }
    }

    generateSceneDescription() {
        const v = this.videoPerception;
        const a = this.audioPerception;
        const parts = [];
        const details = [];
        const changes = []; // Track what changed since last frame

        // Store previous state for change detection
        const prevState = this._previousSceneState || {};
        const currentState = {};

        // === LIGHTING ANALYSIS ===
        currentState.brightness = v.scene.brightness;
        const brightnessChange = Math.abs((prevState.brightness || 0.5) - v.scene.brightness);

        if (v.scene.brightness > 0.75) {
            parts.push('ambiente muy brillante');
            if (brightnessChange > 0.1) changes.push('💡 iluminación aumentó');
        } else if (v.scene.brightness > 0.55) {
            parts.push('buena iluminación');
        } else if (v.scene.brightness > 0.35) {
            parts.push('iluminación moderada');
        } else if (v.scene.brightness > 0.15) {
            parts.push('ambiente con poca luz');
            if (brightnessChange > 0.1) changes.push('🌙 iluminación disminuyó');
        } else {
            parts.push('ambiente oscuro');
        }

        // === HUMAN PRESENCE - DYNAMIC ===
        currentState.peopleCount = v.humanPresence.count;
        const peopleChanged = prevState.peopleCount !== undefined && prevState.peopleCount !== v.humanPresence.count;

        if (v.humanPresence.count === 1) {
            const identifiedPeople = v.humanPresence.identifiedPeople?.filter(p => p.isKnown) || [];
            if (identifiedPeople.length > 0) {
                parts.push(`${identifiedPeople.map(p => p.name).join(', ')} visible`);
            } else {
                parts.push('una persona visible');
            }
            if (peopleChanged && prevState.peopleCount === 0) {
                changes.push('👤 persona apareció');
            }
        } else if (v.humanPresence.count > 1) {
            parts.push(`${v.humanPresence.count} personas detectadas`);
            if (peopleChanged) {
                changes.push(`👥 ${v.humanPresence.count > prevState.peopleCount ? 'más personas' : 'menos personas'}`);
            }
        } else {
            parts.push('sin personas visibles');
            if (peopleChanged && prevState.peopleCount > 0) {
                changes.push('👤 persona salió');
            }
        }

        // === MOTION ANALYSIS - REAL-TIME ===
        currentState.motionType = v.motion.type;
        const motionChanged = prevState.motionType !== v.motion.type;

        if (v.motion.type === 'movimiento-fuerte') {
            parts.push('🔴 MOVIMIENTO INTENSO');
            if (motionChanged) changes.push('⚡ movimiento detectado');
            if (v.motion.activeZones.filter(z => z !== 'ninguna').length > 0) {
                details.push(`zonas: ${v.motion.activeZones.filter(z => z !== 'ninguna').join(', ')}`);
            }
        } else if (v.motion.type === 'movimiento-moderado') {
            parts.push('🟡 actividad moderada');
            if (motionChanged && prevState.motionType === 'estático') {
                changes.push('movimiento iniciado');
            }
        } else if (v.motion.type === 'movimiento-sutil') {
            parts.push('movimiento sutil');
        } else {
            parts.push('escena estática');
            if (motionChanged && prevState.motionType?.includes('movimiento')) {
                changes.push('movimiento detenido');
            }
        }

        // === AUDIO INTEGRATION ===
        if (a.speech.detected && Date.now() - (a.speech.history[a.speech.history.length - 1]?.timestamp || 0) < 3000) {
            parts.push('🎤 voz detectada');
            if (a.speech.transcript) {
                details.push(`"${a.speech.transcript.substring(0, 50)}..."`);
            }
        }

        if (a.environment.type === 'música') {
            parts.push('🎵 música');
        } else if (a.environment.type === 'ruido') {
            parts.push('📢 ruido ambiental');
        }

        // === VISUAL COMPLEXITY ===
        if (v.structure.complexity === 'alta') {
            details.push('entorno complejo');
        } else if (v.structure.complexity === 'baja') {
            details.push('fondo simple');
        }

        // === TIMESTAMP ===
        const now = new Date();
        const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // === COMBINE DESCRIPTION ===
        let mainDescription = parts.join(' | ');
        let detailDescription = details.length > 0 ? ` [${details.slice(0, 2).join('; ')}]` : '';
        let changeIndicator = changes.length > 0 ? ` ⚡ ${changes[0]}` : '';

        this.videoPerception.description = `[${timeStr}] ${mainDescription}${detailDescription}${changeIndicator}`;

        // Store current state for next comparison
        this._previousSceneState = currentState;
    }

    // ============================================================================
    // PUBLIC API
    // ============================================================================

    getFullPerception() {
        return {
            audio: { ...this.audioPerception },
            video: { ...this.videoPerception },
            permissions: { ...this.permissionStatus },
            isReady: this.isReady,
            summary: this.generatePerceptionSummary()
        };
    }

    generatePerceptionSummary() {
        const parts = [];

        if (this.videoPerception.enabled) {
            parts.push(`VISIÓN: ${this.videoPerception.description}`);
            if (this.videoPerception.humanPresence.detected) {
                parts.push(`Rostros: ${this.videoPerception.humanPresence.count}`);
            }
        }

        if (this.audioPerception.enabled) {
            parts.push(`AUDIO: ${this.audioPerception.environment.description}`);
            if (this.audioPerception.speech.transcript) {
                parts.push(`Último habla: "${this.audioPerception.speech.transcript}"`);
            }
        }

        return parts.join(' | ') || 'Percepción sensorial no disponible';
    }

    getVideoElement() {
        return this.videoElement;
    }

    getVideoStream() {
        return this.videoStream;
    }

    getAudioSpectrum() {
        return this.audioPerception.spectrum.raw;
    }

    getSpeechHistory() {
        return this.audioPerception.speech.history;
    }

    getHealthCounters() {
        return {
            ...this.speechHealth,
            speech_state: this.speechState
        };
    }

    // ============================================================================
    // CLEANUP
    // ============================================================================

    destroy() {
        // Stop analysis loops
        if (this.analysisIntervals.audio) clearInterval(this.analysisIntervals.audio);
        if (this.analysisIntervals.video) clearInterval(this.analysisIntervals.video);
        this.clearSpeechRetryTimer();

        // Stop speech recognition
        if (this.speechRecognition) {
            this.speechRecognition.stop();
        }

        // Stop audio
        if (this.audioContext) {
            this.audioContext.close();
        }
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
        }

        // Stop video
        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => track.stop());
        }

        this.isReady = false;
        this.setSpeechState('idle');
        console.log('🔌 Percepción sensorial desactivada');
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.SensoryPerceptionEngine = SensoryPerceptionEngine;
}
`r`n
