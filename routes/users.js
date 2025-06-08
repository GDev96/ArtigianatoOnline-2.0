const express = require('express');
const bcrypt = require('bcrypt');
const { getPool } = require('../db/db');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const createAuthMiddleware = require('../middleware/auth');

const requireAuth = createAuthMiddleware();

// Get user by ID
router.get('/api/:id', async (req, res) => {
    const client = await getPool().connect();
    try {
        const userId = req.params.id;
        
        const query = `
            SELECT u.id, u.username, u.nome, u.cognome, u.email, 
                   u.numero_telefono, u.indirizzo, u.citta, u.ruolo_id,
                   u.stato, u.updated_at
            FROM utente u
            WHERE u.id = $1`;
            
        const result = await client.query(query, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Utente non trovato'
            });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dei dati utente'
        });
    } finally {
        client.release();
    }
});

// Get tutti gli artigiani attivi - pubblica
router.get('/artisans', async (req, res) => {
    const client = await getPool().connect();
    try {
        const query = `
            SELECT 
                u.id,
                u.nome,
                u.cognome,
                u.email,
                u.numero_telefono,
                u.indirizzo,
                u.citta,
                u.stato,
                a.tipologia_id,
                t.nome_tipologia,
                a.immagine,
                COALESCE(
                    (SELECT TRUE 
                     FROM sospensioni_artigiani sa 
                     WHERE sa.artigiano_id = u.id 
                     AND (sa.data_fine IS NULL OR sa.data_fine > CURRENT_TIMESTAMP)
                     AND sa.rimossa_da_admin = FALSE
                     LIMIT 1),
                    FALSE
                ) as is_suspended
            FROM utente u
            INNER JOIN artigiani a ON u.id = a.artigiano_id
            LEFT JOIN tipologia t ON a.tipologia_id = t.tipologia_id
            WHERE u.ruolo_id = 2 AND u.stato = 'attivo'
            ORDER BY u.cognome, u.nome`;

        const result = await client.query(query);

        res.json({
            success: true,
            artisans: result.rows.map(artisan => ({
                ...artisan,
                immagine: artisan.immagine ? artisan.immagine.toString('base64') : null
            }))
        });

    } catch (error) {
        console.error('Error fetching artisans:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero degli artigiani'
        });
    } finally {
        client.release();
    }
});

// Get artisan by ID with suspension status
router.get('/api/artisan/:id', async (req, res) => {
    const client = await getPool().connect();
    try {
        const artisanId = req.params.id;
        
        const query = `
            SELECT 
                u.id,
                u.nome,
                u.cognome,
                u.email,
                u.numero_telefono,
                u.indirizzo,
                u.citta,
                u.stato,
                a.tipologia_id,
                t.nome_tipologia,
                a.immagine,
                a.iban,
                COALESCE(
                    (SELECT TRUE 
                     FROM sospensioni_artigiani sa 
                     WHERE sa.artigiano_id = u.id 
                     AND (sa.data_fine IS NULL OR sa.data_fine > CURRENT_TIMESTAMP)
                     AND sa.rimossa_da_admin = FALSE
                     LIMIT 1),
                    FALSE
                ) as is_suspended,
                (SELECT sa.data_fine_prevista 
                 FROM sospensioni_artigiani sa 
                 WHERE sa.artigiano_id = u.id 
                 AND (sa.data_fine IS NULL OR sa.data_fine > CURRENT_TIMESTAMP)
                 AND sa.rimossa_da_admin = FALSE
                 ORDER BY sa.data_inizio DESC 
                 LIMIT 1) as suspension_end_date
            FROM utente u
            INNER JOIN artigiani a ON u.id = a.artigiano_id
            LEFT JOIN tipologia t ON a.tipologia_id = t.tipologia_id
            WHERE u.id = $1 AND u.ruolo_id = 2`;

        const result = await client.query(query, [artisanId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Artigiano non trovato'
            });
        }

        const artisan = {
            ...result.rows[0],
            immagine: result.rows[0].immagine ? result.rows[0].immagine.toString('base64') : null
        };

        res.json({
            success: true,
            artisan: artisan
        });

    } catch (error) {
        console.error('Error fetching artisan:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dei dati dell\'artigiano'
        });
    } finally {
        client.release();
    }
});

