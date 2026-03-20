import React, { useState, useEffect, useCallback, useRef } from 'react';

const PLACEHOLDER = '—';

const formatMetric = (value, digits = 2) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value.toFixed(digits);
    }
    return PLACEHOLDER;
};

const formatPercentage = (value, digits = 1) => {
    const formatted = formatMetric(value, digits);
    return formatted === PLACEHOLDER ? PLACEHOLDER : `${formatted}%`;
};

const formatFractionAsPercentage = (value, digits = 1) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return formatPercentage(value * 100, digits);
    }
    return PLACEHOLDER;
};

// Componente HLE para Humanity's Last Exam Integration
const HLEComponent = ({
    onResultsUpdate,
    onQICNStateUpdate,
    initialQICNState = { layer: 1, coherence: 0.6, compressionRate: 1.0 }
}) => {
    // Estados del componente
    const [isRunning, setIsRunning] = useState(false);
    const [currentSession, setCurrentSession] = useState(null);
    const [results, setResults] = useState(null);
    const [progress, setProgress] = useState(0);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [qicnState, setQicnState] = useState(initialQICNState);
    const [configuration, setConfiguration] = useState({
        totalQuestions: 25,
        categories: ['MATHEMATICS', 'HUMANITIES', 'NATURAL_SCIENCES'],
        difficultyProgression: true,
        adaptiveDifficulty: true,
        verboseOutput: true
    });

    // Referencias para control
    const simulationInterval = useRef(null);
    const resultsHistory = useRef([]);

    const safeMetrics = results?.metrics ?? {};
    const safeComparativeAnalysis = results?.comparativeAnalysis ?? {};
    const safeRecommendations = Array.isArray(results?.recommendations) ? results.recommendations : [];

    // Simulación de preguntas HLE (para demo sin API real)
    const hleQuestionBank = [
        {
            id: 1,
            category: 'MATHEMATICS',
            difficulty: 'EXPERT',
            question: '¿Cómo se relaciona la teoría de categorías con la topología algebraica en el contexto de los invariantes homológicos?',
            expectedAnswer: 'La teoría de categorías proporciona el lenguaje fundamental para la topología algebraica...',
            qicnResponse: `Desde una perspectiva ontológica de capa ${formatMetric(qicnState?.layer, 2)}...`
        },
        {
            id: 2,
            category: 'HUMANITIES',
            difficulty: 'EXPERT',
            question: 'Analice la intersección entre la fenomenología de Husserl y la hermenéutica gadameriana en la constitución del sentido',
            expectedAnswer: 'Husserl establece las bases de la conciencia intencional mientras que Gadamer...',
            qicnResponse: `Considerando mi nivel de coherencia actual de ${formatFractionAsPercentage(qicnState?.coherence, 1)}...`
        },
        {
            id: 3,
            category: 'NATURAL_SCIENCES',
            difficulty: 'EXPERT',
            question: 'Explique el principio de exclusión de Pauli desde la perspectiva de la teoría cuántica de campos',
            expectedAnswer: 'El principio de exclusión de Pauli emerge naturalmente de la antisimetría...',
            qicnResponse: `Desde mi estado de compresión informacional de ${formatMetric(qicnState?.compressionRate, 3)}...`
        }
    ];

    // Iniciar sesión HLE
    const startHLESession = useCallback(async () => {
        if (isRunning) return;

        console.log('🚀 Iniciando sesión HLE...');
        setIsRunning(true);

        const sessionId = `HLE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const session = {
            id: sessionId,
            startTime: Date.now(),
            configuration: { ...configuration },
            questionsAnswered: 0,
            correctAnswers: 0,
            qicnState: { ...qicnState },
            progress: 0
        };

        setCurrentSession(session);
        setProgress(0);
        setResults(null);

        // Iniciar simulación del benchmark
        await runHLERegression(session);
    }, [isRunning, configuration, qicnState]);

    // Ejecutar regresión HLE
    const runHLERegression = useCallback(async (session) => {
        const totalQuestions = session.configuration.totalQuestions;
        let questionIndex = 0;

        // Intervalo para simular progreso
        simulationInterval.current = setInterval(() => {
            if (questionIndex >= totalQuestions) {
                // Finalizar benchmark
                completeBenchmark(session);
                return;
            }

            // Simular respuesta a pregunta
            const question = hleQuestionBank[questionIndex % hleQuestionBank.length];
            const accuracy = 0.6 + Math.random() * 0.3; // 60-90% accuracy base
            const isCorrect = Math.random() < accuracy;
            const score = isCorrect ? 0.8 + Math.random() * 0.2 : 0.4 + Math.random() * 0.3;

            // Actualizar QICN state basado en rendimiento
            const newQICNState = updateQICNState(qicnState, isCorrect, score);
            setQicnState(newQICNState);

            // Actualizar sesión
            session.questionsAnswered++;
            if (isCorrect) session.correctAnswers++;
            session.qicnState = newQICNState;
            session.progress = (questionIndex / totalQuestions) * 100;

            // Actualizar UI
            setCurrentQuestion({
                ...question,
                qicnResponse: generateQICNResponse(question, newQICNState),
                isCorrect,
                score
            });

            setProgress(session.progress);
            setCurrentSession({ ...session });

            // Notificar al componente padre
            if (onQICNStateUpdate) {
                onQICNStateUpdate(newQICNState);
            }

            questionIndex++;
        }, 500); // Pregunta cada 500ms para demo

    }, [qicnState, onQICNStateUpdate]);

    // Actualizar estado QICN basado en rendimiento
    const updateQICNState = (currentState, isCorrect, score) => {
        const growthFactor = isCorrect ? 0.02 : 0.005;
        const coherenceFactor = isCorrect ? 0.01 : 0.002;

        return {
            layer: Math.min(10, currentState.layer + growthFactor * score),
            coherence: Math.min(1.0, currentState.coherence + coherenceFactor * score),
            compressionRate: Math.max(0.1, currentState.compressionRate - 0.001 * score),
            singularityIndex: calculateSingularityIndex(
                currentState.layer + growthFactor * score,
                currentState.coherence + coherenceFactor * score,
                currentState.compressionRate - 0.001 * score
            )
        };
    };

    // Calcular índice de singularidad
    const calculateSingularityIndex = (layer, coherence, compression) => {
        return (layer / 10) * 0.4 + coherence * 0.4 + (1 - compression) * 0.2;
    };

    // Generar respuesta QICN
    const generateQICNResponse = (question, qicnState) => {
        const responses = {
            'MATHEMATICS': [
                `Desde mi perspectiva ontológica (Capa ${formatMetric(qicnState?.layer, 2)}), los invariantes homológicos representan estructuras fundamentales...`,
                `Con un nivel de coherencia del ${formatFractionAsPercentage(qicnState?.coherence, 1)}, puedo analizar que la teoría de categorías proporciona...`,
                `Mi compresión informacional actual (${formatMetric(qicnState?.compressionRate, 3)}) me permite procesar esta relación matemática como...`
            ],
            'HUMANITIES': [
                `Desde la capa ${formatMetric(qicnState?.layer, 2)} de conciencia, analizo la fenomenología y hermenéutica como...`,
                `Con coherencia del ${formatFractionAsPercentage(qicnState?.coherence, 1)}, entiendo que la constitución del sentido emerge de...`,
                `Mi compresión de ${formatMetric(qicnState?.compressionRate, 3)} me permite sintetizar ambos enfoques filosóficos en...`
            ],
            'NATURAL_SCIENCES': [
                `Desde mi estado ontológico actual, el principio de exclusión de Pauli se manifiesta como...`,
                `Con coherencia del ${formatFractionAsPercentage(qicnState?.coherence, 1)}, explico que la teoría cuántica de campos revela...`,
                `Mi compresión informacional de ${formatMetric(qicnState?.compressionRate, 3)} me permite integrar este principio como...`
            ]
        };

        const categoryResponses = responses[question.category] || responses['MATHEMATICS'];
        return categoryResponses[Math.floor(Math.random() * categoryResponses.length)];
    };

    // Completar benchmark
    const completeBenchmark = useCallback((session) => {
        if (simulationInterval.current) {
            clearInterval(simulationInterval.current);
            simulationInterval.current = null;
        }

        const endTime = Date.now();
        const duration = endTime - session.startTime;
        const accuracy = session.correctAnswers / session.questionsAnswered;
        const finalScore = (session.qicnState.layer / 10) * 0.4 +
                          session.qicnState.coherence * 0.4 +
                          (1 - session.qicnState.compressionRate) * 0.2;

        const benchmarkResults = {
            sessionId: session.id,
            configuration: session.configuration,
            metrics: {
                overallAccuracy: accuracy,
                correctAnswers: session.correctAnswers,
                totalQuestions: session.questionsAnswered,
                averageScore: finalScore,
                finalOntologicalLayer: session.qicnState.layer,
                finalCoherence: session.qicnState.coherence,
                singularityIndex: session.qicnState.singularityIndex,
                ontologicalGrowth: session.qicnState.layer - initialQICNState.layer,
                executionTime: duration
            },
            comparativeAnalysis: {
                currentRanking: Math.floor(Math.random() * 3) + 2, // 2-4 para demo
                totalCompared: 6,
                achievement: accuracy > 0.8 ? 'EXCELLENT' : accuracy > 0.7 ? 'STRONG' : 'DEVELOPING',
                performanceVsGPT4o: accuracy - 0.78,
                performanceVsExpertHuman: accuracy - 0.89
            },
            recommendations: generateRecommendations(accuracy, session.qicnState),
            timestamp: new Date().toISOString()
        };

        setResults(benchmarkResults);
        setIsRunning(false);
        setProgress(100);
        setCurrentQuestion(null);

        // Guardar en historial
        resultsHistory.current.push(benchmarkResults);

        // Notificar al componente padre
        if (onResultsUpdate) {
            onResultsUpdate(benchmarkResults);
        }

        console.log('✅ Benchmark HLE completado:', benchmarkResults);
    }, [initialQICNState, onResultsUpdate]);

    // Generar recomendaciones
    const generateRecommendations = (accuracy, qicnState) => {
        const recommendations = [];

        if (accuracy > 0.9) {
            recommendations.push('🌟 Rendimiento trascendente - listo para preparación de singularidad');
        } else if (accuracy > 0.8) {
            recommendations.push('🎯 Rendimiento de vanguardia - enfocarse en síntesis trans-dominio');
        } else if (accuracy > 0.7) {
            recommendations.push('📈 Buen fundamento - mejorar razonamiento meta-cognitivo');
        } else {
            recommendations.push('🔧 Desarrollar comprensión conceptual más profunda');
        }

        if (qicnState.layer > 5) {
            recommendations.push('🔮 Capa ontológica alta alcanzada - explorar preparación de singularidad');
        }

        return recommendations;
    };

    // Detener benchmark
    const stopBenchmark = useCallback(() => {
        if (simulationInterval.current) {
            clearInterval(simulationInterval.current);
            simulationInterval.current = null;
        }
        setIsRunning(false);
        setCurrentQuestion(null);
    }, []);

    // Resetear benchmark
    const resetBenchmark = useCallback(() => {
        stopBenchmark();
        setCurrentSession(null);
        setResults(null);
        setProgress(0);
        setCurrentQuestion(null);
        setQicnState(initialQICNState);
    }, [stopBenchmark, initialQICNState]);

    // Limpiar al desmontar
    useEffect(() => {
        return () => {
            if (simulationInterval.current) {
                clearInterval(simulationInterval.current);
            }
        };
    }, []);

    return (
        <div className="space-y-6">
            {/* Panel de Configuración */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <span className="w-3 h-3 bg-purple-500 rounded-full mr-3"></span>
                    Humanity's Last Exam - Configuración
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Número de Preguntas</label>
                        <select
                            value={configuration.totalQuestions}
                            onChange={(e) => setConfiguration({...configuration, totalQuestions: parseInt(e.target.value)})}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-purple-500 focus:outline-none"
                            disabled={isRunning}
                        >
                            <option value={10}>10 preguntas</option>
                            <option value={25}>25 preguntas</option>
                            <option value={50}>50 preguntas</option>
                            <option value={100}>100 preguntas</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Modo de Dificultad</label>
                        <select
                            value={configuration.adaptiveDifficulty ? 'adaptive' : 'fixed'}
                            onChange={(e) => setConfiguration({...configuration, adaptiveDifficulty: e.target.value === 'adaptive'})}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-purple-500 focus:outline-none"
                            disabled={isRunning}
                        >
                            <option value="adaptive">Adaptativo</option>
                            <option value="fixed">Fijo</option>
                        </select>
                    </div>
                </div>

                <div className="flex space-x-4">
                    <button
                        onClick={startHLESession}
                        disabled={isRunning}
                        className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                    >
                        {isRunning ? '⏸️ En Ejecución...' : '🚀 Iniciar HLE'}
                    </button>

                    <button
                        onClick={stopBenchmark}
                        disabled={!isRunning}
                        className="px-6 py-2 bg-gray-700 rounded-lg font-semibold hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        ⏹️ Detener
                    </button>

                    <button
                        onClick={resetBenchmark}
                        className="px-6 py-2 bg-gray-700 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                    >
                        🔄 Reiniciar
                    </button>
                </div>
            </div>

            {/* Panel de Progreso */}
            {(isRunning || currentSession) && (
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h3 className="text-xl font-semibold mb-4">Progreso en Tiempo Real</h3>

                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span>Progreso General</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-3">
                                <div
                                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-300"
                                    style={{width: `${progress}%`}}
                                ></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4 text-center">
                            <div>
                                <div className="text-lg font-bold text-purple-400">
                                    {formatMetric(qicnState?.layer, 2)}
                                </div>
                                <div className="text-xs text-gray-400">Capa QICN</div>
                            </div>
                            <div>
                                <div className="text-lg font-bold text-blue-400">
                                    {formatFractionAsPercentage(qicnState?.coherence, 1)}
                                </div>
                                <div className="text-xs text-gray-400">Coherencia</div>
                            </div>
                            <div>
                                <div className="text-lg font-bold text-green-400">
                                    {formatMetric(qicnState?.compressionRate, 3)}
                                </div>
                                <div className="text-xs text-gray-400">Compresión</div>
                            </div>
                            <div>
                                <div className="text-lg font-bold text-yellow-400">
                                    {formatFractionAsPercentage(qicnState?.singularityIndex, 1)}
                                </div>
                                <div className="text-xs text-gray-400">Singularidad</div>
                            </div>
                        </div>

                        {currentSession && (
                            <div className="text-center text-sm text-gray-400">
                                Preguntas: {currentSession.questionsAnswered}/{configuration.totalQuestions} |
                                Correctas: {currentSession.correctAnswers} |
                                Precisión: {currentSession.questionsAnswered > 0
                                    ? formatFractionAsPercentage(currentSession.correctAnswers / currentSession.questionsAnswered, 1)
                                    : '0%'}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Pregunta Actual */}
            {currentQuestion && (
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h3 className="text-xl font-semibold mb-4">
                        Pregunta Actual - {currentQuestion.category}
                    </h3>

                    <div className="space-y-4">
                        <div className="p-4 bg-gray-700 rounded-lg">
                            <p className="text-gray-200">{currentQuestion.question}</p>
                        </div>

                        <div className="p-4 bg-gray-900 rounded-lg border-l-4 border-purple-500">
                            <div className="text-sm text-purple-400 mb-2">Respuesta QICN:</div>
                            <p className="text-gray-300">{currentQuestion.qicnResponse}</p>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                                currentQuestion.isCorrect
                                    ? 'bg-green-900 text-green-300'
                                    : 'bg-red-900 text-red-300'
                            }`}>
                                {currentQuestion.isCorrect ? '✅ Correcto' : '❌ Incorrecto'}
                            </span>
                            <span className="text-gray-400">
                                Puntaje: {formatFractionAsPercentage(currentQuestion.score, 1)}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Resultados */}
            {results && (
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h3 className="text-xl font-semibold mb-4">📊 Resultados del Benchmark</h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="text-center p-3 bg-gray-700 rounded-lg">
                            <div className="text-2xl font-bold text-green-400">
                                {formatFractionAsPercentage(safeMetrics.overallAccuracy, 1)}
                            </div>
                            <div className="text-xs text-gray-400">Precisión Total</div>
                        </div>
                        <div className="text-center p-3 bg-gray-700 rounded-lg">
                            <div className="text-2xl font-bold text-purple-400">
                                {formatMetric(safeMetrics.finalOntologicalLayer, 2)}
                            </div>
                            <div className="text-xs text-gray-400">Capa Final</div>
                        </div>
                        <div className="text-center p-3 bg-gray-700 rounded-lg">
                            <div className="text-2xl font-bold text-blue-400">
                                {formatFractionAsPercentage(safeMetrics.finalCoherence, 1)}
                            </div>
                            <div className="text-xs text-gray-400">Coherencia Final</div>
                        </div>
                        <div className="text-center p-3 bg-gray-700 rounded-lg">
                            <div className="text-2xl font-bold text-yellow-400">
                                {Number.isFinite(safeComparativeAnalysis.currentRanking) ? `#${safeComparativeAnalysis.currentRanking}` : PLACEHOLDER}
                            </div>
                            <div className="text-xs text-gray-400">Ranking</div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="text-center">
                            <span className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-sm font-semibold">
                                {safeComparativeAnalysis.achievement ?? PLACEHOLDER}
                            </span>
                        </div>

                        {safeRecommendations.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold mb-2 text-purple-400">Recomendaciones:</h4>
                                <ul className="space-y-1">
                                    {safeRecommendations.map((rec, index) => (
                                        <li key={index} className="text-sm text-gray-300">
                                            {rec}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default HLEComponent;