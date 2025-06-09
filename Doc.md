# Documentazione Tecnica - Artigianato Online 2.0

## 📑 Indice
1. [Architettura del Sistema](#1-architettura-del-sistema)
2. [Configurazione e Setup](#2-configurazione-e-setup)
3. [Database](#3-database)
4. [API e Endpoints](#4-api-e-endpoints)
5. [Frontend](#5-frontend)
6. [Testing](#6-testing)
7. [Deployment](#7-deployment)
8. [Sicurezza](#8-sicurezza)
9. [Manutenzione](#9-manutenzione)

## 1. Architettura del Sistema

### 1.1 Stack Tecnologico

#### Frontend
- **HTML5/CSS3**: Struttura e stile delle pagine
- **JavaScript ES6+**: Logica client-side e interazioni
- **Bootstrap 5.3.3**: Framework UI responsive
- **Font Awesome 6**: Icone e elementi grafici

#### Backend
- **Node.js 18.x**: Runtime JavaScript
- **Express.js 4.x**: Framework web
- **PostgreSQL 15+**: Database relazionale
- **JWT**: Gestione autenticazione

#### Development Tools
- **Jest**: Testing framework
- **Docker**: Containerizzazione
- **Git**: Versioning
- **npm**: Package management

### 1.2 Struttura del Progetto
```
artigianato-online-2/
├── config/                 # Configurazioni ambiente
│   └── test.js             # Config test 
├── db/                     # Database 
│   ├── db.js
│   ├── pool.js  
│   ├── seed.js
│   └── tables.sql
├── jobs/                   # Job scheduling 
│   ├── index.js
│   └── orderStatusUpdater.js
├── middleware/             # Middleware Express (esiste)
│   └── auth.js             # Autenticazione
├── public/
│   ├── css/
│   │   ├── admin.css
│   │   ├── catalog.css 
│   │   ├── dashboard.css
│   │   ├── index.css
│   │   ├── login.css
│   │   ├── signup.css
│   │   └── style.css
│   ├── js/
│   │   ├── services/
│   │   │   └── AuthService.js
│   │   ├── admin.js
│   │   ├── cart.js
│   │   ├── catalog.js
│   │   ├── dashboard.js
│   │   ├── index.js
│   │   ├── login.js
│   │   ├── main.js
│   │   ├── profile.js
│   │   ├── resetpass.js
│   │   └── signup.js
│   ├── assets/
│   │   ├── images/
│   │   │   └── default/
│   │   │       ├── artisan-default.jpg
│   │   │       ├── product.jpg
│   │   │       └── user-default.jpg
|   ├── components/
|   │   ├── footer.html      
|   │   └── navbar.html      
│   ├── admin.html
│   ├── cart.html  
│   ├── catalog.html
│   ├── dashboard.html
│   ├── index.html
│   ├── login.html
│   ├── profile.html
│   ├── resetPass.html
│   └── signup.html
├── routes/              # API routes 
│   ├── admin.js
│   ├── auth.js
│   ├── cart.js
│   ├── index.js
│   ├── orders.js
│   ├── products.js
│   ├── reports.js
│   ├── reviews.js
│   └── users.js
├── services/            # Business logic 
│   └── emailService.js
├── tests/              # Test suite
│   ├── db-init.js
│   ├── setup.js
│   ├── setupAfterEnv.js
│   └── test-seed.sql
├── .dockerignore     
├── .env              
├── .env.example      
├── .gitignore        
├── app.js            
├── babel.config.js   
├── docker-compose.yml
├── Dockerfile        
├── jest.config.js    
├── LICENSE.md        
├── package.json      
├── package-lock.json 
└── README.md         
```

## 2. Configurazione e Setup

### 2.1 Requisiti di Sistema

#### Software Obbligatorio
- Node.js v18.x o superiore
- PostgreSQL v15.x o superiore
- npm v9.x o superiore
- Git

#### Software Opzionale
- Docker v24.x e Docker Compose v3.8 (per containerizzazione)
- VS Code (IDE raccomandato)

#### Hardware Minimo
- CPU: 2+ core
- RAM: 4GB
- Storage: 1GB libero

#### Sistemi Operativi Supportati
- Windows 10/11
- Linux (Ubuntu 20.04+)
- macOS Catalina+

### 2.2 Setup Iniziale

#### 1. Clone Repository
```bash
# Clone del repository
git clone https://github.com/yourusername/artigianato-online-2.git
cd artigianato-online-2

# Installazione dipendenze
npm install
```

#### 2. Configurazione Ambiente
```bash
# Copia il file di esempio
copy .env.example .env   # Windows
cp .env.example .env     # Linux/MacOS
```

Configura le seguenti variabili in `.env`:
```properties
# Server
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=artigianato_online
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRE=24h

# Email (Gmail)
EMAIL_USER=your.email@gmail.com
EMAIL_APP_PASSWORD=your_app_password
APP_URL=http://localhost:3000
```

#### 3. Setup Database

```bash
# Accedi a PostgreSQL
psql -U postgres

# Crea database
CREATE DATABASE artigianato_online;

# Esci da psql
\q

# Inizializza schema e dati
npm run db:init     # Crea le tabelle
npm run db:seed     # Popola i dati iniziali
```

### 2.3 Avvio Applicazione

#### Modalità Sviluppo
```bash
# Avvio con nodemon (auto-reload)
npm run dev
```

#### Modalità Produzione
```bash
# Avvio standard
npm start
```

#### Utilizzo Docker
```bash
# Build e avvio con Docker Compose
docker-compose up --build

# Stop container
docker-compose down
```

### 2.4 Script Disponibili

```json
{
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js",
    "test:setup": "node tests/db-init.js",
    "test": "cross-env NODE_ENV=test jest --detectOpenHandles --forceExit",
    "test:watch": "cross-env NODE_ENV=test jest --watch",
    "test:coverage": "cross-env NODE_ENV=test jest --coverage",
    "test:unit": "cross-env NODE_ENV=test jest tests/unit",
    "test:integration": "cross-env NODE_ENV=test jest tests/integration"
  }
}
```

### 2.5 Verifica Installazione

1. **Server**: 
   - Accedi a `http://localhost:3000`
   - Dovresti vedere la homepage

2. **Database**:
```bash
psql -U postgres -d artigianato_online -c "\dt"
# Dovrebbe mostrare la lista delle tabelle
```

3. **API**:
```bash
curl http://localhost:3000/products
# Dovrebbe restituire la lista dei prodotti
```

### 2.6 Troubleshooting

#### Errori Database
```bash
# Errore: database "artigianato_online" does not exist
psql -U postgres -c "CREATE DATABASE artigianato_online;"

# Errore: role "postgres" does not exist
sudo -u postgres createuser -s $USER
```

#### Errori Node.js
```bash
# Errore: nodemon not found
npm install -g nodemon

# Errore: module not found
npm install
```

#### Errori Docker
```bash
# Errore: port is already allocated
docker-compose down
netstat -ano | findstr :3000    # Windows
lsof -i :3000                   # Linux/MacOS
```

### 2.7 Note di Sicurezza

1. **Variabili d'Ambiente**
   - Non committare mai `.env`
   - Usa password complesse
   - Cambia `JWT_SECRET` in produzione

2. **Database**
   - Usa utenti con privilegi limitati
   - Abilita SSL in produzione
   - Backup regolari

3. **API**
   - Rate limiting in produzione
   - HTTPS obbligatorio
   - Validazione input


# Database Documentation - Artigianato Online 2.0

## Indice
1. [Schema Database](#schema-database)
2. [Gestione Connessioni](#gestione-connessioni)
3. [Backup e Manutenzione](#backup-e-manutenzione)
4. [Query Comuni](#query-comuni)

## Schema Database

### Autenticazione e Utenti

```sql
-- Ruoli sistema
CREATE TABLE ruoli (
    ruolo_id SERIAL PRIMARY KEY,
    nome_ruolo VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Utenti sistema
CREATE TABLE utente (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    cognome VARCHAR(100) NOT NULL,
    numero_telefono VARCHAR(20),
    indirizzo TEXT,
    citta VARCHAR(100),
    ruolo_id INTEGER NOT NULL REFERENCES ruoli(ruolo_id),
    stato VARCHAR(20) DEFAULT 'attivo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT utente_stato_check CHECK (stato IN ('attivo', 'sospeso'))
);

-- Profili artigiani
CREATE TABLE artigiani (
    artigiano_id INTEGER PRIMARY KEY REFERENCES utente(id),
    tipologia_id INTEGER REFERENCES tipologia(tipologia_id),
    iban VARCHAR(27) NOT NULL,
    p_iva VARCHAR(11),
    immagine TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Prodotti e Catalogo

```sql
-- Categorie prodotti
CREATE TABLE tipologia (
    tipologia_id SERIAL PRIMARY KEY,
    nome_tipologia VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prodotti
CREATE TABLE prodotti (
    prodotto_id SERIAL PRIMARY KEY,
    nome_prodotto VARCHAR(100) NOT NULL,
    descrizione TEXT,
    prezzo DECIMAL(10,2) NOT NULL CHECK (prezzo > 0),
    quantita INTEGER NOT NULL DEFAULT 0 CHECK (quantita >= 0),
    immagine TEXT,
    artigiano_id INTEGER NOT NULL REFERENCES artigiani(artigiano_id),
    tipologia_id INTEGER REFERENCES tipologia(tipologia_id),
    stato VARCHAR(20) DEFAULT 'disponibile',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT prodotti_stato_check CHECK (stato IN ('disponibile', 'esaurito', 'nascosto'))
);
```

### Ordini e Transazioni

```sql
-- Carrello
CREATE TABLE carrello (
    carrello_id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES utente(id),
    prodotto_id INTEGER NOT NULL REFERENCES prodotti(prodotto_id),
    quantita INTEGER NOT NULL CHECK (quantita > 0),
    prezzo_unitario DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ordini
CREATE TABLE ordini (
    ordine_id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES utente(id),
    data_ordine TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    stato VARCHAR(20) NOT NULL DEFAULT 'in preparazione',
    totale DECIMAL(10,2) NOT NULL,
    has_reports BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ordini_stato_check CHECK (
        stato IN ('in preparazione', 'spedito', 'consegnato', 'annullato', 'controversia')
    )
);

-- Dettagli ordine
CREATE TABLE dettagli_ordine (
    ordine_id INTEGER REFERENCES ordini(ordine_id),
    prodotto_id INTEGER REFERENCES prodotti(prodotto_id),
    quantita INTEGER NOT NULL CHECK (quantita > 0),
    prezzo_unitario DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ordine_id, prodotto_id)
);
```

### Recensioni e Segnalazioni

```sql
-- Recensioni
CREATE TABLE recensioni (
    recensione_id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES utente(id),
    artigiano_id INTEGER NOT NULL REFERENCES artigiani(artigiano_id),
    valutazione INTEGER NOT NULL CHECK (valutazione BETWEEN 1 AND 5),
    descrizione TEXT,
    stato VARCHAR(20) DEFAULT 'attiva',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT recensioni_stato_check CHECK (stato IN ('attiva', 'nascosta'))
);

-- Segnalazioni
CREATE TABLE segnalazioni (
    segnalazione_id SERIAL PRIMARY KEY,
    utente_segnalatore_id INTEGER NOT NULL REFERENCES utente(id),
    ordine_id INTEGER REFERENCES ordini(ordine_id),
    recensione_id INTEGER REFERENCES recensioni(recensione_id),
    motivazione VARCHAR(100) NOT NULL,
    descrizione TEXT,
    stato VARCHAR(20) DEFAULT 'in attesa',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT segnalazioni_stato_check CHECK (stato IN ('in attesa', 'in revisione', 'risolta'))
);
```

## Gestione Connessioni

### Pool Configuration

```javascript
// filepath: c:\Users\fratt\Documents\GitHub\artigianato-online-2\db\pool.js
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20,                     // max numero clients nel pool
    idleTimeoutMillis: 30000,    // timeout client inattivo
    connectionTimeoutMillis: 2000 // timeout connessione
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect()
};
```

## Backup e Manutenzione

### Comandi Backup

```bash
# Backup completo
pg_dump -U postgres -F c -b -v -f "%DATE%_full_backup.sql" artigianato_online

# Backup schema
pg_dump -U postgres -s -f "schema_backup.sql" artigianato_online

# Backup dati
pg_dump -U postgres -a -f "data_backup.sql" artigianato_online
```

### Comandi Restore

```bash
# Restore completo
psql -U postgres -d artigianato_online -f backup.sql

# Restore schema
psql -U postgres -d artigianato_online -f schema_backup.sql

# Restore dati
psql -U postgres -d artigianato_online -f data_backup.sql
```

### Manutenzione

```sql
-- Analizza performance
ANALYZE;

-- Ricostruisci indici
REINDEX DATABASE artigianato_online;

-- Pulizia spazio
VACUUM FULL;

-- Verifica connessioni
SELECT * FROM pg_stat_activity;
```

## Query Comuni

### Prodotti e Artigiani

```sql
-- Prodotti per artigiano
SELECT p.*, u.nome, u.cognome
FROM prodotti p
JOIN artigiani a ON p.artigiano_id = a.artigiano_id
JOIN utente u ON a.artigiano_id = u.id
WHERE a.artigiano_id = $1;

-- Catalogo completo
SELECT p.*, t.nome_tipologia, u.nome, u.cognome
FROM prodotti p
JOIN tipologia t ON p.tipologia_id = t.tipologia_id
JOIN artigiani a ON p.artigiano_id = a.artigiano_id
JOIN utente u ON a.artigiano_id = u.id
WHERE p.stato = 'disponibile';
```

### Ordini e Carrello

```sql
-- Dettagli ordine completi
SELECT o.*, do.*, p.nome_prodotto
FROM ordini o
JOIN dettagli_ordine do ON o.ordine_id = do.ordine_id
JOIN prodotti p ON do.prodotto_id = p.prodotto_id
WHERE o.ordine_id = $1;

-- Carrello utente
SELECT c.*, p.nome_prodotto, p.immagine
FROM carrello c
JOIN prodotti p ON c.prodotto_id = p.prodotto_id
WHERE c.cliente_id = $1;
```



# API Documentation - Artigianato Online 2.0

## 📑 Indice
1. [Overview](#overview)
2. [Autenticazione](#autenticazione)
3. [Endpoints](#endpoints)
4. [Response Format](#response-format)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)

## Overview

- Base URL: `http://localhost:3000` (development)
- API Version: v1
- Content-Type: `application/json`

### Authentication
Protected routes require JWT token in header:
```http
Authorization: Bearer <token>
```

### Common Parameters
- `page`: Numero pagina (default: 1)
- `limit`: Elementi per pagina (default: 20)
- `sort`: Campo ordinamento
- `order`: Direzione ordinamento (asc/desc)

## Endpoints

### 🔐 Autenticazione

#### `POST /auth/signup`
Registrazione nuovo utente.

**Request Body:**
```json
{
  "nome_utente": "string",
  "email": "string",
  "password": "string",
  "nome": "string",
  "cognome": "string",
  "numero_telefono": "string?",
  "indirizzo": "string?",
  "citta": "string?",
  "isArtigiano": "boolean",
  "iban": "string?",
  "tipologia_id": "number?"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "number",
      "nome_utente": "string",
      "email": "string",
      "ruolo": "string"
    },
    "token": "string"
  }
}
```

### 📦 Gestione Prodotti

#### `GET /products`
Lista prodotti con filtri opzionali.

**Query Parameters:**
```javascript
{
  page?: number,      // Default: 1
  limit?: number,     // Default: 20
  categoria?: number, // ID categoria
  search?: string,    // Termine ricerca
  prezzo_min?: number,
  prezzo_max?: number,
  artigiano_id?: number
}
```

#### `POST /products`
Crea nuovo prodotto (richiede autenticazione artigiano).

**Request Body:**
```json
{
  "nome_prodotto": "string",
  "descrizione": "string",
  "prezzo": "number",
  "quantita": "number",
  "tipologia_id": "number",
  "immagine": "File?"
}
```

### 🛒 Gestione Carrello

#### `GET /cart`
Recupera contenuto carrello utente.

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "prodotto_id": "number",
        "nome": "string",
        "quantita": "number",
        "prezzo": "number",
        "totale": "number"
      }
    ],
    "totale_carrello": "number"
  }
}
```

#### `POST /cart/add`
Aggiunge prodotto al carrello.

**Request Body:**
```json
{
  "prodotto_id": "number",
  "quantita": "number"
}
```

### 📋 Gestione Ordini

#### `GET /orders`
Lista ordini utente.

**Query Parameters:**
```javascript
{
  page?: number,     // Default: 1
  limit?: number,    // Default: 20
  stato?: string,    // Filtro stato
  data_inizio?: string, // Format: YYYY-MM-DD
  data_fine?: string    // Format: YYYY-MM-DD
}
```

#### `POST /orders`
Crea nuovo ordine.

**Request Body:**
```json
{
  "indirizzo_spedizione": "string?",
  "note": "string?"
}
```

### ⭐ Recensioni

#### `POST /reviews`
Crea nuova recensione.

**Request Body:**
```json
{
  "artigiano_id": "number",
  "valutazione": "number",
  "descrizione": "string"
}
```

### ⚠️ Segnalazioni

#### `POST /reports/order`
Segnala ordine.

**Request Body:**
```json
{
  "ordine_id": "number",
  "motivazione": "string",
  "descrizione": "string"
}
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": "any",
  "message": "string?"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "string",
    "message": "string",
    "details": "any?"
  }
}
```

## Error Handling

| Status Code | Description           |
|-------------|-----------------------|
| 200         | Success              |
| 201         | Created              |
| 400         | Bad Request          |
| 401         | Unauthorized         |
| 403         | Forbidden            |
| 404         | Not Found            |
| 429         | Too Many Requests    |
| 500         | Internal Server Error |

## Rate Limiting

- **Anonymous**: 100 requests/15min
- **Authenticated**: 1000 requests/15min
- **Admin**: 5000 requests/15min

Headers:
```http
X-RateLimit-Limit: <max-requests>
X-RateLimit-Remaining: <requests-remaining>
X-RateLimit-Reset: <timestamp>
```

## 5. Frontend

### 5.1 Stack Tecnologico
- **HTML5/CSS3**: Struttura e stili base
- **JavaScript ES6+**: Logica client-side
- **Bootstrap 5.3.3**: Framework UI responsive
- **Font Awesome 6**: Iconografia

### 5.2 Struttura Pagine

#### Layout Base
```html
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Artigianato Online</title>
    <!-- CSS -->
    <link href="css/style.css" rel="stylesheet">
    <link href="css/[page].css" rel="stylesheet">
    <!-- Bootstrap -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    <!-- Navbar -->
    <div id="navbar-placeholder"></div>

    <!-- Content -->
    <main class="container py-4">
        <!-- Page specific content -->
    </main>

    <!-- Footer -->
    <div id="footer-placeholder"></div>

    <!-- Scripts -->
    <script src="js/main.js"></script>
    <script src="js/[page].js"></script>
</body>
</html>
```

### 5.3 Moduli JavaScript

#### Core Modules

##### AuthService.js
```javascript
class AuthService {
    static async login(credentials) {
        // Gestione login
    }

    static async logout() {
        // Gestione logout
    }

    static isAuthenticated() {
        // Verifica autenticazione
    }
}
```

##### ApiService.js
```javascript
class ApiService {
    static async get(endpoint, params = {}) {
        // Implementazione GET
    }

    static async post(endpoint, data = {}) {
        // Implementazione POST
    }
}
```

### 5.4 Stili CSS

#### Variabili Globali
```css
:root {
    /* Palette Colori */
    --palette-primary: #007bff;
    --palette-secondary: #6c757d;
    --palette-success: #28a745;
    --palette-warning: #ffc107;
    --palette-danger: #dc3545;
    
    /* Typography */
    --font-primary: 'Roboto', sans-serif;
    --font-secondary: 'Open Sans', sans-serif;
    
    /* Spacing */
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --spacing-lg: 1.5rem;
    --spacing-xl: 2rem;
}
```

### 5.5 Componenti Riutilizzabili

#### Navbar
```html
<nav class="navbar navbar-expand-lg navbar-light bg-light">
    <div class="container">
        <a class="navbar-brand" href="/">Artigianato Online</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse">
            <span class="navbar-toggler-icon"></span>
        </button>
        <!-- Navigation items -->
    </div>
</nav>
```

#### Loading Spinner
```html
<div class="spinner-container">
    <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Caricamento...</span>
    </div>
</div>
```

### 5.6 Gestione Eventi

#### Event Handlers
```javascript
// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    loadComponents();
    setupEventListeners();
});

// Infinite Scroll
window.addEventListener('scroll', () => {
    if (isNearBottom()) {
        loadMoreProducts();
    }
});
```

### 5.7 Form Validation
```javascript
function validateForm(formData) {
    const errors = [];
    
    // Validazione campi
    if (!formData.email || !isValidEmail(formData.email)) {
        errors.push('Email non valida');
    }
    
    if (!formData.password || formData.password.length < 8) {
        errors.push('Password troppo corta');
    }
    
    return errors;
}
```

### 5.8 Responsive Design

#### Breakpoints
```css
/* Mobile First */
@media (min-width: 576px) { /* Small devices */ }
@media (min-width: 768px) { /* Medium devices */ }
@media (min-width: 992px) { /* Large devices */ }
@media (min-width: 1200px) { /* Extra large devices */ }
```

## 6. Testing

### 6.1 Configurazione Jest

#### Setup Base
```javascript
// filepath: c:\Users\fratt\Documents\GitHub\artigianato-online-2\jest.config.js
module.exports = {
    testEnvironment: 'node',
    setupFiles: ['<rootDir>/tests/setup.js'],
    setupFilesAfterEnv: ['<rootDir>/tests/setupAfterEnv.js'],
    testMatch: ['**/tests/**/*.test.js'],
    collectCoverageFrom: [
        'routes/**/*.js',
        'services/**/*.js',
        'middleware/**/*.js'
    ],
    coverageDirectory: 'coverage',
    verbose: true
};
```


## 7. Deployment

### 7.1 Docker

#### Dockerfile Base
```dockerfile
// filepath: c:\Users\fratt\Documents\GitHub\artigianato-online-2\Dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Bundle app source
COPY . .

# Set environment
ENV NODE_ENV=production

# Create non-root user
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["npm", "start"]
```

#### .dockerignore
```ignore
// filepath: c:\Users\fratt\Documents\GitHub\artigianato-online-2\.dockerignore
# Dependencies
node_modules
npm-debug.log

# Development
.git
.gitignore
.env
.env.*
*.md
tests/
docs/
coverage/

# OS files
.DS_Store
Thumbs.db

# Logs
*.log
logs/
```

### 7.2 Docker Compose

#### Development Environment
```yaml
// filepath: c:\Users\fratt\Documents\GitHub\artigianato-online-2\docker-compose.yml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DB_HOST=db
      - DB_PORT=5432
      - DB_NAME=${DB_NAME}
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - APP_URL=http://localhost:3000
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      db:
        condition: service_healthy
    command: npm run dev

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=${DB_NAME}
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### 7.3 Comandi Deployment

#### Ambiente Sviluppo
```bash
# Build e avvio ambiente
docker-compose up --build

# Avvio in background
docker-compose up -d

# Visualizza logs in tempo reale
docker-compose logs -f
```

### Gestione Servizi
```bash
# Stop tutti i servizi
docker-compose down

# Ricostruzione servizio web
docker-compose up -d --no-deps --build web

# Restart singolo servizio
docker-compose restart web
```


## 8. Sicurezza

### 8.1 Autenticazione JWT

#### Middleware Autenticazione
```javascript
function createAuthMiddleware() {
    return async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false, 
                    message: 'Autenticazione richiesta'
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            req.user = {
                id: decoded.id,
                username: decoded.username,
                ruolo_id: decoded.ruolo_id
            };
            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Sessione scaduta'
                });
            }
            return res.status(401).json({
                success: false, 
                message: 'Token non valido'
            });
        }
    };
}
```

#### Client-side AuthService
```javascript
// filepath: c:\Users\fratt\Documents\GitHub\artigianato-online-2\public\js\services\AuthService.js
class AuthService {
    static setSession(token, user) {
        sessionStorage.setItem('token', token);
        sessionStorage.setItem('user', JSON.stringify(user));
        sessionStorage.setItem('auth_time', new Date().getTime());
    }

    static async fetchWithAuth(url, options = {}) {
        const token = this.getToken();
        if (!token) {
            this.handleAuthError();
            return null;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401) {
                this.showSessionExpiredModal();
                return null;
            }

            return response;
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }
}

```
