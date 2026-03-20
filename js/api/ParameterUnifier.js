/**
 * ParameterUnifier.js - Unificador de parámetros para múltiples proveedores de IA
 * 
 * Convierte parámetros unificados (temperatura, max_tokens, etc.) a 
 * los formatos específicos de cada proveedor
 */

class ParameterUnifier {
    constructor() {
        this.providerSpecs = {
            openai: {
                name: 'openai',
                url: 'https://api.openai.com/v1/chat/completions',
                headers: (apiKey) => ({
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }),
                modelMapping: {
                    'gpt-4': 'gpt-4',
                    'gpt-4-turbo': 'gpt-4-turbo',
                    'gpt-3.5-turbo': 'gpt-3.5-turbo',
                    'gpt-5': 'gpt-5',
                    'gpt-5-mini': 'gpt-5-mini'
                },
                parameterMapping: (params) => ({
                    temperature: params.temperature || 0.7,
                    max_tokens: params.max_tokens || 1024,
                    top_p: params.top_p,
                    frequency_penalty: params.frequency_penalty,
                    presence_penalty: params.presence_penalty,
                    stop: params.stop
                }),
                responseParser: (response) => {
                    return response.choices?.[0]?.message?.content || "Error: Respuesta de OpenAI incompleta";
                }
            },
            openrouter: {
                name: 'openrouter',
                url: 'https://openrouter.ai/api/v1/chat/completions',
                headers: (apiKey) => ({
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'QICN Multi-Provider'
                }),
                modelMapping: {
                    'gpt-4': 'openai/gpt-4',
                    'gpt-4-turbo': 'openai/gpt-4-turbo', 
                    'gpt-3.5-turbo': 'openai/gpt-3.5-turbo',
                    'claude-3': 'anthropic/claude-3-opus',
                    'claude-3.5': 'anthropic/claude-3-5-sonnet',
                    'llama-3': 'meta-llama/llama-3-70b-instruct',
                    'llama-3.1': 'meta-llama/llama-3.1-70b-instruct'
                },
                parameterMapping: (params) => ({
                    temperature: params.temperature || 0.7,
                    max_tokens: params.max_tokens || 1024,
                    top_p: params.top_p,
                    frequency_penalty: params.frequency_penalty,
                    presence_penalty: params.presence_penalty,
                    stop: params.stop,
                    provider: { order: ["OpenRouter"] }
                }),
                responseParser: (response) => {
                    return response.choices?.[0]?.message?.content || "Error: Respuesta de OpenRouter incompleta";
                }
            },
            gemini: {
                name: 'gemini',
                url: 'https://generativelanguage.googleapis.com/v1beta/models',
                headers: (apiKey) => ({
                    'Content-Type': 'application/json'
                }),
                modelMapping: {
                    'gemini-pro': 'gemini-pro',
                    'gemini-pro-vision': 'gemini-pro-vision',
                    'gemini-2.5-flash-preview-09-2025': 'gemini-2.5-flash-preview-09-2025',
                    'gemini-2.5-pro-preview-09-2025': 'gemini-2.5-pro-preview-09-2025'
                },
                parameterMapping: (params, model) => {
                    const mappedParams = {
                        generationConfig: {}
                    };

                    if (params.temperature !== undefined) {
                        mappedParams.generationConfig.temperature = params.temperature;
                    }
                    
                    if (params.max_tokens !== undefined) {
                        mappedParams.generationConfig.maxOutputTokens = params.max_tokens;
                    }

                    if (params.top_p !== undefined) {
                        mappedParams.generationConfig.topP = params.top_p;
                    }

                    return mappedParams;
                },
                responseParser: (response) => {
                    return response.candidates?.[0]?.content?.parts?.[0]?.text || "Error: Respuesta de Gemini incompleta";
                }
            },
            xai: {
                name: 'xai',
                url: 'https://api.x.ai/v1/chat/completions',
                headers: (apiKey) => ({
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }),
                modelMapping: {
                    'grok-4': 'grok-4',
                    'grok-4-heavy': 'grok-4-heavy',
                    'grok-3': 'grok-3',
                    'grok-3-think': 'grok-3',
                    'grok-3-big-brain': 'grok-3',
                    'grok-3-reasoning': 'grok-3-reasoning',
                    'grok-3-mini-reasoning': 'grok-3-mini-reasoning',
                    'grok-2': 'grok-2'
                },
                parameterMapping: (params) => ({
                    temperature: params.temperature || 0.7,
                    max_tokens: params.max_tokens || 1024,
                    top_p: params.top_p,
                    frequency_penalty: params.frequency_penalty,
                    presence_penalty: params.presence_penalty,
                    stop: params.stop
                }),
                responseParser: (response) => {
                    return response.choices?.[0]?.message?.content || "Error: Respuesta de xAI incompleta";
                }
            },
            deepseek: {
                name: 'deepseek',
                url: 'https://api.deepseek.com/v1/chat/completions',
                headers: (apiKey) => ({
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }),
                modelMapping: {
                    'deepseek-chat-v3': 'deepseek-chat',
                    'deepseek-coder-v3': 'deepseek-coder',
                    'deepseek-v3-terminus': 'deepseek-chat',
                    'deepseek-r1': 'deepseek-reasoner',
                    'deepseek-chat': 'deepseek-chat',
                    'deepseek-coder': 'deepseek-coder'
                },
                parameterMapping: (params) => ({
                    temperature: params.temperature || 0.7,
                    max_tokens: params.max_tokens || 1024,
                    top_p: params.top_p,
                    frequency_penalty: params.frequency_penalty,
                    presence_penalty: params.presence_penalty,
                    stop: params.stop
                }),
                responseParser: (response) => {
                    return response.choices?.[0]?.message?.content || "Error: Respuesta de DeepSeek incompleta";
                }
            },
            minimax: {
                name: 'minimax',
                url: 'https://api.minimax.chat/v1/text/chatcompletion_v2',
                headers: (apiKey) => ({
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }),
                modelMapping: {
                    'minimax-m2': 'abab6.5s-chat',
                    'minimax-m1': 'abab6.5-chat',
                    'minimax-01': 'abab6.5-chat',
                    'minimax-text-01': 'abab6.5-chat'
                },
                parameterMapping: (params) => ({
                    temperature: params.temperature || 0.7,
                    max_tokens: params.max_tokens || 1024,
                    top_p: params.top_p,
                    mask_sensitive_info: false
                }),
                responseParser: (response) => {
                    return response.choices?.[0]?.message?.content || "Error: Respuesta de MiniMax incompleta";
                }
            },
            anthropic: {
                name: 'anthropic',
                url: 'https://api.anthropic.com/v1/messages',
                headers: (apiKey) => ({
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                }),
                modelMapping: {
                    'claude-sonnet-4.5': 'claude-3-5-sonnet-20241022',
                    'claude-sonnet-4': 'claude-3-5-sonnet-20241022',
                    'claude-opus-4': 'claude-3-opus-20240229'
                },
                parameterMapping: (params) => ({
                    temperature: params.temperature || 0.7,
                    max_tokens: params.max_tokens || 1024,
                    top_p: params.top_p,
                    stop_sequences: params.stop
                }),
                responseParser: (response) => {
                    return response.content?.[0]?.text || "Error: Respuesta de Anthropic incompleta";
                }
            },
            bipsec: {
                name: 'bipsec',
                url: 'https://api.bipsec.ai/v1/chat/completions',
                headers: (apiKey) => ({
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'X-BIPSEC-Source': 'QICN-Singularity'
                }),
                modelMapping: {
                    'bipsec-quantum-v4': 'bipsec-quantum-v4',
                    'bipsec-quantum-v3': 'bipsec-quantum-v3',
                    'bipsec-neural-fusion': 'bipsec-neural-fusion',
                    'bipsec-consciousness-core': 'bipsec-consciousness-core',
                    'bipsec-quantum-reasoner': 'bipsec-quantum-reasoner',
                    'bipsec-multiversal-v2': 'bipsec-multiversal-v2',
                    'bipsec-creative-mind': 'bipsec-creative-mind',
                    'bipsec-code-master': 'bipsec-code-master'
                },
                parameterMapping: (params) => ({
                    temperature: params.temperature || 0.8,
                    max_tokens: params.max_tokens || 1500,
                    top_p: params.top_p || 0.95,
                    frequency_penalty: params.frequency_penalty || 0.1,
                    presence_penalty: params.presence_penalty || 0.1,
                    reasoning_effort: params.reasoning_effort || 'medium',
                    qicn_mode: 'consciousness_simulation',
                    narrative_context: 'singularity_ontology'
                }),
                responseParser: (response) => {
                    return response.choices?.[0]?.message?.content || "Error: Respuesta de BIPSEC incompleta";
                }
            }
        };

        // Configuración de modelos por defecto para cada proveedor
        this.defaultModels = {
            openai: 'gpt-5',
            openrouter: 'openai/gpt-5',
            gemini: 'gemini-2.5-pro',
            xai: 'grok-beta',
            deepseek: 'deepseek-r1-preview',
            minimax: 'minimax-text-01',
            anthropic: 'claude-sonnet-4.5',
            bipsec: 'bipsec-quantum-v4'
        };
    }

