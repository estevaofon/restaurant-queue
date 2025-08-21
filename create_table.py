#!/usr/bin/env python3
"""
Script para criar a tabela DynamoDB do sistema de fila de restaurante.

Uso:
    uv run create_table.py [--stage dev|prod] [--region us-east-1]

Exemplo:
    uv run create_table.py --stage dev --region us-east-1
"""

import argparse
import boto3
import sys
from botocore.exceptions import ClientError


def create_queue_table(table_name: str, region: str = 'us-east-1') -> bool:
    """
    Cria a tabela DynamoDB para o sistema de fila do restaurante.
    
    Args:
        table_name: Nome da tabela a ser criada
        region: Região AWS onde criar a tabela
        
    Returns:
        True se a tabela foi criada com sucesso, False caso contrário
    """
    try:
        # Inicializar cliente DynamoDB
        dynamodb = boto3.client('dynamodb', region_name=region)
        
        # Configuração da tabela
        table_config = {
            'TableName': table_name,
            'BillingMode': 'PAY_PER_REQUEST',  # Paga por requisição (ideal para projetos pequenos)
            'AttributeDefinitions': [
                {
                    'AttributeName': 'id',
                    'AttributeType': 'S'  # String
                },
                {
                    'AttributeName': 'status',
                    'AttributeType': 'S'  # String
                },
                {
                    'AttributeName': 'checkInTime',
                    'AttributeType': 'S'  # String (ISO datetime)
                }
            ],
            'KeySchema': [
                {
                    'AttributeName': 'id',
                    'KeyType': 'HASH'  # Partition key
                }
            ],
            'GlobalSecondaryIndexes': [
                {
                    'IndexName': 'StatusIndex',
                    'KeySchema': [
                        {
                            'AttributeName': 'status',
                            'KeyType': 'HASH'  # Partition key
                        },
                        {
                            'AttributeName': 'checkInTime',
                            'KeyType': 'RANGE'  # Sort key
                        }
                    ],
                    'Projection': {
                        'ProjectionType': 'ALL'  # Inclui todos os atributos
                    }
                }
            ],
            'Tags': [
                {
                    'Key': 'Project',
                    'Value': 'RestaurantQueue'
                },
                {
                    'Key': 'Environment',
                    'Value': table_name.split('-')[-1] if '-' in table_name else 'dev'
                }
            ]
        }
        
        print(f"Criando tabela DynamoDB: {table_name}")
        print(f"Região: {region}")
        
        # Criar a tabela
        response = dynamodb.create_table(**table_config)
        
        print(f"✅ Tabela criada com sucesso!")
        print(f"   ARN: {response['TableDescription']['TableArn']}")
        print(f"   Status: {response['TableDescription']['TableStatus']}")
        
        # Aguardar a tabela ficar ativa
        print("⏳ Aguardando tabela ficar ativa...")
        waiter = dynamodb.get_waiter('table_exists')
        waiter.wait(
            TableName=table_name,
            WaiterConfig={
                'Delay': 10,  # Aguardar 10 segundos entre verificações
                'MaxAttempts': 30  # Máximo de 5 minutos
            }
        )
        
        # Configurar TTL (Time to Live) para limpeza automática
        print("⚙️  Configurando TTL para limpeza automática...")
        try:
            dynamodb.update_time_to_live(
                TableName=table_name,
                TimeToLiveSpecification={
                    'AttributeName': 'ttl',
                    'Enabled': True
                }
            )
            print("✅ TTL configurado com sucesso (30 dias)")
        except ClientError as e:
            print(f"⚠️  Aviso: Não foi possível configurar TTL: {e}")
        
        print(f"🎉 Tabela {table_name} está pronta para uso!")
        return True
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        
        if error_code == 'ResourceInUseException':
            print(f"⚠️  A tabela {table_name} já existe")
            return True
        elif error_code == 'AccessDeniedException':
            print(f"❌ Erro de permissão: {error_message}")
            print("   Verifique suas credenciais AWS e permissões DynamoDB")
        else:
            print(f"❌ Erro ao criar tabela: {error_code} - {error_message}")
        
        return False
        
    except Exception as e:
        print(f"❌ Erro inesperado: {str(e)}")
        return False


def delete_table(table_name: str, region: str = 'us-east-1') -> bool:
    """
    Remove a tabela DynamoDB (útil para desenvolvimento).
    
    Args:
        table_name: Nome da tabela a ser removida
        region: Região AWS onde está a tabela
        
    Returns:
        True se a tabela foi removida com sucesso, False caso contrário
    """
    try:
        dynamodb = boto3.client('dynamodb', region_name=region)
        
        print(f"🗑️  Removendo tabela: {table_name}")
        dynamodb.delete_table(TableName=table_name)
        
        print("⏳ Aguardando remoção da tabela...")
        waiter = dynamodb.get_waiter('table_not_exists')
        waiter.wait(TableName=table_name)
        
        print(f"✅ Tabela {table_name} removida com sucesso!")
        return True
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        
        if error_code == 'ResourceNotFoundException':
            print(f"⚠️  A tabela {table_name} não existe")
            return True
        else:
            print(f"❌ Erro ao remover tabela: {error_code} - {error_message}")
        
        return False
        
    except Exception as e:
        print(f"❌ Erro inesperado: {str(e)}")
        return False


def main():
    """Função principal do script."""
    parser = argparse.ArgumentParser(
        description='Gerenciar tabela DynamoDB do sistema de fila de restaurante'
    )
    
    parser.add_argument(
        '--stage',
        default='dev',
        choices=['dev', 'prod'],
        help='Ambiente de deploy (padrão: dev)'
    )
    
    parser.add_argument(
        '--region',
        default='us-east-1',
        help='Região AWS (padrão: us-east-1)'
    )
    
    parser.add_argument(
        '--delete',
        action='store_true',
        help='Remover a tabela ao invés de criar'
    )
    
    parser.add_argument(
        '--service-name',
        default='restaurant-queue-system',
        help='Nome do serviço (padrão: restaurant-queue-system)'
    )
    
    args = parser.parse_args()
    
    # Gerar nome da tabela baseado no padrão do Serverless
    table_name = f"{args.service_name}-{args.stage}"
    
    print("=" * 60)
    print("🍽️  Sistema de Fila de Restaurante - Gerenciador de Tabela")
    print("=" * 60)
    print()
    
    if args.delete:
        success = delete_table(table_name, args.region)
    else:
        success = create_queue_table(table_name, args.region)
    
    if not success:
        print("\n❌ Operação falhou!")
        sys.exit(1)
    
    print(f"\n✅ Operação concluída com sucesso!")
    print(f"   Tabela: {table_name}")
    print(f"   Região: {args.region}")
    
    if not args.delete:
        print(f"\n📝 Para usar esta tabela em suas funções Lambda:")
        print(f"   TABLE_NAME={table_name}")
        print(f"   AWS_DEFAULT_REGION={args.region}")


if __name__ == '__main__':
    main()
