-- Clean tables
TRUNCATE TABLE segnalazioni, recensioni, dettagli_ordine, ordini, carrello, 
             prodotti, artigiani, utente, tipologia, ruoli CASCADE;

-- Insert test roles
INSERT INTO ruoli (ruolo_id, nome_ruolo) VALUES
(1, 'cliente'),
(2, 'artigiano'),
(3, 'admin')
ON CONFLICT (nome_ruolo) DO NOTHING;

-- Insert test tipologie
INSERT INTO tipologia (tipologia_id, nome_tipologia) VALUES
(1, 'Test Tipologia 1'),
(2, 'Test Tipologia 2');

-- Insert test users
INSERT INTO utente (username, nome, cognome, numero_telefono, email, password_hash, ruolo_id, stato) 
VALUES 
('test_cliente', 'Test', 'Cliente', '1234567890', 'test@cliente.com', '$2b$10$testpasswordhash', 1, 'attivo'),
('test_artigiano', 'Test', 'Artigiano', '0987654321', 'test@artigiano.com', '$2b$10$testpasswordhash', 2, 'attivo'),
('test_admin', 'Test', 'Admin', '1122334455', 'test@admin.com', '$2b$10$testpasswordhash', 3, 'attivo');

-- Insert test artigiano details
INSERT INTO artigiani (artigiano_id, tipologia_id, iban)
SELECT id, 1, 'IT60X0542811101000000123456'
FROM utente 
WHERE username = 'test_artigiano';

-- Insert test products
INSERT INTO prodotti (artigiano_id, nome_prodotto, tipologia_id, prezzo, quantita)
SELECT artigiano_id, 'Prodotto Test 1', 1, 29.99, 10
FROM artigiani;

-- Insert test orders
INSERT INTO ordini (cliente_id, data_ordine, stato)
SELECT id, CURRENT_TIMESTAMP, 'in preparazione'
FROM utente 
WHERE username = 'test_cliente';

-- Insert test order details
INSERT INTO dettagli_ordine (ordine_id, prodotto_id, quantita, prezzo_unitario, stato)
SELECT o.ordine_id, p.prodotto_id, 1, p.prezzo, 'in preparazione'
FROM ordini o
CROSS JOIN prodotti p;

-- Insert test recensioni
INSERT INTO recensioni (cliente_id, artigiano_id, valutazione, descrizione, stato)
SELECT 
    (SELECT id FROM utente WHERE username = 'test_cliente'),
    (SELECT artigiano_id FROM artigiani LIMIT 1),
    5,
    'Recensione test',
    'attiva';