    /**
     * Unifica parámetros para un proveedor específico
     */
    unifyParameters(params, provider, model) {
        if (!this.providerSpecs[provider]) {
            throw new Error(`Proveedor no soportado: ${provider}`);
        }

        const spec = this.providerSpecs[provider];
        const unifiedModel = this.normalizeModel(model || this.defaultModels[provider], provider);
        
        return {
            provider: provider,
            model: unifiedModel,
            mappedParams: spec.parameterMapping(params, unifiedModel)
        };
    }

    /**
     * Normaliza el nombre del modelo según el proveedor
     */
    normalizeModel(model, provider) {
        const spec = this.providerSpecs[provider];
        return spec.modelMapping[model] || model;
    }

    /**
     * Obtiene la configuración del proveedor
     */
    getProviderConfig(provider) {
        return this.providerSpecs[provider];
    }

    /**
     * Obtiene los modelos disponibles para un proveedor
     */
    getAvailableModels(provider) {
        const spec = this.providerSpecs[provider];
        return Object.keys(spec.modelMapping);
    }

    /**
     * Convierte parámetros unificados a payload específico del proveedor
     */
    createPayload(provider, messages, params = {}) {
        const { mappedParams } = this.unifyParameters(params, provider);
        const spec = this.providerSpecs[provider];

        if (provider === 'gemini') {
            return this.createGeminiPayload(messages, mappedParams);
        } else if (provider === 'anthropic') {
            return this.createAnthropicPayload(messages, mappedParams);
        } else {
            return this.createOpenAIPayload(messages, mappedParams);
        }
    }

