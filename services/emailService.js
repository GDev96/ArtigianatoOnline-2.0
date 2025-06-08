const nodemailer = require('nodemailer');

// Configurazione del trasportatore email con miglioramenti
const createTransporter = () => {
    console.log('📧 Creazione trasportatore email...');
    console.log('EMAIL_USER:', process.env.EMAIL_USER || 'NON DEFINITO');
    console.log('EMAIL_APP_PASSWORD:', process.env.EMAIL_APP_PASSWORD ? 'DEFINITO' : 'NON DEFINITO');
    
    return nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER || 'fratg.dev@gmail.com',
            pass: process.env.EMAIL_APP_PASSWORD || 'buct oxoj fwqn zsew'
        },
        tls: {
            rejectUnauthorized: false
        },
        // Configurazioni aggiuntive per affidabilità
        connectionTimeout: 30000, // 30 seconds
        greetingTimeout: 30000,
        socketTimeout: 30000
    });
};

const sendPasswordRecoveryEmail = async (email, recoveryLink) => {
    console.log('\n🔗 === LINK DI RECUPERO PASSWORD ===');
    console.log(recoveryLink);
    console.log('💡 Copia questo link per testare direttamente il reset password.');
    console.log('=====================================\n');
    
    try {
        console.log('📤 Tentativo invio email...');
        
        const transporter = createTransporter();
        
        // Test della connessione prima dell'invio
        console.log('🔌 Verifica connessione Gmail...');
        await transporter.verify();
        console.log('✅ Connessione Gmail verificata');
        
        const mailOptions = {
            from: process.env.EMAIL_USER || 'fratg.dev@gmail.com',
            to: email,
            subject: 'Recupero Password - Artigianato Online',
            text: `
            Recupero Password - Artigianato Online

            Hai richiesto il recupero della password per il tuo account su Artigianato Online.

            Per reimpostare la tua password, copia e incolla il seguente link nel tuo browser:
            ${recoveryLink}

            Il link scadrà tra un'ora per motivi di sicurezza.

            Se non hai richiesto il recupero della password, ignora questa email.

            Questa è un'email automatica, non rispondere a questo indirizzo.
            `,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">🔐 Recupero Password</h2>
                    <p>Hai richiesto il recupero della password per il tuo account su <strong>Artigianato Online</strong>.</p>
                    <p>Clicca sul link seguente per reimpostare la tua password:</p>
                    <p style="margin: 20px 0; text-align: center;">
                        <a href="${recoveryLink}" 
                           style="background-color: #4CAF50; color: white; padding: 15px 25px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;
                                  font-weight: bold;">
                            🔓 Reimposta Password
                        </a>
                    </p>
                    <p>Se il pulsante non funziona, copia e incolla questo link nel tuo browser:</p>
                    <p style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; word-break: break-all; border: 1px solid #ddd;">
                        <code style="font-family: monospace; font-size: 14px;">${recoveryLink}</code>
                    </p>
                    
                    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <strong>⚠️ Importante:</strong>
                        <ul style="margin: 10px 0;">
                            <li>Il link scadrà tra <strong>1 ora</strong> per motivi di sicurezza</li>
                            <li>Può essere utilizzato <strong>una sola volta</strong></li>
                            <li>Se non hai richiesto il recupero, ignora questa email</li>
                        </ul>
                    </div>
                    
                    <hr style="border: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #666; font-size: 12px; text-align: center;">
                        Questa è un'email automatica, non rispondere a questo indirizzo.<br>
                        © 2024 Artigianato Online - Tutti i diritti riservati
                    </p>
                </div>
            `
        };

        console.log('📧 Invio email in corso...');
        const result = await transporter.sendMail(mailOptions);
        
        console.log('\n🎉 Email di recupero inviata con successo!');
        console.log('Message ID:', result.messageId);
        
        // Log email details for debug (come nel tuo codice originale)
        console.log('\n=== DEBUG: EMAIL INVIATA ===');
        console.log('Da:', mailOptions.from);
        console.log('A:', mailOptions.to);
        console.log('Oggetto:', mailOptions.subject);
        console.log('\n=== CONTENUTO EMAIL (TEXT) ===');
        console.log(mailOptions.text);
        console.log('\n=== LINK DI RECUPERO ===');
        console.log(recoveryLink);
        console.log('\n=== ID MESSAGGIO ===');
        console.log(result.messageId);
        console.log('============================\n');
        
        return true;
        
    } catch (error) {
        console.error('\n❌ Errore nell\'invio dell\'email:', error);
        console.error('Tipo errore:', error.name);
        console.error('Messaggio:', error.message);
        console.error('Codice:', error.code);
        
        // Dettagli aggiuntivi per il debug
        if (error.response) {
            console.error('Risposta server:', error.response);
        }
        if (error.responseCode) {
            console.error('Codice risposta:', error.responseCode);
        }
        
        // Suggerimenti specifici per Gmail
        if (error.code === 'EAUTH') {
            console.error('\n💡 PROBLEMA DI AUTENTICAZIONE GMAIL:');
            console.error('1. Verifica che l\'account abbia l\'autenticazione a 2 fattori attiva');
            console.error('2. Usa una "Password per le app" generata da Gmail, non la password normale');
            console.error('3. Vai su: https://myaccount.google.com/apppasswords');
            console.error('4. La password attuale potrebbe essere scaduta');
        } else if (error.code === 'ENOTFOUND') {
            console.error('\n💡 PROBLEMA DI CONNESSIONE:');
            console.error('1. Verifica la connessione internet');
            console.error('2. Potrebbe essere un problema di DNS o firewall');
        } else if (error.code === 'ETIMEDOUT') {
            console.error('\n💡 PROBLEMA DI TIMEOUT:');
            console.error('1. La connessione a Gmail è troppo lenta');
            console.error('2. Riprova tra qualche minuto');
        }
        
        console.error('\n🔄 Il link di recupero è comunque disponibile sopra per il test.\n');
        
        // Rilancia l'errore come nel tuo codice originale
        throw error;
    }
};

module.exports = {
    sendPasswordRecoveryEmail
};