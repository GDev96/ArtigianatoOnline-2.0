const nodemailer = require('nodemailer');

// Configurazione del trasportatore email
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

const sendPasswordRecoveryEmail = async (email, recoveryLink) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Recupero Password - Artigianato Online',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Recupero Password</h2>
                    <p>Hai richiesto il recupero della password per il tuo account su Artigianato Online.</p>
                    <p>Clicca sul link seguente per reimpostare la tua password:</p>
                    <p style="margin: 20px 0;">
                        <a href="${recoveryLink}" 
                           style="background-color: #4CAF50; color: white; padding: 10px 20px; 
                                  text-decoration: none; border-radius: 5px;">
                            Reimposta Password
                        </a>
                    </p>
                    <p>Il link scadrà tra un'ora per motivi di sicurezza.</p>
                    <p>Se non hai richiesto il recupero della password, ignora questa email.</p>
                    <hr style="border: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #666; font-size: 12px;">
                        Questa è un'email automatica, non rispondere a questo indirizzo.
                    </p>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('Email di recupero inviata:', result.messageId);
        return true;
    } catch (error) {
        console.error('Errore nell\'invio dell\'email:', error);
        throw error;
    }
};

module.exports = {
    sendPasswordRecoveryEmail
};