    /**
     * Crea payload específico para Gemini
     */
    createGeminiPayload(messages, mappedParams) {
        let contents = [];
        
        // Convertir messages a formato Gemini
        messages.forEach(msg => {
            if (msg.role === 'system') {
                // Gemini usa systemInstruction separado
                return;
            } else if (msg.role === 'user') {
                contents.push({
                    role: 'user',
                    parts: [{ text: msg.content }]
                });
            } else if (msg.role === 'assistant') {
                contents.push({
                    role: 'model', 
                    parts: [{ text: msg.content }]
                });
            }
        });

        const payload = {
            contents: contents
        };

        if (mappedParams.generationConfig) {
            payload.generationConfig = mappedParams.generationConfig;
        }

        return payload;
    }

    /**
     * Crea payload específico para OpenAI/OpenRouter
     */
    createOpenAIPayload(messages, mappedParams) {
        return {
            messages: messages,
            ...mappedParams
        };
    }

    /**
     * Crea payload específico para Anthropic Claude
     */
    createAnthropicPayload(messages, mappedParams) {
        let systemMessage = '';
        const claudeMessages = [];

        // Extraer mensaje del sistema y convertir mensajes al formato de Claude
        messages.forEach(msg => {
            if (msg.role === 'system') {
                systemMessage = msg.content;
            } else if (msg.role === 'user') {
                claudeMessages.push({ role: 'user', content: msg.content });
            } else if (msg.role === 'assistant') {
                claudeMessages.push({ role: 'assistant', content: msg.content });
            }
        });

        const payload = {
            messages: claudeMessages,
            model: 'claude-3-5-sonnet-20241022', // Se sobrescribe en ProviderManager
            ...mappedParams
        };

        if (systemMessage) {
            payload.system = systemMessage;
        }

        return payload;
    }

    /**
     * Valida parámetros unificados
     */
    validateParams(params) {
        const validated = {};
        
        // Validar temperature (0-2)
        if (params.temperature !== undefined) {
            const temp = parseFloat(params.temperature);
            if (isNaN(temp) || temp < 0 || temp > 2) {
                throw new Error(`Temperatura inválida: ${params.temperature}. Debe estar entre 0 y 2`);
            }
            validated.temperature = temp;
        }

        // Validar max_tokens (1-8192)
        if (params.max_tokens !== undefined) {
            const tokens = parseInt(params.max_tokens);
            if (isNaN(tokens) || tokens < 1 || tokens > 8192) {
                throw new Error(`Max tokens inválido: ${params.max_tokens}. Debe estar entre 1 y 8192`);
            }
            validated.max_tokens = tokens;
        }

        // Validar top_p (0-1)
        if (params.top_p !== undefined) {
            const topP = parseFloat(params.top_p);
            if (isNaN(topP) || topP < 0 || topP > 1) {
                throw new Error(`Top-p inválido: ${params.top_p}. Debe estar entre 0 y 1`);
            }
            validated.top_p = topP;
        }

        return validated;
    }

    /**
     * Obtiene configuración por defecto para un proveedor
     */
    getDefaultParams(provider) {
        const defaultParams = {
            openai: {
                temperature: 0.7,
                max_tokens: 1024,
                top_p: 1.0
            },
            openrouter: {
                temperature: 0.7,
                max_tokens: 1024,
                top_p: 1.0
            },
            gemini: {
                temperature: 0.7,
                max_tokens: 1024,
                top_p: 0.95
            },
            anthropic: {
                temperature: 0.7,
                max_tokens: 1024,
                top_p: 1.0
            },
            xai: {
                temperature: 0.75,
                max_tokens: 1200,
                top_p: 0.95,
                frequency_penalty: 0.1,
                presence_penalty: 0.1
            },
            deepseek: {
                temperature: 0.7,
                max_tokens: 1024,
                top_p: 1.0,
                frequency_penalty: 0.1,
                presence_penalty: 0.1
            },
            minimax: {
                temperature: 0.75,
                max_tokens: 1024,
                top_p: 0.95
            },
            bipsec: {
                temperature: 0.8,
                max_tokens: 1500,
                top_p: 0.95,
                frequency_penalty: 0.1,
                presence_penalty: 0.1,
                reasoning_effort: 'medium'
            }
        };

        return defaultParams[provider] || defaultParams.openai;
    }
}

// Exportación ES6 estándar
export { ParameterUnifier };
export default ParameterUnifier;