// Configuração da API para o frontend
// Este arquivo deve ser atualizado após o deploy da API Gateway

// INSTRUÇÕES PARA CONFIGURAÇÃO:
// 1. Faça o deploy da API com: serverless deploy --stage prod
// 2. Copie a URL da API Gateway do output do deploy
// 3. Substitua a URL abaixo pela URL real da sua API
// 4. Faça o redeploy do Amplify ou atualize este arquivo

window.API_CONFIG = {
    // URL da API Gateway (OBRIGATÓRIO: configurar via variável de ambiente)
    baseURL: window.ENV?.API_URL || '',
    
    // Endpoints da API (não altere a menos que mude na API)
    endpoints: {
        queue: '/queue'
    },
    
    // Configurações de ambiente
    stage: 'dev', // Ambiente atual
    region: 'us-east-1', // Região da sua AWS
    
    // Configurações da aplicação
    app: {
        autoRefreshInterval: 30000, // 30 segundos
        maxRetries: 3,
        requestTimeout: 10000 // 10 segundos
    }
};

// Validação da configuração
(function validateConfig() {
    const config = window.API_CONFIG;
    
    if (!config.baseURL) {
        console.warn('⚠️  API URL NÃO CONFIGURADA');
        console.info('📝 Para configurar:');
        console.info('1. No AWS Amplify Console → Environment Variables');
        console.info('2. Adicionar: API_URL = https://sua-api.execute-api.region.amazonaws.com/stage');
        console.info('3. Redeploy da aplicação');
        console.info('4. Ou para desenvolvimento local: editar frontend/env.js');
        
        // Usar modo demo se não configurado
        config.demoMode = true;
    } else {
        console.info('✅ API configurada:', config.baseURL);
        config.demoMode = false;
    }
})();