// Update user/artisan data with transaction
router.put('/update/:id', requireAuth, async (req, res) => {
    const client = await getPool().connect();
    try {
        const userId = req.params.id;
        const updates = req.body;
        
        if (userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Non autorizzato ad aggiornare questo profilo'
            });
        }

        const userFields = {};
        const artisanFields = {};
        
        Object.entries(updates).forEach(([key, value]) => {
            if (key === 'tipologia_id' || key === 'iban') {
                artisanFields[key] = value;
            } else if (['id', 'ruolo_id', 'password_hash', 'stato'].indexOf(key) === -1) {
                userFields[key] = value;
            }
        });

        await client.query('BEGIN');

        let userData = null;

        if (Object.keys(userFields).length > 0) {
            const userSetClause = Object.keys(userFields)
                .map((key, index) => `${key} = $${index + 1}`)
                .join(', ');
            
            const userQuery = `
                UPDATE utente 
                SET ${userSetClause}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $${Object.keys(userFields).length + 1}
                RETURNING id, username, nome, cognome, email, numero_telefono, indirizzo, citta, stato, updated_at`;

            const userResult = await client.query(
                userQuery, 
                [...Object.values(userFields), userId]
            );
            userData = userResult.rows[0];
        }

        if (Object.keys(artisanFields).length > 0 && req.user.ruolo_id === 2) {
            const artisanSetClause = Object.keys(artisanFields)
                .map((key, index) => `${key} = $${index + 1}`)
                .join(', ');

            await client.query(
                `UPDATE artigiani 
                 SET ${artisanSetClause}
                 WHERE artigiano_id = $${Object.keys(artisanFields).length + 1}`,
                [...Object.values(artisanFields), userId]
            );
        }

        if (!userData) {
            const getUserQuery = `
                SELECT id, username, nome, cognome, email, numero_telefono, 
                       indirizzo, citta, stato, updated_at
                FROM utente 
                WHERE id = $1`;
            const userResult = await client.query(getUserQuery, [userId]);
            userData = userResult.rows[0];
        }

        if (req.user.ruolo_id === 2) {
            const artisanQuery = `
                SELECT tipologia_id, iban 
                FROM artigiani 
                WHERE artigiano_id = $1`;
            const artisanResult = await client.query(artisanQuery, [userId]);
            if (artisanResult.rows.length > 0) {
                userData = { ...userData, ...artisanResult.rows[0] };
            }
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            user: userData
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiornamento del profilo'
        });
    } finally {
        client.release();
    }
});

// Update artisan profile image
router.post('/profile/image', requireAuth, upload.single('profileImage'), async (req, res) => {
    const client = await getPool().connect();
    try {
        if (req.user.ruolo_id !== 2) {
            return res.status(403).json({
                success: false,
                message: 'Solo gli artigiani possono aggiornare l\'immagine del profilo'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Nessuna immagine caricata'
            });
        }

        const imageBuffer = req.file.buffer;

        const result = await client.query(
            'UPDATE artigiani SET immagine = $1 WHERE artigiano_id = $2 RETURNING immagine',
            [imageBuffer, req.user.id]
        );

        if (result.rows.length === 0) {
            throw new Error('Errore nell\'aggiornamento dell\'immagine');
        }

        res.json({ 
            success: true, 
            message: 'Immagine aggiornata con successo',
            image: result.rows[0].immagine.toString('base64')
        });

    } catch (error) {
        console.error('Error updating profile image:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Errore durante l\'aggiornamento dell\'immagine' 
        });
    } finally {
        client.release();
    }
});

module.exports = router;