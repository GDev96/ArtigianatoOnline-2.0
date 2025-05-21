

# TO-DO LIST
## FRONTEND

Legenda:
✅ Completato
⏳ In corso 
❌ Da fare

| Descrizione                                                                 | Assegnato a | Nome Branch | Stato       |
|-----------------------------------------------------------------------------|-----------|-------------|-------------|
| Aggiungere file vecchio progetto                                             | Gaia         | main (primo commit)           | ✅ Completato |
| Pagina catalogo             | -         | -          | ❌ Da fare   |
| Pagina profilo utente             | -         | -          | ❌ Da fare   |
| Pagina carrello             | -         | -          | ❌ Da fare   |
| Pagina dashboard             | -         | -          | ❌ Da fare   |
| Pagina admin             | -         | -          | ❌ Da fare   |
| -             | -         | -          | ❌ Da fare   |


## BACKEND PAGINE HTML
| Descrizione                                                                 | Assegnato a | Nome Branch | Stato       |
|-----------------------------------------------------------------------------|-----------|-------------|-------------|
| Correggere API vecchio progetto             | Gaia         | fixAPI          | ⏳ In corso   |
| -             | -         | -          | ⏳ In corso   |
| API Utenti             | -         | -          | ❌ Da fare   |
| API Artigiani             | -         | -          | ❌ Da fare   |
| API prodotti             | -         | -          | ❌ Da fare   |
| API recensioni             | -         | -          | ❌ Da fare   |
| API segnalazioni             | -         | -          | ❌ Da fare   |
| API Ordini             | -         | -          | ❌ Da fare   |

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
| Creare nuovo db    | Gaia    | main   |✅ Completato





# PIATTAFORMA WEB "ARTIGIANATO ONLINE"

## Avvio dell'applicazione in locale 

_work in progress..._

### Avvio del server

```powershell
node app.js
```

URL provvisori pre-db: 
 - localhost:3000/index.html
 - localhost:3000/dashboard.html
 - localhost:3000/admin.html

---

## 🛠️ Tecnologie usate

- HTML5
- CSS3
- Immagini da [Pexels](https://www.pexels.com/)
- Icone da [Svg Repo](https://www.svgrepo.com/)

---





# Esempio di README (fatto da chat)

# 🛍️ ShopOnline - E-commerce Homepage

Benvenuto in **ShopOnline**, la homepage di un sito e-commerce responsive, moderno e minimalista.  
Questo progetto è stato sviluppato per presentare i prodotti in modo semplice e accattivante.

---

## 📸 Demo

![screenshot](screenshot.png)  
[Guarda la demo online](#) *(link opzionale)*

---

## 🚀 Funzionalità

- Navbar con link alle sezioni principali
- Hero/banner promozionale con immagine full-width
- Griglia responsive di prodotti
- Footer minimale
- HTML e CSS puri, senza framework

---

## 🛠️ Tecnologie usate

- HTML5
- CSS3 (Flexbox e Grid)
- Responsive design
- Immagini da [Pexels](https://www.pexels.com/)

---

## 📂 Struttura del progetto

```plaintext
/ (root)
│
├── index.html          # Pagina principale
├── style.css           # Stili personalizzati (se separati)
├── images/             # Immagini prodotto / banner
└── README.md           # Documentazione
