const bcrypt = require('bcrypt');
const { pool } = require('./db');

async function seed() {
    console.log('Avvio del seed...');
    try {
        // --- CREAZIONE RUOLI ---
        console.log('Inserimento ruoli...');
        await pool.query(`
            INSERT INTO ruoli (ruolo_id, nome_ruolo) VALUES
            (1, 'cliente'),
            (2, 'artigiano'),
            (3, 'admin')
            ON CONFLICT (nome_ruolo) DO NOTHING;
        `);

        // --- CREAZIONE TIPOLOGIE ---
        console.log('Inserimento tipologie...');
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
        if (parseInt(checkUsers.rows[0].count) > 0) {
            console.log('Dati utente già presenti. Seed non necessario.');
            return;
        }

        const saltRounds = 10;

        // --- CREAZIONE UTENTI ---
        const utenti = [
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
            const hash = await bcrypt.hash(u.password, saltRounds);
            await pool.query(
                `INSERT INTO utente (username, nome, cognome, numero_telefono, email, indirizzo, citta, password_hash, ruolo_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [u.username, u.nome, u.cognome, u.numero_telefono, u.email, u.indirizzo, u.citta, hash, u.ruolo_id]
            );
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
            await pool.query(
                `INSERT INTO artigiani (artigiano_id, tipologia_id, iban, immagine)
                 VALUES ($1, $2, $3, NULL)`,
                [artigiano.id, tipo, 'IT60X0542811101000000123456']
            );
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
            const res = await pool.query("SELECT id FROM utente WHERE username = $1", [p.art]);
            const artId = res.rows[0].id;
            await pool.query(
                `INSERT INTO prodotti (artigiano_id, nome_prodotto, tipologia_id, prezzo, immagine, quantita)
                 VALUES ($1, $2, $3, $4, NULL, $5)`,
                [artId, p.nome, p.tipologia_id, p.prezzo, 10]
            );
        }
        // FIXME: Pieno di errori
        /*
        const clientiRes = await pool.query("SELECT id FROM utente WHERE ruolo_id = 1");
        const ordini = [
            { cliente_id: clientiRes.rows[0].id, stato: 'consegnato' },
            { cliente_id: clientiRes.rows[1].id, stato: 'in spedizione' },
            { cliente_id: clientiRes.rows[2].id, stato: 'consegnato' }
        ];

        const ordiniInseriti = [];
        for (const ordine of ordini) {
            const ordineRes = await pool.query(
                `INSERT INTO ordini (cliente_id, stato)
                 VALUES ($1, $2)
                 RETURNING ordine_id`,
                [ordine.cliente_id, ordine.stato]
            );
            ordiniInseriti.push(ordineRes.rows[0].ordine_id);
        }

        // --- CREAZIONE DETTAGLI ORDINE ---
        console.log('Inserimento dettagli ordine...');
        const dettagliOrdini = [
            { ordine_id: ordiniInseriti[0], prodotto_id: prodotti[0].id, quantita: 2, prezzo_unitario: prodotti[0].prezzo, stato: 'consegnato' },
            { ordine_id: ordiniInseriti[0], prodotto_id: prodotti[2].id, quantita: 1, prezzo_unitario: prodotti[2].prezzo, stato: 'consegnato' },
            { ordine_id: ordiniInseriti[1], prodotto_id: prodotti[3].id, quantita: 1, prezzo_unitario: prodotti[3].prezzo, stato: 'in spedizione' },
            { ordine_id: ordiniInseriti[2], prodotto_id: prodotti[4].id, quantita: 3, prezzo_unitario: prodotti[4].prezzo, stato: 'consegnato' }
        ];

        for (const dettaglio of dettagliOrdini) {
            await pool.query(
                `INSERT INTO dettagli_ordine (ordine_id, prodotto_id, quantita, prezzo_unitario, stato)
                 VALUES ($1, $2, $3, $4, $5)`,
                [dettaglio.ordine_id, dettaglio.prodotto_id, dettaglio.quantita, dettaglio.prezzo_unitario, dettaglio.stato]
            );
        }

        // --- CREAZIONE RECENSIONI ---
        console.log('Inserimento recensioni...');
        const recensioni = [
            { cliente_id: clientiRes.rows[0].id, artigiano_id: prodotti[0].artigiano_id, valutazione: 5, descrizione: 'Prodotto bellissimo e di ottima qualità!', stato: 'attiva' },
            { cliente_id: clientiRes.rows[1].id, artigiano_id: prodotti[2].artigiano_id, valutazione: 4, descrizione: 'Buon prodotto, spedizione un po\' lenta', stato: 'attiva' },
            { cliente_id: clientiRes.rows[2].id, artigiano_id: prodotti[4].artigiano_id, valutazione: 5, descrizione: 'Perfetto, esattamente come nella descrizione', stato: 'attiva' }
        ];

        for (const recensione of recensioni) {
            await pool.query(
                `INSERT INTO recensioni (cliente_id, artigiano_id, valutazione, descrizione, stato)
                 VALUES ($1, $2, $3, $4, $5)`,
                [recensione.cliente_id, recensione.artigiano_id, recensione.valutazione, recensione.descrizione, recensione.stato]
            );
        }

        // --- CREAZIONE SEGNALAZIONI ---
        console.log('Inserimento segnalazioni...');
        const recensioniRes = await pool.query("SELECT recensione_id FROM recensioni");
        const segnalazioni = [
            { ordine_id: ordiniInseriti[1], utente_id: clientiRes.rows[1].id, recensione_id: null, testo: 'Il prodotto non è arrivato', motivazione: 'Prodotto mancante', stato_segnalazione: 'in attesa' },
            { ordine_id: null, utente_id: clientiRes.rows[0].id, recensione_id: recensioniRes.rows[1].recensione_id, testo: 'Recensione ingiusta', motivazione: 'Recensione falsa', stato_segnalazione: 'in attesa' }
        ];

        for (const segnalazione of segnalazioni) {
            await pool.query(
                `INSERT INTO segnalazioni (ordine_id, utente_id, recensione_id, testo, motivazione, stato_segnalazione)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [segnalazione.ordine_id, segnalazione.utente_id, segnalazione.recensione_id, segnalazione.testo, segnalazione.motivazione, segnalazione.stato_segnalazione]
            );
        }
        */
        console.log('Seed completato con successo.');
    } catch (error) {
        console.error('Errore durante il seed:', error);
    }
}

seed();
module.exports = seed;
