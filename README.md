# Sistema de Fila de Restaurante

Um sistema serverless para gerenciar filas de restaurantes usando AWS Lambda, DynamoDB e API Gateway.

## 📋 Pré-requisitos

- Python 3.11+
- uv (gerenciador de pacotes Python)
- AWS CLI configurado
- Conta AWS ativa

## 🚀 Configuração Inicial

### 1. Instalar Dependências

```bash
uv sync
```

### 2. Configurar AWS

```bash
aws configure
```

### 3. Criar Tabela DynamoDB

**IMPORTANTE**: A tabela DynamoDB agora é criada via script Python, não mais pelo Serverless Framework.

```bash
# Criar tabela para desenvolvimento
uv run create_table.py --stage dev

# Criar tabela para produção
uv run create_table.py --stage prod --region us-east-1

# Remover tabela (útil para desenvolvimento)
uv run create_table.py --stage dev --delete
```

### 4. Deploy da Aplicação

```bash
# Deploy para desenvolvimento
serverless deploy --stage dev

# Deploy para produção
serverless deploy --stage prod
```

## 📊 Gerenciamento da Tabela DynamoDB

### Criar Tabela

```bash
# Opções básicas
uv run create_table.py

# Especificar ambiente e região
uv run create_table.py --stage prod --region us-west-2

# Usar nome de serviço customizado
uv run create_table.py --service-name meu-restaurante --stage dev
```

### Remover Tabela

```bash
# Remover tabela de desenvolvimento
uv run create_table.py --stage dev --delete

# Remover tabela de produção (cuidado!)
uv run create_table.py --stage prod --delete
```

### Estrutura da Tabela

- **Partition Key**: `id` (String) - ID único do cliente na fila
- **Global Secondary Index**: `StatusIndex`
  - **Partition Key**: `status` (String) - Status do cliente (waiting, seated, cancelled)
  - **Sort Key**: `checkInTime` (String) - Timestamp do check-in
- **TTL**: Configurado no atributo `ttl` para limpeza automática após 30 dias

## 🛠️ Desenvolvimento Local

```bash
# Instalar plugins do Serverless
npm install

# Executar localmente
serverless offline --stage dev
```

## 📱 Endpoints da API

Após o deploy, os seguintes endpoints estarão disponíveis:

- `POST /queue` - Adicionar cliente à fila
- `GET /queue` - Listar clientes na fila
- `PUT /queue/{id}` - Atualizar status do cliente
- `DELETE /queue/{id}` - Remover cliente da fila

## 🔧 Variáveis de Ambiente

O sistema usa as seguintes variáveis de ambiente:

- `TABLE_NAME`: Nome da tabela DynamoDB (gerado automaticamente)
- `STAGE`: Ambiente atual (dev/prod)
- `AWS_DEFAULT_REGION`: Região AWS

## 📁 Estrutura do Projeto

```
restaurant-queue/
├── handlers/           # Funções Lambda
│   └── handler.py     # Handlers da fila
├── create_table.py    # Script para gerenciar tabela DynamoDB
├── main.py           # Ponto de entrada (se necessário)
├── serverless.yml    # Configuração do Serverless Framework
├── pyproject.toml    # Configuração do Python/uv
└── README.md         # Esta documentação
```

## 🎯 Comandos Úteis

```bash
# Ver status da aplicação
serverless info --stage dev

# Ver logs em tempo real
serverless logs -f createQueue --tail --stage dev

# Remover aplicação completamente
serverless remove --stage dev

# Atualizar apenas uma função
serverless deploy function -f createQueue --stage dev
```

## ⚠️ Importante

1. **Sempre crie a tabela DynamoDB antes do deploy** usando o script `create_table.py`
2. **Para produção**, use uma região próxima aos seus usuários
3. **Configure TTL** adequadamente para seus dados (padrão: 30 dias)
4. **Monitore custos** - DynamoDB usa billing PAY_PER_REQUEST

## 🆘 Troubleshooting

### Erro "Table does not exist"
```bash
# Verificar se a tabela foi criada
aws dynamodb describe-table --table-name restaurant-queue-system-dev

# Recriar a tabela
uv run create_table.py --stage dev
```

### Erro de permissões AWS
```bash
# Verificar credenciais
aws sts get-caller-identity

# Configurar novamente
aws configure
```
