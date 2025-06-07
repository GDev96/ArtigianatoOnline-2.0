# TO-DO LIST
## FRONTEND

Legenda:
✅ Completato
⏳ In corso 
❌ Da fare

| Descrizione                                                                 | Assegnato a | Nome Branch | Stato       |
|-----------------------------------------------------------------------------|-----------|-------------|-------------|
| Aggiungere file vecchio progetto         | Gaia         | main (primo commit)           | ✅ Completato |
| Cambiare stili              | Gaia        | fixstyles| ✅ Completato |
| Pagina catalogo             | Gaia         | catalogpage          | ✅ Completato  |
| Pagina profilo utente             | Gaia         | profilepage          | ✅ Completato   |
| Pagina carrello             | Gaia         | cartpage          | ✅ Completato    |
| Pagina dashboard             | Gaia         | dashboard          | ✅ Completato   |
| Pagina admin             | Gaia         | adminconsole          | ✅ Completato  |
| Pagina di recupero password             | Gaia         | resetpass          | ✅ Completato     |
| Correzioni errori vari            | Gaia         | fixes          | ⏳ In corso    |

## BACKEND PAGINE HTML
| Descrizione                                                                 | Assegnato a | Nome Branch | Stato       |
|-----------------------------------------------------------------------------|-----------|-------------|-------------|
| Correggere API vecchio progetto             | Gaia         | fixAPI          | ✅ Completato   |
| -             | -         | Gaia          | ⏳ In corso   |
| API Utenti             | Gaia         | profilepage          | ✅ Completato   |
| API Artigiani             | Gaia         | catalogpage          | ✅ Completato   |
| API prodotti             | Gaia         | dashboard          | ✅ Completato   |
| API recensioni             | Gaia         | catalogpage          | ✅ Completato   |
| API segnalazioni             | Gaia         | adminconsole          | ✅ Completato   |
| API Ordini             | Gaia         | cartpage          | ✅ Completato   |
| API admin             | Gaia         | adminconsole          | ✅ Completato   |
| Correzione logout token             | Gaia         | fixtokenlogout          |✅ Completato  |
| Recupero password             | Gaia         | resetPass          | ✅ Completato   |
| Docker             | -         | -          | ❌ Da fare   |

## DATABASE

Tabelle e attributi:
    - utente: id (autoincrement), nome_utente, nome, cognome, e-mail, password (hash), ruolo_id (riferimento a ruoli)
    - artigiani: artigian_id (riferimento a utente), numero telefono, Indirizzo, città, categoria di prodotti, p_iva, immagine (tipo: BYTEA)
    - ruoli: ruolo_id, permessi **lo ha solo accennato, sto ancora cercando di capire come funzionano per bene**
    - prodotti: prodotto_id (autoincrement), artigiano_id (riferimento a artigiani.id), nome_prodotto, tipologia_id (riferimento a tipologia), prezzo, immagine (tipo: BYTEA)
    - tipologia: tipologia_id (autoincrement), nome_tipologia

    - ordini: ordine_id (autoincrement), cliente_id (riferinento a utenti_id), data, stato (non pagato / in spedizione / concluso)
    - dettagli ordine: oridne_id (riferimento a ordini) (primary key), prodotto_id (riferimento a prodotti), quantita, prezzo_ordine

| Descrizione                     | Assegnato a | Nome Branch | Stato       |
|---------------------------------|-----------|-------------|-------------|
| Creare nuovo db    | Gaia    | main   |✅ Completato |
| Test   | Gaia    | test   |✅ Completato |
| ReadMe.md   | Gaia    | main   |✅ Completato |
| Documentazione   | Gaia    | main   |✅ Completato |

***


# Artigianato Online 2.0

Una piattaforma web per connettere artigiani e clienti, permettendo l'acquisto di prodotti artigianali e la gestione di recensioni.

## 🚀 Funzionalità

### Utenti
- Registrazione e login con ruoli differenziati (Cliente, Artigiano, Admin)
- Gestione del profilo personale
- Visualizzazione dello storico ordini
- Gestione delle recensioni effettuate
- Gestione delle segnalazioni inviate

### Artigiani
- Dashboard personalizzata
- Gestione del catalogo prodotti (aggiunta, modifica, eliminazione)
- Visualizzazione statistiche vendite
- Gestione delle recensioni ricevute
- Monitoraggio delle segnalazioni

### Amministratori
- Gestione utenti
- Moderazione recensioni
- Gestione segnalazioni
- Monitoraggio della piattaforma

## 🛠️ Tecnologie Utilizzate

- **Frontend**: HTML5, CSS3, JavaScript, Bootstrap 5
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Autenticazione**: JWT (JSON Web Tokens)
- **Containerization**: Docker & Docker Compose

## 💻 Requisiti di Sistema

- Node.js (v14+)
- PostgreSQL (v12+)
- npm o yarn
- Docker & Docker Compose

## 🚦 Getting Started

### Metodo Tradizionale

1. Clona il repository
```bash
git clone https://github.com/yourusername/artigianato-online-2.git
```

2. Installa le dipendenze
```bash
npm install
```

3. Configura il database
```bash
# Crea un file .env nella root del progetto con:
DB_USER=your_username
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=artigianato_online
JWT_SECRET=your_secret_key
```

4. Inizializza il database
```bash
node db/seed.js
```

5. Avvia l'applicazione
```bash
node app.js
```

### Utilizzo con Docker

1. Assicurati di avere Docker e Docker Compose installati

2. Build e avvio dei container:
```bash
docker-compose up --build
```

3. Per arrestare i container:
```bash
docker-compose down
```

L'applicazione sarà disponibile all'indirizzo: `http://localhost:3000`

## 📝 API Endpoints

### Autenticazione
- `POST /auth/signup` - Registrazione nuovo utente
- `POST /auth/login` - Login utente
- `POST /auth/logout` - Logout utente

### Utenti
- `GET /users/profile` - Recupera profilo utente
- `PUT /users/profile` - Aggiorna profilo utente
- `POST /users/profile/image` - Carica immagine profilo

### Prodotti
- `GET /products` - Lista prodotti
- `POST /products` - Crea nuovo prodotto
- `PUT /products/:id` - Modifica prodotto
- `DELETE /products/:id` - Elimina prodotto

### Recensioni
- `GET /reviews` - Lista recensioni
- `POST /reviews` - Crea recensione
- `PUT /reviews/:id` - Modifica recensione
- `DELETE /reviews/:id` - Elimina recensione

### Segnalazioni
- `GET /reports/user` - Lista segnalazioni utente
- `POST /reports/review` - Segnala recensione
- `POST /reports/artisan` - Segnala artigiano
- `DELETE /reports/:id` - Elimina segnalazione

## 👥 Ruoli Utente

1. **Cliente** (ruolo_id: 1)
   - Acquisto prodotti
   - Gestione carrello
   - Recensioni
   - Segnalazioni

2. **Artigiano** (ruolo_id: 2)
   - Gestione prodotti
   - Visualizzazione recensioni
   - Gestione segnalazioni

3. **Amministratore** (ruolo_id: 3)
   - Gestione piattaforma
   - Moderazione contenuti

## 🔒 Sicurezza

- Autenticazione basata su JWT
- Password hashate
- Validazione input
- Protezione CSRF
- Middleware di autorizzazione per ruoli