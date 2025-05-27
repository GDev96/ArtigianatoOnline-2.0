-- crea tabella ruoli
CREATE TABLE IF NOT EXISTS ruoli (
    ruolo_id SERIAL PRIMARY KEY,
    nome_ruolo VARCHAR(50) NOT NULL UNIQUE
);

-- crea tabella tipologie
CREATE TABLE IF NOT EXISTS tipologia (
    tipologia_id SERIAL PRIMARY KEY,
    nome_tipologia VARCHAR(50) NOT NULL UNIQUE
);

-- crea tabella utenti
CREATE TABLE IF NOT EXISTS utente (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    nome VARCHAR(50) NOT NULL,
    cognome VARCHAR(50) NOT NULL,
    numero_telefono VARCHAR(20),
    indirizzo TEXT,
    citta VARCHAR(50),
    email VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    stato VARCHAR(20) NOT NULL DEFAULT 'attivo',
    ruolo_id INTEGER NOT NULL,
    CONSTRAINT utente_stato_check CHECK (stato IN ('attivo', 'sospeso')),
    CONSTRAINT utente_ruolo_id_fkey FOREIGN KEY (ruolo_id)
        REFERENCES ruoli (ruolo_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- crea tabella artigiani
CREATE TABLE IF NOT EXISTS artigiani (
    artigiano_id INTEGER PRIMARY KEY,
    tipologia_id INTEGER,
    iban VARCHAR(27) NOT NULL,
    immagine BYTEA,
    CONSTRAINT artigiani_artigiano_id_fkey FOREIGN KEY (artigiano_id)
        REFERENCES utente (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT artigiani_tipologia_id_fkey FOREIGN KEY (tipologia_id)
        REFERENCES tipologia (tipologia_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

-- crea tabella prodotti
CREATE TABLE IF NOT EXISTS prodotti (
    prodotto_id SERIAL PRIMARY KEY,
    artigiano_id INTEGER NOT NULL,
    nome_prodotto VARCHAR(100) NOT NULL,
    tipologia_id INTEGER,
    prezzo NUMERIC(10,2) NOT NULL,
    immagine BYTEA,
    quantita INTEGER,
    CONSTRAINT prodotti_artigiano_id_fkey FOREIGN KEY (artigiano_id)
        REFERENCES artigiani (artigiano_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT prodotti_tipologia_id_fkey FOREIGN KEY (tipologia_id)
        REFERENCES tipologia (tipologia_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

--crea tabella carrello --tabella temporanea per memorizzare i prodotti selezionati
CREATE TABLE IF NOT EXISTS carrello (
    carrello_id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL,
    prodotto_id INTEGER NOT NULL,
    quantita INTEGER NOT NULL CHECK (quantita > 0),
    prezzo_unitario NUMERIC(10,2) NOT NULL,
    CONSTRAINT carrello_cliente_id_fkey FOREIGN KEY (cliente_id)
        REFERENCES utente (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT carrello_prodotto_id_fkey FOREIGN KEY (prodotto_id)
        REFERENCES prodotti (prodotto_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- crea tabella ordini
CREATE TABLE IF NOT EXISTS ordini (
    ordine_id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL,
    data_ordine TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    stato VARCHAR(20) NOT NULL,
    CONSTRAINT ordini_cliente_id_fkey FOREIGN KEY (cliente_id)
        REFERENCES utente (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT ordini_stato_check CHECK (stato IN ('in preparazione', 'spedito', 'controversia aperta', 'consegnato'))
);

-- crea tabella dettagli_ordine
CREATE TABLE IF NOT EXISTS dettagli_ordine (
    ordine_id INTEGER NOT NULL,
    prodotto_id INTEGER NOT NULL,
    quantita INTEGER NOT NULL CHECK (quantita > 0),
    prezzo_unitario NUMERIC(10,2) NOT NULL,
    stato VARCHAR(20) NOT NULL,
    PRIMARY KEY (ordine_id, prodotto_id),
    CONSTRAINT dettagli_ordine_ordine_id_fkey FOREIGN KEY (ordine_id)
        REFERENCES ordini (ordine_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT dettagli_ordine_prodotto_id_fkey FOREIGN KEY (prodotto_id)
        REFERENCES prodotti (prodotto_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- crea tabella recensioni
CREATE TABLE IF NOT EXISTS recensioni (
    recensione_id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL,
    artigiano_id INTEGER NOT NULL,
    data_recensione TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valutazione INTEGER NOT NULL CHECK (valutazione >= 1 AND valutazione <= 5),
    descrizione VARCHAR(255),
    stato VARCHAR(20) NOT NULL DEFAULT 'attiva',
    CONSTRAINT recensioni_stato_check CHECK (stato IN ('attiva', 'sospesa')),
    CONSTRAINT recensioni_cliente_id_fkey FOREIGN KEY (cliente_id)
        REFERENCES utente (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT recensioni_artigiano_id_fkey FOREIGN KEY (artigiano_id)
        REFERENCES artigiani (artigiano_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- crea tabella segnalazioni
CREATE TABLE IF NOT EXISTS segnalazioni (
    segnalazione_id SERIAL PRIMARY KEY,
    ordine_id INTEGER,
    utente_id INTEGER,
    recensione_id INTEGER, 
    testo TEXT,
    motivazione TEXT NOT NULL, 
    data_segnalazione TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    stato_segnalazione VARCHAR(20) NOT NULL DEFAULT 'in attesa',
    CONSTRAINT segnalazioni_stato_check CHECK (stato_segnalazione IN ('in attesa', 'risolta')),
    CONSTRAINT segnalazioni_ordine_id_fkey FOREIGN KEY (ordine_id)
        REFERENCES ordini (ordine_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT segnalazioni_utente_id_fkey FOREIGN KEY (utente_id)
        REFERENCES utente (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT segnalazioni_recensione_id_fkey FOREIGN KEY (recensione_id)
        REFERENCES recensioni (recensione_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
)