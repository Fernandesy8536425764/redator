#!/bin/bash

echo "Iniciando Redator API..."

# Verificar se virtualenv existe
if [ ! -d "venv" ]; then
    echo "Criando ambiente virtual..."
    python3 -m venv venv
fi

# Ativar virtualenv
source venv/bin/activate

# Instalar dependências
echo "Instalando dependências..."
pip install -r requirements.txt

# Criar banco de dados (se não existir)
echo "Verificando banco de dados..."

# Iniciar servidor
echo "Iniciando servidor em http://localhost:8000"
echo "Documentação disponível em http://localhost:8000/docs"
echo ""
echo "Pressione CTRL+C para parar"
python main.py
