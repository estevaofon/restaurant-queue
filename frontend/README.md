# Frontend - Sistema de Fila Digital

Interface web moderna para o sistema de gerenciamento de filas de restaurante.

## 🎨 Características

- **Design Responsivo**: Funciona perfeitamente em desktop, tablet e mobile
- **Interface Moderna**: UI/UX clean e intuitiva
- **Tempo Real**: Atualização automática da fila a cada 30 segundos
- **Funcionalidades Completas**:
  - Adicionar clientes à fila
  - Visualizar status da fila em tempo real
  - Gerenciar clientes (editar, chamar, sentar, remover)
  - Filtros por status
  - Estimativa de tempo de espera
  - Notificações toast

## 📱 Funcionalidades

### Para Clientes
- ✅ Entrar na fila digitalmente
- ✅ Ver posição na fila
- ✅ Tempo estimado de espera
- ✅ Status em tempo real

### Para Funcionários
- ✅ Visualizar fila completa
- ✅ Chamar próximo cliente
- ✅ Marcar cliente como sentado
- ✅ Editar informações do cliente
- ✅ Remover cliente da fila
- ✅ Filtrar por status
- ✅ Estatísticas da fila

## 🛠️ Tecnologias

- **HTML5**: Estrutura semântica
- **CSS3**: Design moderno com CSS Variables e Flexbox/Grid
- **JavaScript Vanilla**: Sem dependências externas
- **Font Awesome**: Ícones
- **Google Fonts**: Tipografia (Inter)

## 🚀 Deploy no AWS Amplify

### 1. Configuração Inicial

```bash
# No AWS Amplify Console:
# 1. Conectar ao repositório Git
# 2. Selecionar branch principal
# 3. Configurar build settings (usa amplify.yml automaticamente)
```

### 2. Configurar API

Após fazer deploy da API Gateway:

```bash
# 1. Faça deploy da API
serverless deploy --stage prod

# 2. Copie a URL da API Gateway do output
# 3. Edite public/config.js:
window.API_CONFIG = {
    baseURL: 'https://sua-api-real.execute-api.us-east-1.amazonaws.com/prod',
    // ...
};

# 4. Commit e push (Amplify vai fazer redeploy automaticamente)
```

### 3. Variáveis de Ambiente (Opcional)

No AWS Amplify Console:
- App Settings → Environment Variables
- Adicionar: `API_URL` com a URL da sua API

## 📁 Estrutura de Arquivos

```
public/
├── index.html          # Página principal
├── styles.css          # Estilos CSS
├── script.js          # Lógica JavaScript
├── config.js          # Configuração da API
└── README.md          # Esta documentação
```

## 🎯 Configuração

### Arquivo config.js

```javascript
window.API_CONFIG = {
    // URL da sua API Gateway
    baseURL: 'https://abc123.execute-api.us-east-1.amazonaws.com/prod',
    
    endpoints: {
        queue: '/queue'
    },
    
    stage: 'prod',
    region: 'us-east-1',
    
    app: {
        autoRefreshInterval: 30000, // 30s
        maxRetries: 3,
        requestTimeout: 10000 // 10s
    }
};
```

## 🔧 Personalização

### Cores (CSS Variables)

```css
:root {
    --primary-color: #2563eb;     /* Azul principal */
    --success-color: #059669;     /* Verde sucesso */
    --warning-color: #d97706;     /* Laranja aviso */
    --error-color: #dc2626;       /* Vermelho erro */
    /* ... */
}
```

### Intervalos de Atualização

```javascript
// Em script.js
setInterval(loadQueue, 30000); // 30 segundos
```

## 🌐 Modo Demo

Se a API não estiver configurada, o sistema funciona em modo demo com dados fictícios para demonstração.

## 📱 Responsividade

- **Desktop**: Layout completo com todas as funcionalidades
- **Tablet**: Layout adaptado com navegação otimizada
- **Mobile**: Interface simplificada para toque

## ⚡ Performance

- CSS otimizado com variáveis
- JavaScript vanilla (sem frameworks pesados)
- Imagens otimizadas (SVG favicon)
- Lazy loading de recursos externos

## 🔒 Segurança

- Validação de dados no frontend
- Sanitização de inputs
- Headers de segurança configurados
- HTTPS obrigatório em produção

## 🆘 Troubleshooting

### API não responde
1. Verificar URL em `config.js`
2. Verificar CORS na API Gateway
3. Verificar logs do Lambda

### Layout quebrado
1. Verificar console do browser
2. Verificar se CSS está carregando
3. Testar em modo incógnito

### Não atualiza automaticamente
1. Verificar JavaScript no console
2. Verificar conectividade de rede
3. Verificar se API está respondendo

## 📊 Métricas e Monitoramento

O frontend inclui:
- Logs de erro no console
- Tracking de chamadas da API
- Notificações de status para usuário
- Fallback para modo offline
