# 🛠️ Artigianato Online 2.0

Piattaforma e-commerce che connette artigiani e acquirenti, facilitando la vendita di prodotti artigianali e la gestione di recensioni e segnalazioni.

## 📑 Indice
- [Funzionalità](#-funzionalità)
- [Tecnologie](#-tecnologie)
- [Requisiti](#-requisiti)
- [Installazione](#-installazione)
- [Database](#-database)
- [API](#-api)
- [Ruoli e Permessi](#-ruoli-e-permessi)

## 🎯 Funzionalità

### 👤 Area Clienti
- Registrazione e login
- Gestione profilo personale
- Visualizzazione catalogo prodotti
- Gestione carrello e ordini
- Invio recensioni e segnalazioni
- Recupero password

### 🎨 Area Artigiani
- Dashboard personalizzata
- Gestione catalogo prodotti
- Gestione ordini ricevuti
- Visualizzazione recensioni
- Statistiche vendite

### 👨‍💼 Area Amministrativa
- Gestione utenti
- Moderazione contenuti
- Gestione segnalazioni
- Monitoraggio piattaforma

## � Tecnologie

### Frontend
- HTML5 + CSS3
- JavaScript ES6+
- Bootstrap 5.3.3
- Font Awesome 6

### Backend
- Node.js 18.x
- Express.js 4.x
- PostgreSQL 15+
- JWT per autenticazione

## ⚙️ Requisiti

### Software
- Node.js (v18.x o superiore)
- PostgreSQL (v15+)
- npm (v9.x o superiore)

### Hardware Consigliato
- CPU: 2+ core
- RAM: 4GB minimo
- Spazio disco: 1GB libero

## 🚀 Installazione

1. **Clone Repository**
```bash
git clone https://github.com/yourusername/artigianato-online-2.git
cd artigianato-online-2
```

2. **Setup Ambiente**
```bash
# Installa dipendenze
npm install

# Copia file configurazione
cp .env.example .env

# Modifica variabili ambiente in .env
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=artigianato_online
JWT_SECRET=your_secret_key
```

3. **Database Setup**
```bash
# Crea database
psql -U postgres -c "CREATE DATABASE artigianato_online"

# Inizializza tabelle
npm run db:init

# Popola dati iniziali
npm run db:seed
```

4. **Avvio Applicazione**
```bash
# Ambiente sviluppo
npm run dev

# Ambiente produzione
npm start
```

## 📊 Database

### Schema Principale
```sql
-- Utenti e Ruoli
CREATE TABLE ruoli (
    ruolo_id SERIAL PRIMARY KEY,
    nome_ruolo VARCHAR(50) NOT NULL
);

CREATE TABLE utenti (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    email VARCHAR(100) UNIQUE,
    password VARCHAR(100),
    ruolo_id INTEGER REFERENCES ruoli(ruolo_id)
);

-- Prodotti e Categorie
CREATE TABLE prodotti (
    prodotto_id SERIAL PRIMARY KEY,
    nome VARCHAR(100),
    prezzo DECIMAL(10,2),
    artigiano_id INTEGER REFERENCES utenti(id)
);
```

### Backup/Restore
```bash
# Backup
pg_dump -U postgres artigianato_online > backup.sql

# Restore
psql -U postgres artigianato_online < backup.sql
```

## 🌐 API

### Autenticazione
```
POST /auth/login     - Login utente
POST /auth/signup    - Registrazione
POST /auth/reset     - Reset password
```

### Prodotti
```
GET    /products     - Lista prodotti
POST   /products     - Nuovo prodotto
PUT    /products/:id - Modifica prodotto
DELETE /products/:id - Elimina prodotto
```

### Ordini
```
GET    /orders      - Lista ordini
POST   /orders      - Nuovo ordine
GET    /orders/:id  - Dettagli ordine
```

## 👥 Ruoli e Permessi

### Cliente (ruolo_id: 1)
- Acquisto prodotti
- Gestione ordini personali
- Invio recensioni/segnalazioni

### Artigiano (ruolo_id: 2) 
- Gestione catalogo prodotti
- Gestione ordini ricevuti
- Visualizzazione recensioni

### Amministratore (ruolo_id: 3)
- Gestione utenti
- Moderazione contenuti
- Gestione segnalazioni

## 🔒 Sicurezza
- Autenticazione JWT
- Password hashate (bcrypt)
- Validazione input
- Protezione XSS/CSRF
- Rate limiting

## 📫 Contatti

Per supporto:
- Apri una issue su GitHub
- Email: support@artigianatoonline.com
- Documentazione: /docs

## 📄 Licenza

Questo progetto è rilasciato sotto licenza MIT - vedi [LICENSE.md](LICENSE.md)