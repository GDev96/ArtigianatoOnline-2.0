const bcrypt = require('bcrypt');
const { getPool } = require('./pool'); 

async function seed() {
    const pool = getPool(); 
    
    console.log('Avvio del seed...');
    try {
        // Test connessione
        await pool.query('SELECT NOW()');
        console.log('Database connection OK');
        
        // --- CREAZIONE RUOLI ---
        await pool.query(`
            INSERT INTO ruoli (ruolo_id, nome_ruolo) VALUES
            (1, 'cliente'),
            (2, 'artigiano'),
            (3, 'admin')
            ON CONFLICT (nome_ruolo) DO NOTHING;
        `);

        // --- CREAZIONE TIPOLOGIE ---
        await pool.query(`
            INSERT INTO tipologia (tipologia_id, nome_tipologia) VALUES
            (1, 'Ceramica'),
            (2, 'Legno'),
            (3, 'Tessuti'),
            (4, 'Gioielli'),
            (5, 'Vetro'),
            (6, 'Arredamento'),
            (7, 'Elettronica'),
            (8, 'Metallo'),
            (9, 'Decorazioni'),
            (10, 'Vario')
            ON CONFLICT (nome_tipologia) DO NOTHING;
        `);

        // --- CHECK UTENTI ---
        const checkUsers = await pool.query('SELECT COUNT(*) FROM utente');
        const userCount = parseInt(checkUsers.rows[0].count);
        console.log(`Found ${userCount} existing users`);
        
        if (userCount > 0) {
            console.log('Dati utente già presenti. Seed non necessario.');
            return;
        }

        const saltRounds = 10;

        // --- CREAZIONE UTENTI ---
        const utenti = [
            { username: 'mario_clientetest', nome: 'Mario', cognome: 'Test', numero_telefono: '3281234599', email: 'mariotest@example.com', ruolo_id: 1, citta: 'Venezia', indirizzo: 'Via Test 1', password: 'cliente4' },
            { username: 'giulia_tessuti', nome: 'Giulia', cognome: 'Rossi', numero_telefono: '3281234567', email: 'giulia@example.com', ruolo_id: 2, citta: 'Firenze', indirizzo: 'Via delle Rose 10', password: 'password1' },
            { username: 'marco_legno', nome: 'Marco', cognome: 'Bianchi', numero_telefono: '3283454567', email: 'marco@example.com', ruolo_id: 2, citta: 'Torino', indirizzo: 'Via Bosco 21', password: 'password2' },
            { username: 'alessia_gioielli', nome: 'Alessia', cognome: 'Verdi', numero_telefono: '3282345643', email: 'alessia@example.com', ruolo_id: 2, citta: 'Roma', indirizzo: 'Via Appia 45', password: 'password3' },
            { username: 'luigi_vetro', nome: 'Luigi', cognome: 'Conti', numero_telefono: '328567445', email: 'luigi@example.com', ruolo_id: 2, citta: 'Milano', indirizzo: 'Via Milano 5', password: 'password4' },
            { username: 'francesca_metallo', nome: 'Francesca', cognome: 'Rinaldi', numero_telefono: '3283456324', email: 'francesca@example.com', ruolo_id: 2, citta: 'Bologna', indirizzo: 'Via delle Industrie 30', password: 'password5' },
            { username: 'mario_admin', nome: 'Mario', cognome: 'Admin', numero_telefono: '3286840345', email: 'admin@example.com', ruolo_id: 3, citta: 'Napoli', indirizzo: 'Via Centrale 1', password: 'adminpass' },
            { username: 'elena_cliente', nome: 'Elena', cognome: 'Piazza', numero_telefono: '3282345323', email: 'elena@example.com', ruolo_id: 1, citta: 'Genova', indirizzo: 'Via Mare 12', password: 'cliente1' },
            { username: 'davide_cliente', nome: 'Davide', cognome: 'Valli', numero_telefono: '3289846328', email: 'davide@example.com', ruolo_id: 1, citta: 'Pisa', indirizzo: 'Via Torre 8', password: 'cliente2' },
            { username: 'sofia_cliente', nome: 'Sofia', cognome: 'Moretti', numero_telefono: '3282364323', email: 'sofia@example.com', ruolo_id: 1, citta: 'Trento', indirizzo: 'Via Alpina 3', password: 'cliente3' }
        ];

        for (const u of utenti) {
            try {
                const hash = await bcrypt.hash(u.password, saltRounds);
                await pool.query(
                    `INSERT INTO utente (username, nome, cognome, numero_telefono, email, indirizzo, citta, password_hash, ruolo_id, stato)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [u.username, u.nome, u.cognome, u.numero_telefono, u.email, u.indirizzo, u.citta, hash, u.ruolo_id, 'attivo']
                );
            } catch (userError) {
                console.error(`Error creating user ${u.username}:`, userError.message);
            }
        }

        // --- CREAZIONE ARTIGIANI ---
        const artigianiRes = await pool.query("SELECT id, username FROM utente WHERE ruolo_id = 2");
        const tipologie = {
            'giulia_tessuti': 3,
            'marco_legno': 2,
            'alessia_gioielli': 4,
            'luigi_vetro': 5,
            'francesca_metallo': 8
        };

        for (const artigiano of artigianiRes.rows) {
            const tipo = tipologie[artigiano.username];
            if (tipo) {
                try {
                    await pool.query(
                        `INSERT INTO artigiani (artigiano_id, tipologia_id, iban, immagine)
                         VALUES ($1, $2, $3, NULL)`,
                        [artigiano.id, tipo, 'IT60X0542811101000000123456']
                    );
                } catch (artisanError) {
                    console.error(`Error creating artisan ${artigiano.username}:`, artisanError.message);
                }
            }
        }

        // --- CREAZIONE PRODOTTI ---
        const prodotti = [
            { nome: 'Cuscino ricamato', tipologia_id: 3, prezzo: 25.00, art: 'giulia_tessuti' },
            { nome: 'Tenda artigianale', tipologia_id: 3, prezzo: 60.00, art: 'giulia_tessuti' },
            { nome: 'Tagliere in legno di ulivo', tipologia_id: 2, prezzo: 30.00, art: 'marco_legno' },
            { nome: 'Lampada da tavolo in legno', tipologia_id: 2, prezzo: 70.00, art: 'marco_legno' },
            { nome: 'Collana in argento', tipologia_id: 4, prezzo: 45.00, art: 'alessia_gioielli' },
            { nome: 'Bicchieri soffiati a mano', tipologia_id: 5, prezzo: 55.00, art: 'luigi_vetro' },
            { nome: 'Lampadario in ferro battuto', tipologia_id: 8, prezzo: 120.00, art: 'francesca_metallo' },
        ];

        for (const p of prodotti) {
            try {
                const res = await pool.query("SELECT id FROM utente WHERE username = $1", [p.art]);
                if (res.rows.length > 0) {
                    const artId = res.rows[0].id;
                    await pool.query(
                        `INSERT INTO prodotti (artigiano_id, nome_prodotto, tipologia_id, prezzo, immagine, quantita)
                         VALUES ($1, $2, $3, $4, NULL, $5)`,
                        [artId, p.nome, p.tipologia_id, p.prezzo, 10]
                    );
                }
            } catch (productError) {
                console.error(`Error creating product ${p.nome}:`, productError.message);
            }
        }

        // --- CREAZIONE CARRELLO ---
        const clientiRes = await pool.query("SELECT id FROM utente WHERE ruolo_id = 1");
        const prodottiRes = await pool.query("SELECT prodotto_id, prezzo FROM prodotti");
        
        if (clientiRes.rows.length > 0 && prodottiRes.rows.length > 0) {
            const carrello = [
                { cliente_id: clientiRes.rows[0].id, prodotto_id: prodottiRes.rows[0].prodotto_id, quantita: 2, prezzo: prodottiRes.rows[0].prezzo },
                { cliente_id: clientiRes.rows[1]?.id, prodotto_id: prodottiRes.rows[1]?.prodotto_id, quantita: 1, prezzo: prodottiRes.rows[1]?.prezzo },
                { cliente_id: clientiRes.rows[2]?.id, prodotto_id: prodottiRes.rows[2]?.prodotto_id, quantita: 3, prezzo: prodottiRes.rows[2]?.prezzo }
            ];

            for (const item of carrello) {
                if (item.cliente_id && item.prodotto_id) {
                    try {
                        await pool.query(
                            `INSERT INTO carrello (cliente_id, prodotto_id, quantita, prezzo_unitario)
                             VALUES ($1, $2, $3, $4)`,
                            [item.cliente_id, item.prodotto_id, item.quantita, item.prezzo]
                        );
                    } catch (cartError) {
                        console.error('Error creating cart item:', cartError.message);
                    }
                }
            }
        }

        console.log('Seed completato con successo!');
        
    } catch (error) {
        console.error('Errore durante il seed:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        throw error;
    }
}

// Esporta sia la funzione che l'esecuzione diretta
module.exports = seed;

// Esegui solo se chiamato direttamente
if (require.main === module) {
    seed().then(() => {
        console.log('Seed execution completed');
        process.exit(0);
    }).catch(error => {
        console.error('Seed execution failed:', error);
        process.exit(1);
    });
}