// Configuração da API para o frontend
// Este arquivo deve ser atualizado após o deploy da API Gateway

// INSTRUÇÕES PARA CONFIGURAÇÃO:
// 1. Faça o deploy da API com: serverless deploy --stage prod
// 2. Copie a URL da API Gateway do output do deploy
// 3. Substitua a URL abaixo pela URL real da sua API
// 4. Faça o redeploy do Amplify ou atualize este arquivo

window.API_CONFIG = {
    // IMPORTANTE: Substitua esta URL pela URL real da sua API Gateway
    // Exemplo: https://abc123def.execute-api.us-east-1.amazonaws.com/prod
    baseURL: 'https://your-api-gateway-url.com/prod',
    
    // Endpoints da API (não altere a menos que mude na API)
    endpoints: {
        queue: '/queue'
    },
    
    // Configurações de ambiente
    stage: 'prod', // ou 'dev' para desenvolvimento
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
    
    if (!config.baseURL || config.baseURL.includes('your-api-gateway-url')) {
        console.warn('⚠️  CONFIGURAÇÃO PENDENTE: Configure a URL da API no arquivo config.js');
        console.info('📝 Instruções:');
        console.info('1. Deploy da API: serverless deploy --stage prod');
        console.info('2. Copie a URL da API Gateway');
        console.info('3. Atualize o arquivo public/config.js');
        console.info('4. Redeploy do Amplify');
        
        // Usar modo demo se não configurado
        config.demoMode = true;
    } else {
        console.info('✅ API configurada:', config.baseURL);
        config.demoMode = false;
    }
})();
