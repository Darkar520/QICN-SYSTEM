/**
 * ParameterUnifier.cjs - Unificador de parámetros multi-proveedor
 * Versión compatible con build process (CommonJS)
 */

class ParameterUnifier {
    constructor() {
        // Configuración de especificaciones por proveedor
        this.providerSpecs = {
            openai: {
                name: 'openai',
                url: 'https://api.openai.com/v1/chat/completions',
                headers: (apiKey) => ({
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }),
                parameterMapping: (params) => ({
                    temperature: params.temperature || 0.7,
                    max_tokens: params.max_tokens || 1024,
                    top_p: params.top_p || 1.0,
                    frequency_penalty: params.frequency_penalty || 0.0,
                    presence_penalty: params.presence_penalty || 0.0
                }),
                responseParser: (response) => {
                    return response.choices?.[0]?.message?.content || "Error: Respuesta de OpenAI incompleta";
                }
            },
            gemini: {
                name: 'gemini',
                url: 'https://generativelanguage.googleapis.com/v1beta/models',
                headers: () => ({
                    'Content-Type': 'application/json'
                }),
                parameterMapping: (params) => ({
                    temperature: params.temperature || 0.7,
                    max_output_tokens: params.max_tokens || 1024,
                    top_p: params.top_p || 0.95
                }),
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
                parameterMapping: (params) => ({
                    temperature: params.temperature || 0.75,
                    max_tokens: params.max_tokens || 1200,
                    top_p: params.top_p || 0.95,
                    frequency_penalty: params.frequency_penalty || 0.1,
                    presence_penalty: params.presence_penalty || 0.1
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
                parameterMapping: (params) => ({
                    temperature: params.temperature || 0.7,
                    max_tokens: params.max_tokens || 1024,
                    top_p: params.top_p || 1.0,
                    frequency_penalty: params.frequency_penalty || 0.0,
                    presence_penalty: params.presence_penalty || 0.0
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
                parameterMapping: (params) => ({
                    temperature: params.temperature || 0.75,
                    max_tokens: params.max_tokens || 1024,
                    top_p: params.top_p || 0.95
                }),
                responseParser: (response) => {
                    return response.choices?.[0]?.message?.content || "Error: Respuesta de MiniMax incompleta";
                }
            },
            bipsec: {
                name: 'bipsec',
                url: 'https://api.bipsec.ai/v1/chat/completions',
                headers: (apiKey) => ({
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }),
                parameterMapping: (params) => ({
                    temperature: params.temperature || 0.8,
                    max_tokens: params.max_tokens || 1500,
                    top_p: params.top_p || 0.95,
                    frequency_penalty: params.frequency_penalty || 0.1,
                    presence_penalty: params.presence_penalty || 0.1,
                    reasoning_effort: params.reasoning_effort || 'medium'
                }),
                responseParser: (response) => {
                    return response.choices?.[0]?.message?.content || "Error: Respuesta de BIPSEC incompleta";
                }
            },
            anthropic: {
                name: 'anthropic',
                url: 'https://api.anthropic.com/v1/messages',
                headers: (apiKey) => ({
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'anthropic-version': '2023-06-01'
                }),
                parameterMapping: (params) => ({
                    temperature: params.temperature || 0.7,
                    max_tokens: params.max_tokens || 1024,
                    top_p: params.top_p || 1.0
                }),
                responseParser: (response) => {
                    return response.content?.[0]?.text || "Error: Respuesta de Anthropic incompleta";
                }
            },
            openrouter: {
                name: 'openrouter',
                url: 'https://openrouter.ai/api/v1/chat/completions',
                headers: (apiKey) => ({
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://qicn-system.com',
                    'X-Title': 'QICN Multi-Provider System'
                }),
                parameterMapping: (params) => ({
                    temperature: params.temperature || 0.7,
                    max_tokens: params.max_tokens || 1024,
                    top_p: params.top_p || 1.0,
                    frequency_penalty: params.frequency_penalty || 0.0,
                    presence_penalty: params.presence_penalty || 0.0
                }),
                responseParser: (response) => {
                    return response.choices?.[0]?.message?.content || "Error: Respuesta de OpenRouter incompleta";
                }
            }
        };

        // Modelos por defecto por proveedor
        this.defaultModels = {
            openai: ['gpt-5', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
            gemini: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-1.5-pro-002'],
            xai: ['grok-beta', 'grok-2-latest', 'grok-2-mini', 'grok-vision-beta', 'grok-reasoner-beta'],
            deepseek: ['deepseek-chat-v3', 'deepseek-coder-v3', 'deepseek-r1', 'deepseek-ocr'],
            minimax: ['minimax-text-01', 'minimax-music-01', 'minimax-abab6.5s-chat'],
            bipsec: ['bipsec-quantum-v4', 'bipsec-quantum-v3', 'bipsec-neural-fusion'],
            anthropic: ['claude-sonnet-4.5', 'claude-sonnet-4', 'claude-opus-4'],
            openrouter: ['x-ai/grok-beta', 'anthropic/claude-4.5-sonnet', 'openai/gpt-5', 'minimax/minimax-m2']
        };
    }

    /**
     * Unifica parámetros para un proveedor específico
     */
    unifyParameters(params, provider) {
        const spec = this.getProviderConfig(provider);
        const mappedParams = spec.parameterMapping(params);
        
        return {
            provider,
            model: this.normalizeModel(null, provider),
            mappedParams,
            originalParams: params
        };
    }

    /**
     * Crea payload específico para el proveedor
     */
    createPayload(provider, messages, params = {}) {
        const spec = this.getProviderConfig(provider);
        const mappedParams = spec.parameterMapping(params);
        
        const basePayload = {
            model: this.normalizeModel(null, provider),
            messages: messages
        };

        // Agregar parámetros según el proveedor
        Object.keys(mappedParams).forEach(key => {
            if (key !== 'model' && key !== 'messages') {
                basePayload[key] = mappedParams[key];
            }
        });

        return basePayload;
    }

    /**
     * Obtiene configuración de un proveedor
     */
    getProviderConfig(provider) {
        if (!this.providerSpecs[provider]) {
            throw new Error(`Proveedor no soportado: ${provider}`);
        }
        return this.providerSpecs[provider];
    }

    /**
     * Normaliza nombre de modelo para un proveedor
     */
    normalizeModel(model, provider) {
        if (!model) {
            return this.defaultModels[provider]?.[0] || 'gpt-4-turbo';
        }

        // Mapas específicos de modelos por proveedor
        const modelMappings = {
            openai: {
                'gpt-5': 'gpt-5',
                'gpt-4.5': 'gpt-4.5',
                'gpt-4o': 'gpt-4o',
                'gpt-4o-mini': 'gpt-4o-mini',
                'gpt-4-turbo': 'gpt-4-turbo',
                'gpt-3.5-turbo': 'gpt-3.5-turbo'
            },
            gemini: {
                'gemini-2.5-pro': 'gemini-2.5-pro',
                'gemini-2.5-flash': 'gemini-2.5-flash',
                'gemini-2.5-flash-lite': 'gemini-2.5-flash-lite',
                'gemini-1.5-pro': 'gemini-2.5-pro',
                'gemini-1.5-flash': 'gemini-2.0-flash'
            },
            xai: {
                'grok-beta': 'grok-beta',
                'grok-2': 'grok-2-latest',
                'grok-2-latest': 'grok-2-latest',
                'grok-2-mini': 'grok-2-mini',
                'grok-vision': 'grok-vision-beta',
                'grok-reasoner': 'grok-reasoner-beta'
            },
            openrouter: {
                'grok-beta': 'x-ai/grok-beta',
                'claude-4.5': 'anthropic/claude-4.5-sonnet',
                'gpt-5': 'openai/gpt-5',
                'minimax': 'minimax/minimax-m2'
            }
        };

        const providerMappings = modelMappings[provider] || {};
        return providerMappings[model] || model;
    }

    /**
     * Obtiene modelos disponibles para un proveedor
     */
    getAvailableModels(provider) {
        return this.defaultModels[provider] || [];
    }

    /**
     * Valida parámetros antes del envío
     */
    validateParameters(params, provider) {
        const spec = this.getProviderConfig(provider);
        const validations = {
            temperature: { min: 0, max: 2 },
            max_tokens: { min: 1, max: 8192 },
            top_p: { min: 0, max: 1 }
        };

        const errors = [];
        
        Object.keys(validations).forEach(key => {
            const value = params[key];
            if (value !== undefined) {
                const validation = validations[key];
                if (value < validation.min || value > validation.max) {
                    errors.push(`${key} debe estar entre ${validation.min} y ${validation.max}`);
                }
            }
        });

        if (errors.length > 0) {
            throw new Error(`Parámetros inválidos: ${errors.join(', ')}`);
        }

        return true;
    }

    /**
     * Formatea mensaje para el proveedor
     */
    formatMessage(role, content, provider) {
        // Algunos proveedores tienen formatos específicos
        if (provider === 'anthropic') {
            if (role === 'assistant') {
                return `\nAssistant: ${content}`;
            } else if (role === 'user') {
                return `\nHuman: ${content}`;
            }
        }
        
        return { role, content };
    }

    /**
     * Calcula token estimate para el prompt
     */
    estimateTokens(messages, provider) {
        // Estimación simple de tokens (4 caracteres = 1 token promedio)
        const text = messages.map(m => m.content || m).join(' ');
        return Math.ceil(text.length / 4);
    }

    /**
     * Verifica si el modelo soporta cierta funcionalidad
     */
    supportsFeature(model, feature, provider) {
        const features = {
            'vision': ['gpt-4o', 'gemini-2.5-pro', 'grok-vision-beta'],
            'reasoning': ['o1-preview', 'grok-reasoner-beta', 'deepseek-r1'],
            'function_calling': ['gpt-4', 'gpt-4o', 'claude-3.5-sonnet'],
            'code': ['gpt-4', 'gpt-4o', 'deepseek-coder-v3', 'claude-3.5-sonnet']
        };

        const supportedModels = features[feature] || [];
        return supportedModels.some(supported => model.includes(supported));
    }
}

// Exportaciones para CommonJS
module.exports = {
    ParameterUnifier
};

// Exportaciones para navegador
if (typeof window !== 'undefined') {
    window.ParameterUnifier = ParameterUnifier;
}