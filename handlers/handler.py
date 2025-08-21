# handlers/queue.py - Funções Lambda para gerenciar fila

import json
import boto3
import os
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
import random

# Configuração
dynamodb = boto3.resource('dynamodb')
TABLE_NAME = os.environ.get('TABLE_NAME')
table = dynamodb.Table(TABLE_NAME)

# Helper para converter Decimal do DynamoDB para JSON
def decimal_default(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError

# Headers CORS padrão
def get_headers():
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
    }

def create(event, context):
    """Adicionar cliente à fila"""
    try:
        body = json.loads(event['body'])
        
        # Validação básica
        if not all(k in body for k in ['customerName', 'partySize', 'phoneNumber']):
            return {
                'statusCode': 400,
                'headers': get_headers(),
                'body': json.dumps({'error': 'Campos obrigatórios: customerName, partySize, phoneNumber'})
            }
        
        # Criar entrada
        now = datetime.utcnow()
        queue_entry = {
            'id': str(uuid.uuid4()),
            'queueNumber': f"Q{now.strftime('%H%M')}-{random.randint(100,999)}",
            'customerName': body['customerName'],
            'partySize': int(body['partySize']),
            'phoneNumber': body['phoneNumber'],
            'specialRequest': body.get('specialRequest', ''),
            'status': 'waiting',
            'checkInTime': now.isoformat(),
            'estimatedWaitTime': calculate_wait_time(int(body['partySize'])),
            'createdAt': now.isoformat(),
            'updatedAt': now.isoformat(),
            'ttl': int((now + timedelta(days=30)).timestamp())  # Auto-delete após 30 dias
        }
        
        # Salvar no DynamoDB
        table.put_item(Item=queue_entry)
        
        return {
            'statusCode': 201,
            'headers': get_headers(),
            'body': json.dumps({
                'message': 'Cliente adicionado à fila com sucesso!',
                'data': queue_entry
            }, default=decimal_default)
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_headers(),
            'body': json.dumps({'error': 'Erro interno do servidor'})
        }

def list(event, context):
    """Listar clientes na fila"""
    try:
        # Parâmetros opcionais
        params = event.get('queryStringParameters') or {}
        status_filter = params.get('status')
        limit = int(params.get('limit', 50))
        
        # Buscar dados
        if status_filter:
            # Usar índice secundário se filtrar por status
            response = table.query(
                IndexName='StatusIndex',
                KeyConditionExpression='#status = :status',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={':status': status_filter},
                Limit=limit
            )
        else:
            # Scan completo
            response = table.scan(Limit=limit)
        
        items = response.get('Items', [])
        
        # Ordenar por horário de check-in
        items.sort(key=lambda x: x.get('checkInTime', ''))
        
        # Calcular estatísticas
        waiting = [i for i in items if i.get('status') == 'waiting']
        seated = [i for i in items if i.get('status') == 'seated']
        
        stats = {
            'totalWaiting': len(waiting),
            'totalSeated': len(seated),
            'averageWaitTime': sum(i.get('estimatedWaitTime', 0) for i in waiting) / len(waiting) if waiting else 0
        }
        
        return {
            'statusCode': 200,
            'headers': get_headers(),
            'body': json.dumps({
                'data': items,
                'statistics': stats,
                'count': len(items)
            }, default=decimal_default)
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_headers(),
            'body': json.dumps({'error': 'Erro ao buscar fila'})
        }

def update(event, context):
    """Atualizar status do cliente"""
    try:
        queue_id = event['pathParameters']['id']
        body = json.loads(event['body'])
        
        # Preparar atualização
        update_expr = "SET updatedAt = :now"
        expr_values = {':now': datetime.utcnow().isoformat()}
        
        if 'status' in body:
            update_expr += ", #status = :status"
            expr_values[':status'] = body['status']
            
            # Se foi atendido, registrar horário
            if body['status'] == 'seated':
                update_expr += ", seatedTime = :seated"
                expr_values[':seated'] = datetime.utcnow().isoformat()
        
        # Atualizar no DynamoDB
        response = table.update_item(
            Key={'id': queue_id},
            UpdateExpression=update_expr,
            ExpressionAttributeNames={'#status': 'status'} if 'status' in body else {},
            ExpressionAttributeValues=expr_values,
            ReturnValues='ALL_NEW'
        )
        
        return {
            'statusCode': 200,
            'headers': get_headers(),
            'body': json.dumps({
                'message': 'Status atualizado com sucesso!',
                'data': response['Attributes']
            }, default=decimal_default)
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_headers(),
            'body': json.dumps({'error': 'Erro ao atualizar'})
        }

def delete(event, context):
    """Remover cliente da fila"""
    try:
        queue_id = event['pathParameters']['id']
        
        # Deletar do DynamoDB
        table.delete_item(Key={'id': queue_id})
        
        return {
            'statusCode': 200,
            'headers': get_headers(),
            'body': json.dumps({
                'message': 'Cliente removido da fila',
                'deletedId': queue_id
            })
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_headers(),
            'body': json.dumps({'error': 'Erro ao remover'})
        }

def calculate_wait_time(party_size):
    """Calcular tempo estimado de espera"""
    base_time = 15
    size_factor = 1.5 if party_size > 4 else 1.2 if party_size > 2 else 1.0
    random_factor = random.randint(0, 10)
    return int(base_time * size_factor + random_factor)
