// Exemplo de configuração para desenvolvimento local
// Copie este arquivo para env.js e configure com suas URLs reais

window.ENV = {
    // URL da API Gateway (CONFIGURAR COM SUA URL REAL)
    API_URL: 'https://sua-api.execute-api.us-east-1.amazonaws.com/dev',
    
    // Configurações de ambiente
    STAGE: 'dev',
    REGION: 'us-east-1',
    
    // Configurações de desenvolvimento
    DEBUG: true, // Habilita logs detalhados
    AUTO_REFRESH_INTERVAL: 5000, // 5 segundos para desenvolvimento
    
    // Feature flags
    FEATURES: {
        REAL_TIME_UPDATES: true,
        NOTIFICATIONS: true,
        ANALYTICS: false // Desabilitar em desenvolvimento
    }
};

console.log('🔧 Configuração de desenvolvimento carregada');
console.log('📝 Para produção, configure as variáveis no AWS Amplify Console');
