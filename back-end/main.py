from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import List

import models
import schemas
import auth
from database import engine, get_db
from auth import (
    authenticate_user, 
    create_access_token, 
    create_user, 
    get_current_active_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

# Criar tabelas
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Redator API",
    description="API para o Redator de Novelas - Persistência de documentos e autenticação",
    version="1.0.0"
)

# CORS para permitir requisições do front-end
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especifique o domínio
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== AUTH ROUTES ====================

@app.post("/auth/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = auth.get_user(db, username=user.username)
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="Username já cadastrado"
        )
    
    db_email = db.query(models.User).filter(models.User.email == user.email).first()
    if db_email:
        raise HTTPException(
            status_code=400,
            detail="Email já cadastrado"
        )
    
    return create_user(db=db, user=user)

@app.post("/auth/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/me", response_model=schemas.UserResponse)
def read_users_me(current_user: schemas.UserResponse = Depends(get_current_active_user)):
    return current_user

# ==================== DOCUMENT ROUTES ====================

@app.post("/documents", response_model=schemas.DocumentResponse)
def create_document(
    document: schemas.DocumentCreate,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_active_user)
):
    db_document = models.Document(
        **document.model_dump(),
        owner_id=current_user.id
    )
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    return db_document

@app.get("/documents", response_model=List[schemas.DocumentResponse])
def read_documents(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_active_user)
):
    documents = db.query(models.Document).filter(
        models.Document.owner_id == current_user.id
    ).offset(skip).limit(limit).all()
    return documents

@app.get("/documents/{document_id}", response_model=schemas.DocumentResponse)
def read_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_active_user)
):
    document = db.query(models.Document).filter(
        models.Document.id == document_id,
        models.Document.owner_id == current_user.id
    ).first()
    
    if document is None:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    
    return document

@app.put("/documents/{document_id}", response_model=schemas.DocumentResponse)
def update_document(
    document_id: int,
    document_update: schemas.DocumentUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_active_user)
):
    db_document = db.query(models.Document).filter(
        models.Document.id == document_id,
        models.Document.owner_id == current_user.id
    ).first()
    
    if db_document is None:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    
    for field, value in document_update.model_dump(exclude_unset=True).items():
        setattr(db_document, field, value)
    
    db.commit()
    db.refresh(db_document)
    return db_document

@app.delete("/documents/{document_id}")
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_active_user)
):
    db_document = db.query(models.Document).filter(
        models.Document.id == document_id,
        models.Document.owner_id == current_user.id
    ).first()
    
    if db_document is None:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    
    db.delete(db_document)
    db.commit()
    return {"message": "Documento deletado com sucesso"}

@app.post("/documents/save-or-update")
def save_or_update_document(
    document: schemas.DocumentCreate,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_active_user)
):
    """Salva novo documento ou atualiza existente baseado no título"""
    existing = db.query(models.Document).filter(
        models.Document.title == document.title,
        models.Document.owner_id == current_user.id
    ).first()
    
    if existing:
        # Atualizar existente
        for field, value in document.model_dump().items():
            setattr(existing, field, value)
        db.commit()
        db.refresh(existing)
        return {"message": "Documento atualizado", "document": existing}
    else:
        # Criar novo
        db_document = models.Document(
            **document.model_dump(),
            owner_id=current_user.id
        )
        db.add(db_document)
        db.commit()
        db.refresh(db_document)
        return {"message": "Documento criado", "document": db_document}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
