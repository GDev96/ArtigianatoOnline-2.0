# Documentazione Tecnica - Artigianato Online 2.0

## Indice
1. [Architettura Tecnica](#architettura-tecnica)
2. [Configurazione Ambiente](#configurazione-ambiente)
3. [Schema Database](#schema-database)
4. [Riferimenti API](#riferimenti-api)
5. [Testing](#testing)
6. [Configurazione Docker](#configurazione-docker)
7. [Deployment](#deployment)
8. [Risoluzione Problemi](#risoluzione-problemi)

## Architettura Tecnica

### Stack Tecnologico
- **Runtime**: Node.js v18.x LTS
- **Framework Web**: Express.js v4.x
- **Database**: PostgreSQL v15
- **Client Database**: node-postgres (pg) v8.x
- **Autenticazione**: JWT (jsonwebtoken v9.x)
- **Hashing Password**: bcrypt v5.x
- **Containerizzazione**: Docker & Docker Compose v3.8
- **Testing Framework**: Jest v29.x
- **Frontend**: 
  - HTML5/CSS3
  - Bootstrap v5.x
  - JavaScript ES6+ (Vanilla)

### Struttura del Progetto
```
artigianato-online-2/
├── config/
│   └── test.js               # Configurazione ambiente test
├── db/                       # Configurazione database
│   ├── pool.js               # Pool connessioni database (singleton)
│   ├── db.js                 # Connessione database
│   ├── seed.js               # Dati iniziali
│   └── tables.sql            # Schema database
├── jobs/                     # Job schedulati
│   ├── index.js
│   ├── orderStatusUpdater.js # Aggiornamento stato ordini
│   └── userSuspensionManager.js # Gestione sospensioni utenti
├── middleware/               # Middleware personalizzati
│   └── auth.js               # Middleware autenticazione
├── routes/                   # Route API
│   ├── admin.js              # Route amministrazione
│   ├── auth.js               # Route autenticazione
│   ├── cart.js               # Route carrello
│   ├── index.js              # Route principali
│   ├── orders.js             # Route ordini
│   ├── products.js           # Route prodotti
│   └── reports.js            # Route reporting
├── services/                 # Servizi business logic
│   └── emailService.js       # Servizio invio email
├── public/                   # File statici
│   ├── admin.html            # Pannello amministrazione
│   ├── cart.html             # Pagina carrello
│   ├── catalog.html          # Catalogo prodotti
│   ├── dashboard.html        # Dashboard utente
│   ├── index.html            # Homepage
│   ├── css/                  # File CSS
│   ├── js/                   # File JavaScript
│   └── images/
│        └── default/         # Immagini predefinite
├── tests/                    # File di test
│   ├── setup.js              # Configurazione test
│   ├── setupAfterEnv.js      # Hook ciclo vita test
│   ├── db-init.js            # Inizializzazione database test
│   └── integration/          # Test integrazione
├── .dockerignore             # File ignorati da Docker
├── .env.example              # Template variabili ambiente
├── .gitignore                # File ignorati da Git
├── Dockerfile                # Configurazione Docker
├── docker-compose.yml        # Configurazione Docker Compose sviluppo
├── docker-compose.prod.yml   # Configurazione Docker Compose produzione
├── package.json              # Dipendenze progetto
├── package-lock.json         # Lock file dipendenze
├── babel.config.js           # Configurazione Babel
├── jest.config.js            # Configurazione Jest
├── README.md                 # Documentazione progetto
└── app.js                    # File principale applicazione
```

## Configurazione Ambiente

### Prerequisiti di Sistema
- Node.js v18.x LTS
- PostgreSQL v15 o superiore
- npm v9.x o superiore
- Docker v24.x e Docker Compose v3.8
- Git (per clonazione repository)

### Installazione Locale
```bash
# Clonazione repository
git clone https://github.com/tuousername/artigianato-online-2.git
cd artigianato-online-2

# Installazione dipendenze
npm install

# Configurazione ambiente
cp .env.example .env
# Modificare .env con i valori appropriati

# Inizializzazione database
npm run db:setup
npm run db:seed

# Avvio applicazione sviluppo
npm run dev
```

### Variabili Ambiente
```env
# Configurazione server
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=artigianato_online
DB_USER=postgres
DB_PASSWORD=your_password

# Autenticazione
JWT_SECRET=your_super_secret_key_minimum_32_characters
JWT_EXPIRY=24h

# Email (opzionale per sviluppo)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minuti
RATE_LIMIT_MAX=100           # Richieste per finestra
```

## Schema Database

### Tabelle Principali

#### 1. Tabella Utenti
```sql
CREATE TABLE utente (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    cognome VARCHAR(100) NOT NULL,
    numero_telefono VARCHAR(20),
    indirizzo VARCHAR(255),
    citta VARCHAR(100),
    ruolo_id INTEGER REFERENCES ruoli(ruolo_id) NOT NULL,
    stato VARCHAR(20) DEFAULT 'attivo' CHECK (stato IN ('attivo', 'sospeso', 'disattivato')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indici per performance
CREATE INDEX idx_utente_email ON utente(email);
CREATE INDEX idx_utente_username ON utente(username);
CREATE INDEX idx_utente_ruolo ON utente(ruolo_id);
```

**Caratteristiche:**
- Gestisce tutti gli utenti del sistema
- Stati utente: 'attivo', 'sospeso', 'disattivato'
- Password crittografate con bcrypt (salt rounds: 12)
- Vincoli di unicità su username ed email
- Timestamp automatici per tracking modifiche

#### 2. Tabella Ruoli
```sql
CREATE TABLE ruoli (
    ruolo_id INTEGER PRIMARY KEY,
    nome_ruolo VARCHAR(50) UNIQUE NOT NULL,
    descrizione TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dati iniziali ruoli
INSERT INTO ruoli (ruolo_id, nome_ruolo, descrizione) VALUES
(1, 'cliente', 'Utente che può acquistare prodotti'),
(2, 'artigiano', 'Utente che può vendere prodotti'),
(3, 'admin', 'Amministratore del sistema');
```

#### 3. Tabella Artigiani
```sql
CREATE TABLE artigiani (
    artigiano_id INTEGER PRIMARY KEY REFERENCES utente(id) ON DELETE CASCADE,
    tipologia_id INTEGER REFERENCES tipologia(tipologia_id),
    iban VARCHAR(27) CHECK (LENGTH(iban) BETWEEN 15 AND 27),
    immagine VARCHAR(255),
    biografia TEXT,
    anni_esperienza INTEGER CHECK (anni_esperienza >= 0),
    verificato BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_artigiani_tipologia ON artigiani(tipologia_id);
```

#### 4. Tabella Prodotti
```sql
CREATE TABLE prodotti (
    prodotto_id SERIAL PRIMARY KEY,
    artigiano_id INTEGER REFERENCES artigiani(artigiano_id) ON DELETE CASCADE,
    nome_prodotto VARCHAR(100) NOT NULL,
    descrizione TEXT,
    prezzo DECIMAL(10,2) NOT NULL CHECK (prezzo > 0),
    quantita INTEGER NOT NULL DEFAULT 0 CHECK (quantita >= 0),
    tipologia_id INTEGER REFERENCES tipologia(tipologia_id),
    immagine VARCHAR(255),
    stato VARCHAR(20) DEFAULT 'disponibile' 
        CHECK (stato IN ('disponibile', 'esaurito', 'nascosto', 'eliminato')),
    peso_kg DECIMAL(5,2) CHECK (peso_kg > 0),
    dimensioni VARCHAR(50),
    materiali TEXT,
    tempo_produzione_giorni INTEGER CHECK (tempo_produzione_giorni > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint per disponibilità
    CONSTRAINT chk_disponibilita CHECK (
        (stato = 'disponibile' AND quantita > 0) OR 
        (stato != 'disponibile')
    )
);

-- Indici per performance
CREATE INDEX idx_prodotti_artigiano ON prodotti(artigiano_id);
CREATE INDEX idx_prodotti_tipologia ON prodotti(tipologia_id);
CREATE INDEX idx_prodotti_stato ON prodotti(stato);
CREATE INDEX idx_prodotti_prezzo ON prodotti(prezzo);
```

#### 5. Tabella Tipologie
```sql
CREATE TABLE tipologia (
    tipologia_id INTEGER PRIMARY KEY,
    nome_tipologia VARCHAR(50) UNIQUE NOT NULL,
    descrizione TEXT,
    icona VARCHAR(50), -- Per UI
    attiva BOOLEAN DEFAULT TRUE,
    ordinamento INTEGER DEFAULT 0
);

-- Dati iniziali tipologie
INSERT INTO tipologia (tipologia_id, nome_tipologia, descrizione) VALUES
(1, 'Ceramica', 'Oggetti in ceramica e terracotta'),
(2, 'Legno', 'Lavorazioni e oggetti in legno'),
(3, 'Tessuti', 'Tessuti e abbigliamento artigianale'),
(4, 'Gioielli', 'Gioielleria e bigiotteria artigianale'),
(5, 'Vetro', 'Oggetti e decorazioni in vetro'),
(6, 'Arredamento', 'Mobili e complementi d\'arredo'),
(7, 'Elettronica', 'Dispositivi elettronici artigianali'),
(8, 'Metallo', 'Lavorazioni metalliche'),
(9, 'Decorazioni', 'Oggetti decorativi vari'),
(10, 'Vario', 'Altre categorie non specificate');
```

### Tabelle Transazioni

#### 6. Tabella Carrello
```sql
CREATE TABLE carrello (
    carrello_id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES utente(id) ON DELETE CASCADE,
    prodotto_id INTEGER REFERENCES prodotti(prodotto_id) ON DELETE CASCADE,
    quantita INTEGER NOT NULL CHECK (quantita > 0),
    prezzo_unitario DECIMAL(10,2) NOT NULL CHECK (prezzo_unitario > 0),
    data_aggiunta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint unicità prodotto per cliente
    UNIQUE(cliente_id, prodotto_id)
);

CREATE INDEX idx_carrello_cliente ON carrello(cliente_id);
```

#### 7. Tabella Ordini
```sql
CREATE TABLE ordini (
    ordine_id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES utente(id) ON DELETE SET NULL,
    codice_ordine VARCHAR(20) UNIQUE NOT NULL,
    data_ordine TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    stato VARCHAR(20) DEFAULT 'in attesa' CHECK (stato IN (
        'in attesa', 'confermato', 'in preparazione', 
        'spedito', 'consegnato', 'annullato', 'controversia aperta'
    )),
    totale DECIMAL(10,2) NOT NULL CHECK (totale > 0),
    indirizzo_spedizione TEXT NOT NULL,
    note_ordine TEXT,
    data_spedizione TIMESTAMP,
    tracking_number VARCHAR(50),
    metodo_pagamento VARCHAR(20) DEFAULT 'bonifico',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger per generare codice ordine
CREATE OR REPLACE FUNCTION genera_codice_ordine()
RETURNS TRIGGER AS $$
BEGIN
    NEW.codice_ordine = 'ORD-' || EXTRACT(YEAR FROM NOW()) || '-' || 
                       LPAD(NEW.ordine_id::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_codice_ordine 
    BEFORE INSERT ON ordini 
    FOR EACH ROW EXECUTE FUNCTION genera_codice_ordine();

CREATE INDEX idx_ordini_cliente ON ordini(cliente_id);
CREATE INDEX idx_ordini_stato ON ordini(stato);
CREATE INDEX idx_ordini_data ON ordini(data_ordine);
```

#### 8. Tabella Dettagli Ordine
```sql
CREATE TABLE dettagli_ordine (
    dettaglio_id SERIAL PRIMARY KEY,
    ordine_id INTEGER REFERENCES ordini(ordine_id) ON DELETE CASCADE,
    prodotto_id INTEGER REFERENCES prodotti(prodotto_id) ON DELETE SET NULL,
    artigiano_id INTEGER REFERENCES artigiani(artigiano_id) ON DELETE SET NULL,
    nome_prodotto VARCHAR(100) NOT NULL, -- Storicizzazione
    quantita INTEGER NOT NULL CHECK (quantita > 0),
    prezzo_unitario DECIMAL(10,2) NOT NULL CHECK (prezzo_unitario > 0),
    subtotale DECIMAL(10,2) GENERATED ALWAYS AS (quantita * prezzo_unitario) STORED,
    stato VARCHAR(20) DEFAULT 'da preparare' CHECK (stato IN (
        'da preparare', 'in preparazione', 'pronto', 
        'spedito', 'consegnato', 'annullato'
    )),
    note TEXT
);

CREATE INDEX idx_dettagli_ordine ON dettagli_ordine(ordine_id);
CREATE INDEX idx_dettagli_artigiano ON dettagli_ordine(artigiano_id);
```

### Tabelle Feedback e Moderazione

#### 9. Tabella Recensioni
```sql
CREATE TABLE recensioni (
    recensione_id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES utente(id) ON DELETE SET NULL,
    artigiano_id INTEGER REFERENCES artigiani(artigiano_id) ON DELETE CASCADE,
    ordine_id INTEGER REFERENCES ordini(ordine_id) ON DELETE SET NULL,
    valutazione INTEGER NOT NULL CHECK (valutazione BETWEEN 1 AND 5),
    titolo VARCHAR(100),
    descrizione TEXT,
    stato VARCHAR(20) DEFAULT 'attiva' CHECK (stato IN ('attiva', 'nascosta', 'eliminata')),
    data_recensione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    risposta_artigiano TEXT,
    data_risposta TIMESTAMP,
    verified_purchase BOOLEAN DEFAULT FALSE,
    
    -- Un cliente può recensire un artigiano solo una volta per ordine
    UNIQUE(cliente_id, artigiano_id, ordine_id)
);

CREATE INDEX idx_recensioni_artigiano ON recensioni(artigiano_id);
CREATE INDEX idx_recensioni_valutazione ON recensioni(valutazione);
```

#### 10. Tabella Segnalazioni
```sql
CREATE TABLE segnalazioni (
    segnalazione_id SERIAL PRIMARY KEY,
    utente_segnalatore_id INTEGER REFERENCES utente(id) ON DELETE SET NULL,
    ordine_id INTEGER REFERENCES ordini(ordine_id) ON DELETE SET NULL,
    artigiano_id INTEGER REFERENCES artigiani(artigiano_id) ON DELETE SET NULL,
    recensione_id INTEGER REFERENCES recensioni(recensione_id) ON DELETE SET NULL,
    prodotto_id INTEGER REFERENCES prodotti(prodotto_id) ON DELETE SET NULL,
    testo TEXT NOT NULL,
    motivazione VARCHAR(100) NOT NULL CHECK (motivazione IN (
        'contenuto inappropriato', 'spam', 'frode', 
        'violazione termini', 'qualità prodotto', 'altro'
    )),
    stato_segnalazione VARCHAR(20) DEFAULT 'in attesa' CHECK (stato_segnalazione IN (
        'in attesa', 'in revisione', 'risolta', 'archiviata', 'respinta'
    )),
    data_segnalazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    note_admin TEXT,
    admin_id INTEGER REFERENCES utente(id),
    data_risoluzione TIMESTAMP,
    
    -- Almeno un riferimento deve essere presente
    CHECK (
        (ordine_id IS NOT NULL) OR 
        (artigiano_id IS NOT NULL) OR 
        (recensione_id IS NOT NULL) OR 
        (prodotto_id IS NOT NULL)
    )
);

CREATE INDEX idx_segnalazioni_stato ON segnalazioni(stato_segnalazione);
CREATE INDEX idx_segnalazioni_data ON segnalazioni(data_segnalazione);
```

### Vincoli e Relazioni Aggiuntive

```sql
-- Trigger per aggiornamento timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applicazione trigger alle tabelle principali
CREATE TRIGGER trigger_update_utente 
    BEFORE UPDATE ON utente 
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_prodotti 
    BEFORE UPDATE ON prodotti 
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- View per statistiche artigiani
CREATE VIEW vista_statistiche_artigiani AS
SELECT 
    a.artigiano_id,
    u.nome,
    u.cognome,
    COUNT(DISTINCT p.prodotto_id) as totale_prodotti,
    AVG(r.valutazione) as media_valutazioni,
    COUNT(DISTINCT r.recensione_id) as numero_recensioni,
    SUM(CASE WHEN o.stato = 'consegnato' THEN do.subtotale ELSE 0 END) as vendite_totali
FROM artigiani a
JOIN utente u ON a.artigiano_id = u.id
LEFT JOIN prodotti p ON a.artigiano_id = p.artigiano_id
LEFT JOIN recensioni r ON a.artigiano_id = r.artigiano_id AND r.stato = 'attiva'
LEFT JOIN dettagli_ordine do ON a.artigiano_id = do.artigiano_id
LEFT JOIN ordini o ON do.ordine_id = o.ordine_id
GROUP BY a.artigiano_id, u.nome, u.cognome;
```

## Riferimenti API

### Autenticazione

#### 1. Registrazione Utente
**POST** `/auth/signup`

Crea un nuovo account utente nel sistema.

```javascript
// Richiesta
{
    "username": "mario_rossi",        // Richiesto, alfanumerico, 3-50 caratteri
    "email": "mario@email.com",       // Richiesto, formato email valido
    "password": "Password123!",       // Richiesto, min 8 caratteri, 1 maiuscola, 1 numero
    "nome": "Mario",                  // Richiesto, solo lettere, max 100 caratteri
    "cognome": "Rossi",              // Richiesto, solo lettere, max 100 caratteri
    "numero_telefono": "+39123456789", // Opzionale, formato internazionale
    "indirizzo": "Via Roma 123",      // Opzionale, max 255 caratteri
    "citta": "Milano",               // Opzionale, max 100 caratteri
    "ruolo_id": 1                    // Richiesto, 1=cliente, 2=artigiano
}

// Risposta successo (201)
{
    "success": true,
    "message": "Registrazione completata con successo",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
        "id": 123,
        "username": "mario_rossi",
        "email": "mario@email.com",
        "nome": "Mario",
        "cognome": "Rossi",
        "ruolo_id": 1,
        "ruolo_nome": "cliente"
    },
    "expires_in": "24h"
}

// Errori possibili
// 400 - Dati non validi
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Dati di registrazione non validi",
        "details": {
            "username": "Username già esistente",
            "email": "Formato email non valido",
            "password": "Password deve contenere almeno 8 caratteri, 1 maiuscola e 1 numero"
        }
    }
}

// 409 - Conflitto dati esistenti
{
    "success": false,
    "error": {
        "code": "DUPLICATE_ENTRY",
        "message": "Username o email già registrati"
    }
}
```

#### 2. Login Utente
**POST** `/auth/login`

Autentica un utente e restituisce un token JWT.

```javascript
// Richiesta
{
    "username": "mario_rossi",    // Richiesto, username o email
    "password": "Password123!"    // Richiesto
}

// Risposta successo (200)
{
    "success": true,
    "message": "Login effettuato con successo",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
        "id": 123,
        "username": "mario_rossi",
        "nome": "Mario",
        "cognome": "Rossi",
        "email": "mario@email.com",
        "ruolo_id": 1,
        "ruolo_nome": "cliente",
        "stato": "attivo"
    },
    "expires_in": "24h"
}

// Errori possibili
// 400 - Credenziali mancanti
{
    "success": false,
    "error": {
        "code": "MISSING_CREDENTIALS",
        "message": "Username e password sono richiesti"
    }
}

// 401 - Credenziali errate
{
    "success": false,
    "error": {
        "code": "INVALID_CREDENTIALS",
        "message": "Username o password non corretti"
    }
}

// 403 - Account sospeso
{
    "success": false,
    "error": {
        "code": "ACCOUNT_SUSPENDED",
        "message": "Account temporaneamente sospeso",
        "details": {
            "data_fine_sospensione": "2024-12-31T23:59:59Z",
            "motivo": "Violazione termini di servizio"
        }
    }
}
```

#### 3. Recupero Password
**POST** `/auth/forgot-password`

Invia email per recupero password.

```javascript
// Richiesta
{
    "email": "mario@email.com"  // Richiesto, email registrata
}

// Risposta successo (200)
{
    "success": true,
    "message": "Email di recupero inviata. Controlla la tua casella di posta.",
    "expires_in": "1h"  // Validità del token di recupero
}

// Errore 404 - Email non trovata
{
    "success": false,
    "error": {
        "code": "EMAIL_NOT_FOUND",
        "message": "Nessun account associato a questa email"
    }
}
```

#### 4. Reset Password
**POST** `/auth/reset-password`

Reimposta la password utilizzando il token di recupero.

```javascript
// Richiesta
{
    "token": "recovery_token_from_email",  // Richiesto, token dalla email
    "new_password": "NuovaPassword123!"    // Richiesto, nuova password
}

// Risposta successo (200)
{
    "success": true,
    "message": "Password aggiornata con successo"
}

// Errore 400 - Token non valido
{
    "success": false,
    "error": {
        "code": "INVALID_TOKEN",
        "message": "Token di recupero non valido o scaduto"
    }
}
```

### Gestione Prodotti

#### 5. Lista Prodotti (Catalogo)
**GET** `/api/products`

Recupera l'elenco dei prodotti disponibili con filtri e paginazione.

```javascript
// Query parameters (tutti opzionali)
?tipologia_id=1          // Filtra per tipologia
&artigiano_id=5         // Filtra per artigiano
&prezzo_min=10          // Prezzo minimo
&prezzo_max=100         // Prezzo massimo
&search=ceramica        // Ricerca nel nome/descrizione
&sort=prezzo_asc        // Ordinamento: prezzo_asc, prezzo_desc, nome_asc, data_desc
&page=1                 // Numero pagina (default: 1)
&limit=20               // Prodotti per pagina (default: 20, max: 100)

// Risposta successo (200)
{
    "success": true,
    "data": {
        "products": [
            {
                "prodotto_id": 1,
                "nome_prodotto": "Vaso in ceramica",
                "descrizione": "Bellissimo vaso artigianale in ceramica dipinta a mano",
                "prezzo": 45.00,
                "quantita": 3,
                "immagine": "/images/products/vaso-ceramica-1.jpg",
                "artigiano": {
                    "id": 5,
                    "nome": "Giuseppe",
                    "cognome": "Bianchi",
                    "tipologia": "Ceramica"
                },
                "tipologia": {
                    "id": 1,
                    "nome": "Ceramica"
                },
                "created_at": "2024-01-15T10:30:00Z"
            }
        ],
        "pagination": {
            "current_page": 1,
            "total_pages": 5,
            "total_items": 87,
            "items_per_page": 20,
            "has_next": true,
            "has_prev": false
        },
        "filters_applied": {
            "tipologia_id": 1,
            "prezzo_min": 10,
            "prezzo_max": 100
        }
    }
}
```

### Gestione Carrello

#### 6. Aggiungi al Carrello
**POST** `/api/cart/add`

Aggiunge un prodotto al carrello dell'utente autenticato.

```javascript
// Headers richiesti
Authorization: Bearer <jwt_token>

// Richiesta
{
    "prodotto_id": 1,      // Richiesto, ID prodotto esistente
    "quantita": 2          // Richiesto, quantità desiderata
}

// Risposta successo (201)
{
    "success": true,
    "message": "Prodotto aggiunto al carrello",
    "cart_item": {
        "carrello_id": 15,
        "prodotto_id": 1,
        "nome_prodotto": "Vaso in ceramica",
        "quantita": 2,
        "prezzo_unitario": 45.00,
        "subtotale": 90.00,
        "data_aggiunta": "2024-01-20T14:30:00Z"
    }
}

// Errore 400 - Quantità non disponibile
{
    "success": false,
    "error": {
        "code": "INSUFFICIENT_STOCK",
        "message": "Quantità richiesta non disponibile",
        "details": {
            "quantita_richiesta": 5,
            "quantita_disponibile": 3
        }
    }
}
```






## API Reference

### Authentication Endpoints

#### 1. User Registration
**POST** `/auth/signup`

Creates a new user account.

```javascript
Request Body: {
    username: string,       // Required, unique username
    email: string,         // Required, valid email format
    password: string,      // Required, min 8 chars
    nome: string,         // Required, first name
    cognome: string,      // Required, last name
    numero_telefono: string, // Optional, phone number
    indirizzo: string,    // Optional, address
    citta: string,        // Optional, city
    ruolo_id: number      // Required, [1: cliente, 2: artigiano, 3: admin]
}

Response (201): {
    success: true,
    token: string,        // JWT authentication token
    user: {
        id: number,
        username: string,
        email: string
    }
}

Error Responses:
400: {
    success: false,
    error: "Username già esistente" | "Tutti i campi obbligatori devono essere compilati"
}

500: {
    success: false,
    error: "Errore durante la registrazione"
}
```

#### 2. User Login
**POST** `/auth/login`

Authenticates a user and returns a JWT token.

```javascript
Request Body: {
    nome_utente: string,  // Required, username
    password: string      // Required, password
}

Response (200): {
    success: true,
    token: string,
    user: {
        id: number,
        username: string,
        nome: string,
        cognome: string,
        ruolo_id: number
    }
}

Error Responses:
400: {
    success: false,
    error: "Username e password sono richiesti",
    code: "MISSING_CREDENTIALS"
}

401: {
    success: false,
    error: "Credenziali non valide",
    code: "INVALID_CREDENTIALS"
}

403: {
    success: false,
    error: "Account sospeso",
    code: "ACCOUNT_SUSPENDED",
    suspension: {
        dataFine: string  // Expected end date of suspension
    }
}
```

#### 3. Password Recovery
**POST** `/auth/recover-password`

Initiates password recovery process.

```javascript
Request Body: {
    email: string  // Required, registered email
}

Response (200): {
    success: true,
    message: "Email di recupero inviata con successo"
}

Error Responses:
400: {
    success: false,
    error: "Email richiesta"
}

404: {
    success: false,
    error: "Nessun account trovato con questa email"
}
```

#### 4. Password Reset
**POST** `/auth/reset-password`

Resets user password using recovery token.

```javascript
Request Body: {
    token: string,     // Required, recovery token from email
    newPassword: string // Required, new password
}

Response (200): {
    success: true,
    message: "Password aggiornata con successo"
}

Error Responses:
400: {
    success: false,
    error: "Token non valido o scaduto" | "Token e nuova password sono richiesti"
}
```

### Error Handling
All API endpoints follow a consistent error response format:

```javascript
{
    success: false,
    error: {
        code: string,    // Machine-readable error code
        message: string, // User-friendly error message
        details?: {      // Optional technical details (development only)
            cause: string,
            stack: string
        }
    }
}
```

#### Common Error Codes

1. Authentication Errors:
```javascript
INVALID_CREDENTIALS  // Wrong username/password
ACCOUNT_SUSPENDED   // User account is suspended
ACCOUNT_INACTIVE    // User account is not active
TOKEN_EXPIRED      // JWT token has expired
INVALID_TOKEN      // JWT token is invalid
```

2. Validation Errors:
```javascript
MISSING_FIELDS     // Required fields not provided
INVALID_FORMAT     // Field format is invalid
DUPLICATE_ENTRY    // Unique constraint violation
```

3. Server Errors:
```javascript
SERVER_ERROR       // Internal server error
DB_ERROR          // Database operation failed
EMAIL_ERROR       // Email sending failed
```

### Security Considerations

1. **Authentication**:
   - JWT tokens expire after 30 minutes
   - Passwords are hashed using bcrypt (10 rounds)
   - Sensitive operations require fresh authentication

2. **Rate Limiting**:
   - Login attempts: 5 per minute
   - Password recovery: 3 per hour
   - Account creation: 2 per hour

3. **Data Validation**:
   - Email format validation
   - Password strength requirements
   - Input sanitization for all fields



## Docker Configuration

### Overview
Il progetto utilizza Docker e Docker Compose per gestire gli ambienti di sviluppo e produzione, garantendo consistenza e isolamento.

### Struttura Docker
```
artigianato-online-2/
├── Dockerfile              # Multi-stage build configuration
├── docker-compose.yml      # Development configuration
├── docker-compose.prod.yml # Production configuration
└── .dockerignore          # Files to exclude from builds
```

### Base Configuration

#### Dockerfile
```dockerfile
# filepath: c:\Users\fratt\Documents\GitHub\artigianato-online-2\Dockerfile
# Stage 1: Development
FROM node:18-alpine as development

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Expose API port
EXPOSE 3000

CMD ["npm", "run", "dev"]

# Stage 2: Production
FROM node:18-alpine as production

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy production build
COPY . .

# Set production environment
ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "start"]
```

### Development Environment

```yaml
# filepath: c:\Users\fratt\Documents\GitHub\artigianato-online-2\docker-compose.yml
version: '3.8'
services:
  app:
    build: 
      context: .
      target: development
    volumes:
      - .:/app                # Mount source code
      - /app/node_modules     # Preserve container node_modules
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DB_HOST=db
      - DB_PORT=5432
      - DB_NAME=artigianato_online
      - DB_USER=postgres
      - DB_PASSWORD=postgres
    depends_on:
      - db
    restart: unless-stopped
    command: npm run dev

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=artigianato_online
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### Production Environment

```yaml
# filepath: c:\Users\fratt\Documents\GitHub\artigianato-online-2\docker-compose.prod.yml
version: '3.8'
services:
  app:
    build: 
      context: .
      target: production
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=db
      - DB_PORT=5432
      - DB_NAME=artigianato_online
    depends_on:
      - db
    restart: always
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure

  db:
    image: postgres:15-alpine
    volumes:
      - postgres_prod_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=artigianato_online
    expose:
      - "5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_prod_data:
```

### Development Features
- Hot-reload del codice tramite volume mounting
- Node.js in modalità development
- Database PostgreSQL con persistenza
- Variabili ambiente per sviluppo
- Healthcheck per il database
- Automatic restart on failure

### Production Features
- Multi-stage build per ottimizzare l'immagine
- Solo dipendenze di produzione
- Configurazione di replica per alta disponibilità
- Healthcheck più stringenti
- Politiche di restart automatico
- Volume persistente per il database

### Comandi Docker

#### Development
```bash
# Avvio ambiente sviluppo
docker-compose up -d

# Rebuild con modifiche
docker-compose up -d --build

# Logs in tempo reale
docker-compose logs -f

# Stop ambiente
docker-compose down
```

#### Production
```bash
# Build produzione
docker-compose -f docker-compose.prod.yml build

# Deploy produzione
docker-compose -f docker-compose.prod.yml up -d

# Scale servizio
docker-compose -f docker-compose.prod.yml up -d --scale app=3

# Shutdown
docker-compose -f docker-compose.prod.yml down
```

### Best Practices
1. **Security**:
   - No secrets in Dockerfile
   - Minimal base images
   - Non-root user in production
   - Volume permissions corrette

2. **Performance**:
   - Multi-stage builds
   - .dockerignore appropriato
   - Layer caching ottimizzato
   - Minimal dependencies

3. **Monitoring**:
   - Healthcheck configurati
   - Logging appropriato
   - Resource limits definiti
   - Restart policies appropriate

### Troubleshooting

#### Common Issues
1. **Database Connection**:
```bash
# Verifica network
docker network inspect artigianato-online-2_default

# Check logs database
docker-compose logs db
```

2. **Volume Permissions**:
```bash
# Fix permissions
docker-compose exec app chown -R node:node /app/node_modules
```

3. **Build Issues**:
```bash
# Clean build
docker-compose build --no-cache
docker system prune -a
```



## Testing

### Overview
Il sistema di testing è strutturato utilizzando Jest come framework principale, con una separazione tra test unitari e di integrazione. L'ambiente di test è completamente isolato, con un database dedicato e configurazioni specifiche.

### Struttura Test
```
tests/
├── setup.js              # Configurazione globale ambiente test
├── setupAfterEnv.js      # Hook ciclo di vita Jest
├── db-init.js           # Inizializzazione database test
├── test-seed.sql        # Dati iniziali per test
├── unit/               # Test unitari
│   └── auth.test.js    # Test funzionalità autenticazione
└── integration/       # Test integrazione
    └── api.test.js    # Test endpoint API
```

### Configurazione

#### Jest Configuration
```javascript
// filepath: c:\Users\fratt\Documents\GitHub\artigianato-online-2\jest.config.js
module.exports = {
    testEnvironment: 'node',
    setupFiles: ['<rootDir>/tests/setup.js'],
    setupFilesAfterEnv: ['<rootDir>/tests/setupAfterEnv.js'],
    testMatch: ['**/tests/**/*.test.js'],
    verbose: true,
    collectCoverageFrom: [
        'routes/**/*.js',
        'middleware/**/*.js'
    ],
    testTimeout: 10000,
    forceExit: true,
    detectOpenHandles: true,
    maxConcurrency: 1
};
```

### Test Unitari

I test unitari verificano il comportamento di singole unità di codice in isolamento.

#### Esempio Test Unitario
```javascript
// filepath: c:\Users\fratt\Documents\GitHub\artigianato-online-2\tests\unit\auth.test.js
describe('Authentication Unit Tests', () => {
    test('should verify password correctly', async () => {
        const password = 'Test123!';
        const hash = await bcrypt.hash(password, 10);
        const isValid = await verifyPassword(password, hash);
        expect(isValid).toBe(true);
    });
});
```

### Test di Integrazione

Verificano l'interazione tra diversi componenti del sistema, inclusi database e API.

#### Esempio Test Integrazione
```javascript
// filepath: c:\Users\fratt\Documents\GitHub\artigianato-online-2\tests\integration\api.test.js
describe('API Integration Tests', () => {
    beforeAll(async () => {
        pool = getPool();
        await pool.query('TRUNCATE TABLE utente, ruoli CASCADE');
        await pool.query(`
            INSERT INTO ruoli (ruolo_id, nome_ruolo) 
            VALUES (1, 'cliente'), (2, 'artigiano'), (3, 'admin')
        `);
    });

    test('POST /auth/signup - valid data creates user', async () => {
        const userData = {
            username: 'testuser',
            email: 'test@example.com',
            password: 'Test123!',
            nome: 'Test',
            cognome: 'User',
            numero_telefono: '1234567890',
            ruolo_id: 1
        };

        const response = await request(app)
            .post('/auth/signup')
            .send(userData);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('token');
    });
});
```

### Database Test

#### Setup Database Test
```javascript
// filepath: c:\Users\fratt\Documents\GitHub\artigianato-online-2\tests\db-init.js
const initTestDatabase = async () => {
    const client = new Client({
        database: 'postgres'
    });

    await client.connect();
    await client.query(`CREATE DATABASE ${process.env.DB_NAME}`);
    await client.end();

    const testClient = new Client({
        database: process.env.DB_NAME
    });

    await testClient.connect();
    await testClient.query(schemaSQL);
    await testClient.query(seedSQL);
    await testClient.end();
};
```

### Esecuzione Test

```bash
# Test unitari
npm run test:unit

# Test integrazione
npm run test:integration

# Tutti i test
npm test

# Coverage report
npm run test:coverage

# Watch mode
npm run test:watch
```

### Coverage Requirements

Il progetto mantiene i seguenti requisiti di copertura:
- Statements: >80%
- Branches: >75%
- Functions: >80%
- Lines: >80%

### Best Practices

1. **Isolamento**:
   - Database test separato
   - Ambiente configurato via setup.js
   - Pulizia dopo ogni test

2. **Gestione Risorse**:
   - Pool database singleton
   - Chiusura connessioni
   - Gestione errori

3. **Organizzazione**:
   - Test unitari separati
   - Test integrazione isolati
   - Naming consistente

### Troubleshooting

#### Common Issues
1. **Database Connection**
```bash
# Reset database test
npm run test:setup

# Verifica configurazione
echo %DB_NAME%
```

2. **Jest Timeout**
```javascript
// Aumenta timeout per test lenti
jest.setTimeout(15000);
```

3. **Pool Connection**
```bash
# Chiudi connessioni pendenti
npm test -- --forceExit
```

### Reporting

I report dei test sono generati automaticamente e includono:
- Tempo di esecuzione
- Percentuale successo
- Coverage dettagliato
- Stack trace errori

## Deployment

### Prerequisites
- Node.js v18.x
- Docker v24.x
- Docker Compose v3.8
- PostgreSQL v15

### Environment Setup
```env
# filepath: c:\Users\fratt\Documents\GitHub\artigianato-online-2\.env.production
# Server Configuration
NODE_ENV=production
PORT=3000

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=artigianato_online
DB_USER=postgres
DB_PASSWORD=<secure-password>

# Authentication
JWT_SECRET=<random-string>
JWT_EXPIRY=30m

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=<app-specific-password>

# Rate Limiting
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX=100
```

### Production Deployment

#### 1. Initial Setup
```bash
# Clone repository
git clone https://github.com/yourusername/artigianato-online-2.git
cd artigianato-online-2

# Create production environment file
copy .env.example .env.production
```

#### 2. Build and Deploy
```bash
# Build production image
docker build -t artigianato-online:prod --target production .

# Start production stack
docker-compose -f docker-compose.prod.yml up -d

# Verify deployment
docker-compose -f docker-compose.prod.yml ps
```

#### 3. Database Migration
```bash
# Run migrations
npm run migrate:prod

# Verify database
npm run db:check
```

### Monitoring and Maintenance

#### Health Checks
```bash
# Check application status
curl http://localhost:3000/health

# Monitor logs
docker-compose -f docker-compose.prod.yml logs -f app

# Check database status
docker-compose -f docker-compose.prod.yml exec db pg_isready
```

#### Backup and Restore
```bash
# Backup database
docker-compose -f docker-compose.prod.yml exec db pg_dump -U postgres artigianato_online > backup.sql

# Restore database
docker-compose -f docker-compose.prod.yml exec -T db psql -U postgres artigianato_online < backup.sql
```

## Troubleshooting

### Application Issues

#### 1. Server Connection
```bash
# Check if server is running
netstat -ano | findstr :3000

# View application logs
docker-compose -f docker-compose.prod.yml logs --tail=100 app
```

#### 2. Database Connection
```bash
# Verify database container
docker-compose -f docker-compose.prod.yml ps db

# Check database logs
docker-compose -f docker-compose.prod.yml logs db

# Test connection
docker-compose -f docker-compose.prod.yml exec db psql -U postgres -c "\l"
```

#### 3. Authentication Problems
```javascript
// Check JWT configuration
console.log('JWT Config:', {
    secret: process.env.JWT_SECRET?.slice(0,4) + '...',
    expiry: process.env.JWT_EXPIRY
});

// Verify token
try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token valid:', decoded);
} catch (err) {
    console.error('Token error:', err.name, err.message);
}
```

### Docker Issues

#### 1. Container Management
```bash
# Remove all containers and volumes
docker-compose -f docker-compose.prod.yml down -v

# Clean Docker system
docker system prune -a

# Rebuild from scratch
docker-compose -f docker-compose.prod.yml up -d --build
```

#### 2. Volume Permissions
```bash
# Fix node_modules permissions
docker-compose -f docker-compose.prod.yml exec app chown -R node:node /app/node_modules

# Check volume mounts
docker volume ls
docker volume inspect artigianato-online-2_postgres_prod_data
```

#### 3. Network Issues
```bash
# Inspect network
docker network ls
docker network inspect artigianato-online-2_default

# Check container connectivity
docker-compose -f docker-compose.prod.yml exec app ping db
```

### Recovery Procedures

1. **Application Recovery**
```bash
# Restart application
docker-compose -f docker-compose.prod.yml restart app

# Clear application cache
docker-compose -f docker-compose.prod.yml exec app npm run clear-cache
```

2. **Database Recovery**
```bash
# Restore from latest backup
docker-compose -f docker-compose.prod.yml exec -T db psql -U postgres artigianato_online < latest_backup.sql

# Verify data integrity
docker-compose -f docker-compose.prod.yml exec db psql -U postgres -c "SELECT count(*) FROM utente;"
```

### Common Issues
1. **Database Connection**
   ```bash
   # Check DB container logs
   docker-compose logs db
   
   # Verify network connectivity
   docker network inspect artigianato-network
   ```

2. **Authentication Errors**
   ```javascript
   // JWT verification failed
   jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
     if (err) console.error('JWT Error:', err.name, err.message);
   });
   ```

3. **Docker Issues**
   ```bash
   # Reset Docker environment
   docker-compose down -v
   docker system prune -a
   docker-compose up --build
   ```