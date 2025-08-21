# handlers/handler.py - Handler único consolidado para gerenciar fila

import json
import boto3
import os
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

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

# Handler principal que roteia baseado no método HTTP e path
def lambda_handler(event, context):
    """Handler único que gerencia todas as operações da fila"""
    try:
        http_method = event['httpMethod']
        path = event['path']
        
        # Roteamento baseado no método HTTP e path
        if http_method == 'OPTIONS':
            # Resposta para preflight CORS
            return {
                'statusCode': 200,
                'headers': get_headers(),
                'body': ''
            }
        elif http_method == 'POST' and path.endswith('/queue'):
            return create_queue_entry(event, context)
        elif http_method == 'GET' and path.endswith('/queue'):
            return list_queue_entries(event, context)
        elif http_method == 'PUT' and '/queue/' in path:
            return update_queue_entry(event, context)
        elif http_method == 'DELETE' and '/queue/' in path:
            return delete_queue_entry(event, context)
        else:
            return {
                'statusCode': 404,
                'headers': get_headers(),
                'body': json.dumps({'error': f'Rota não encontrada: {http_method} {path}'})
            }
            
    except Exception as e:
        print(f"Error in queue_handler: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_headers(),
            'body': json.dumps({'error': 'Erro interno do servidor'})
        }

def create_queue_entry(event, context):
    """Adicionar cliente à fila"""
    try:
        body = json.loads(event['body'])
        
        # Validação básica
        if not all(k in body for k in ['name', 'partySize']):
            return {
                'statusCode': 400,
                'headers': get_headers(),
                'body': json.dumps({'error': 'Campos obrigatórios: name, partySize'})
            }
        
        # Criar entrada
        now = datetime.utcnow()
        queue_entry = {
            'id': body.get('id', str(uuid.uuid4())),
            'name': body['name'],
            'partySize': int(body['partySize']),
            'phone': body.get('phone', ''),
            'status': 'waiting',  # Sempre inicia como 'waiting'
            'checkInTime': now.isoformat(),  # Sempre calculado no servidor
            'ttl': int((now + timedelta(days=30)).timestamp())  # TTL sempre calculado
        }
        
        # Salvar no DynamoDB
        table.put_item(Item=queue_entry)
        
        return {
            'statusCode': 201,
            'headers': get_headers(),
            'body': json.dumps(queue_entry, default=decimal_default)
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_headers(),
            'body': json.dumps({'error': 'Erro interno do servidor'})
        }

def list_queue_entries(event, context):
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
                'items': items,
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

def update_queue_entry(event, context):
    """Atualizar status do cliente"""
    try:
        queue_id = event['pathParameters']['id']
        body = json.loads(event['body'])
        
        # Preparar atualização
        update_expr = "SET "
        expr_values = {}
        expr_names = {}
        updates = []
        
        # Campos permitidos para atualização
        allowed_fields = ['name', 'phone', 'partySize', 'status']
        
        for field in allowed_fields:
            if field in body:
                if field == 'status':
                    updates.append("#status = :status")
                    expr_names['#status'] = 'status'
                    expr_values[':status'] = body[field]
                else:
                    updates.append(f"{field} = :{field}")
                    expr_values[f':{field}'] = body[field]
        
        if not updates:
            return {
                'statusCode': 400,
                'headers': get_headers(),
                'body': json.dumps({'error': 'Nenhum campo válido para atualização'})
            }
        
        update_expr += ", ".join(updates)
        
        # Atualizar no DynamoDB
        update_params = {
            'Key': {'id': queue_id},
            'UpdateExpression': update_expr,
            'ExpressionAttributeValues': expr_values,
            'ReturnValues': 'ALL_NEW'
        }
        
        if expr_names:
            update_params['ExpressionAttributeNames'] = expr_names
            
        response = table.update_item(**update_params)
        
        return {
            'statusCode': 200,
            'headers': get_headers(),
            'body': json.dumps(response['Attributes'], default=decimal_default)
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_headers(),
            'body': json.dumps({'error': 'Erro ao atualizar'})
        }

def delete_queue_entry(event, context):
    """Remover cliente da fila"""
    try:
        queue_id = event['pathParameters']['id']
        
        # Deletar do DynamoDB
        table.delete_item(Key={'id': queue_id})
        
        return {
            'statusCode': 200,
            'headers': get_headers(),
            'body': json.dumps({
                'success': True,
                'id': queue_id
            })
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_headers(),
            'body': json.dumps({'error': 'Erro ao remover'})
        }


