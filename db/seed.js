const bcrypt = require('bcrypt');
const pool = require('./db');

async function seed() {
    console.log('Avvio del seed...');
    try {
        // Check if users already exist
        const checkUsers = await pool.query('SELECT COUNT(*) FROM utente');
        if (parseInt(checkUsers.rows[0].count) > 0) {
            console.log('Dati utente già presenti. Seed non necessario.');
            return;
        }

        const saltRounds = 10;

        // --- CREAZIONE UTENTI ---
        const utenti = [
            {
                nome_utente: 'giulia_tessuti', nome: 'Giulia', cognome: 'Rossi', numero_telefono: '3281234567', email: 'giulia@example.com', ruolo_id: 2, citta: 'Firenze', indirizzo: 'Via delle Rose 10', password: 'password1'
            },
            {
                nome_utente: 'marco_legno', nome: 'Marco', cognome: 'Bianchi', numero_telefono: '3283454567', email: 'marco@example.com', ruolo_id: 2, citta: 'Torino', indirizzo: 'Via Bosco 21', password: 'password2'
            },
            {
                nome_utente: 'alessia_gioielli', nome: 'Alessia', cognome: 'Verdi', numero_telefono: '3282345643', email: 'alessia@example.com', ruolo_id: 2, citta: 'Roma', indirizzo: 'Via Appia 45', password: 'password3'
            },
            {
                nome_utente: 'luigi_vetro', nome: 'Luigi', cognome: 'Conti', numero_telefono: '328567445', email: 'luigi@example.com', ruolo_id: 2, citta: 'Milano', indirizzo: 'Via Milano 5', password: 'password4'
            },
            {
                nome_utente: 'francesca_metallo', nome: 'Francesca', cognome: 'Rinaldi', numero_telefono: '3283456324', email: 'francesca@example.com', ruolo_id: 2, citta: 'Bologna', indirizzo: 'Via delle Industrie 30', password: 'password5'
            },
            {
                nome_utente: 'mario_admin', nome: 'Mario', cognome: 'Admin', numero_telefono: '3286840345', email: 'admin@example.com', ruolo_id: 3, citta: 'Napoli', indirizzo: 'Via Centrale 1', password: 'adminpass'
            },
            {
                nome_utente: 'elena_cliente', nome: 'Elena', cognome: 'Piazza', numero_telefono: '3282345323', email: 'elena@example.com', ruolo_id: 1, citta: 'Genova', indirizzo: 'Via Mare 12', password: 'cliente1'
            },
            {
                nome_utente: 'davide_cliente', nome: 'Davide', cognome: 'Valli', numero_telefono: '3289846328', email: 'davide@example.com', ruolo_id: 1, citta: 'Pisa', indirizzo: 'Via Torre 8', password: 'cliente2'
            },
            {
                nome_utente: 'sofia_cliente', nome: 'Sofia', cognome: 'Moretti', numero_telefono: '3282364323', email: 'sofia@example.com', ruolo_id: 1, citta: 'Trento', indirizzo: 'Via Alpina 3', password: 'cliente3'
            }
        ];

        for (const u of utenti) {
            const hash = await bcrypt.hash(u.password, saltRounds);
            await pool.query(
                `INSERT INTO utente (nome_utente, nome, cognome, numero_telefono, email, indirizzo, citta, password_hash, ruolo_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [u.nome_utente, u.nome, u.cognome, u.numero_telefono, u.email, u.indirizzo, u.citta, hash, u.ruolo_id]
            );
        }

        // Recupera gli ID degli artigiani
        const artigianiRes = await pool.query("SELECT id, nome_utente FROM utente WHERE ruolo_id = 2");
        const tipologie = {
            'giulia_tessuti': 3,
            'marco_legno': 2,
            'alessia_gioielli': 4,
            'luigi_vetro': 5,
            'francesca_metallo': 8
        };

        for (const artigiano of artigianiRes.rows) {
            const tipo = tipologie[artigiano.nome_utente];
            await pool.query(
                `INSERT INTO artigiani (artigiano_id, tipologia_id, iban, immagine)
                 VALUES ($1, $2, $3, NULL)`,
                [artigiano.id, tipo, 'IT60X0542811101000000123456']
            );
        }

        // --- INSERIMENTO PRODOTTI ---
        const prodotti = [
            // Giulia - Tessuti
            { nome: 'Cuscino ricamato', tipologia_id: 3, prezzo: 25.00, desc: 'Cuscino in lino con ricami floreali.', art: 'giulia_tessuti' },
            { nome: 'Tenda artigianale', tipologia_id: 3, prezzo: 60.00, desc: 'Tenda fatta a mano in cotone.', art: 'giulia_tessuti' },

            // Marco - Legno
            { nome: 'Tagliere in legno di ulivo', tipologia_id: 2, prezzo: 30.00, desc: 'Tagliere robusto e durevole.', art: 'marco_legno' },
            { nome: 'Lampada da tavolo in legno', tipologia_id: 2, prezzo: 70.00, desc: 'Lampada dallo stile rustico.', art: 'marco_legno' },

            // Alessia - Gioielli
            { nome: 'Collana in argento', tipologia_id: 4, prezzo: 45.00, desc: 'Collana lavorata a mano in argento 925.', art: 'alessia_gioielli' },

            // Luigi - Vetro
            { nome: 'Bicchieri soffiati a mano', tipologia_id: 5, prezzo: 55.00, desc: 'Set di bicchieri colorati.', art: 'luigi_vetro' },

            // Francesca - Metallo
            { nome: 'Lampadario in ferro battuto', tipologia_id: 8, prezzo: 120.00, desc: 'Lampadario rustico e decorativo.', art: 'francesca_metallo' },
        ];

        for (const p of prodotti) {
            const res = await pool.query("SELECT id FROM utente WHERE nome_utente = $1", [p.art]);
            const artId = res.rows[0].id;
            await pool.query(
                `INSERT INTO prodotti (artigiano_id, nome_prodotto, tipologia_id, prezzo, immagine, descrizione, quant)
                 VALUES ($1, $2, $3, $4, NULL, $5, $6)`,
                [artId, p.nome, p.tipologia_id, p.prezzo, p.desc, 10]
            );
        }

        console.log('Seed completato con successo.');
    } catch (error) {
        console.error('Errore durante il seed:', error);
    }
}

seed();
