# Redator API - Back-end

API REST para o Redator de Novelas com persistência de documentos e autenticação de usuários.

## Funcionalidades

- **Autenticação JWT**: Login seguro com tokens
- **CRUD de Documentos**: Criar, ler, atualizar e deletar documentos
- **Persistência**: Salva tudo no banco de dados SQLite
- **Multi-usuário**: Cada usuário acessa apenas seus próprios documentos

## Instalação

```bash
cd back-end
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou: venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

## Executar

```bash
python main.py
```

API estará disponível em: `http://localhost:8000`

Documentação interativa: `http://localhost:8000/docs`

## Endpoints

### Autenticação

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/auth/register` | Criar nova conta |
| POST | `/auth/login` | Fazer login (retorna token) |
| GET | `/auth/me` | Dados do usuário logado |

### Documentos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/documents` | Criar novo documento |
| GET | `/documents` | Listar todos os documentos |
| GET | `/documents/{id}` | Obter documento específico |
| PUT | `/documents/{id}` | Atualizar documento |
| DELETE | `/documents/{id}` | Deletar documento |
| POST | `/documents/save-or-update` | Salvar ou atualizar (auto) |

## Exemplo de Uso

### Registrar usuário:
```bash
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username": "autor", "email": "autor@email.com", "password": "senha123"}'
```

### Login:
```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=autor&password=senha123"
```

### Criar documento (requer token):
```bash
curl -X POST "http://localhost:8000/documents" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Meu Romance", "content": "Era uma vez..."}'
```

## Integração com Front-end

1. Usuário faz login → recebe token JWT
2. Token é armazenado no localStorage
3. Cada requisição inclui o token no header `Authorization: Bearer {token}`
4. Documentos são salvos automaticamente no servidor
5. Ao abrir o site, documentos são carregados da nuvem
