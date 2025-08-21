// Configuração de variáveis de ambiente para o frontend
// Este arquivo pode ser sobrescrito em diferentes ambientes

window.ENV = {
    // URL da API Gateway (deve ser configurada via variáveis de ambiente)
    API_URL: '', // CONFIGURAR VIA AMPLIFY ENVIRONMENT VARIABLES
    
    // Outras configurações de ambiente
    STAGE: 'dev',
    REGION: 'us-east-1',
    
    // Configurações opcionais
    DEBUG: false,
    AUTO_REFRESH_INTERVAL: 30000, // 30 segundos
    
    // Feature flags (se necessário)
    FEATURES: {
        REAL_TIME_UPDATES: true,
        NOTIFICATIONS: true,
        ANALYTICS: false
    }
};

// Log da configuração (apenas em desenvolvimento)
if (window.ENV.DEBUG) {
    console.log('🔧 Environment Configuration:', window.ENV);
}

// Validação da configuração
(function validateEnv() {
    if (!window.ENV.API_URL) {
        console.error('❌ API_URL não configurada!');
        return;
    }
    
    if (!window.ENV.API_URL.startsWith('https://')) {
        console.warn('⚠️  API_URL deve usar HTTPS em produção');
    }
    
    console.log('✅ Environment configurado:', {
        apiUrl: window.ENV.API_URL,
        stage: window.ENV.STAGE,
        region: window.ENV.REGION
    });
})();
