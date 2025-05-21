

# TO-DO LIST
## FRONTEND

Legenda:
✅ Completato
⏳ In corso 
❌ Da fare

| Descrizione                                                                 | Assegnato a | Nome Branch | Stato       |
|-----------------------------------------------------------------------------|-----------|-------------|-------------|
| Creare strutture pagine HTML                                                | Gaia         | -           | ✅ Completato |
| Nella pagina home creare delle schede che colleghino al catalogo di ciascun artigiano | Gaia      | homepage (❌ Cancellato)   | ✅ Completato  |
| Pagina catalogo             | Gaia         | catalogpage (❌ Cancellato)          | ✅ Completato   |
| Profilo artigiano nella pagina catalogo                | Gaia         | catalogpage (❌ Cancellato)          | ✅ Completato   |
| Pagina di login               | Gaia         | loginpage (❌ Cancellato)          | ✅ Completato    |
| Modale di registrazione utente              | Gaia         | loginpage (❌ Cancellato)           | ✅ Completato   |
| Pagina carrello                | Gaia         | cartpage(❌ Cancellato)           | ✅ Completato   |
| Modale conferma ordine                | Gaia         | cartpage(❌ Cancellato)           | ✅ Completato   |
| Dashboard artigiano                | Gaia         | dashboard (❌ Cancellato)          | ✅ Completato   |
| Interfaccia navbar utente loggato               | Gaia         | navlogin (❌ Cancellato)        | ✅ Completato   |
| Interfaccia admin              | Gaia        | adminconsole2          | ❌ Da fare   |
| Interfaccia profilo utente per riepilogo ordini e visualizzazione dati              | Gaia        | userprofile          | ✅ Completato   |
| Correggere pagina catalogo             | Gaia        | fixcatalog         | ❌ Da fare   |
| Correggere pagina carrello              | Gaia        |           | ❌ Da fare   |
| Correggere pagina profilo              | Gaia        |           | ❌ Da fare   |
| Correggere logica pagina dashboard              | Gaia        |           | ❌ Da fare   |
| Gestire recensioni catalogo             | Gaia        |         | ❌ Da fare   |
| Gestire segnalazioni catalogo             | Gaia        |         | ❌ Da fare   |


## BACKEND PAGINE HTML
_Necessario il db_
| Descrizione                                                                 | Assegnato a | Nome Branch | Stato       |
|-----------------------------------------------------------------------------|-----------|-------------|-------------|
| Rotte con parametri per passaggi tra pagine             | Gaia         | navlogin (❌ Cancellato)           | ✅ Completato  |
| Interrogazione db per popolare le pagine e i menu a tendina                | Gaia         | -           | ❌ Da fare   |
| Salvataggio dati a db per registrazione utenti e inserimento prodotti                | Gaia         | -           | ❌ Da fare   |

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
| Creare DB (tabelle utenti, prodotti) | Fede    | -           | ⏳ In corso     |

## BACKEND
| Descrizione                                                                 | Assegnato a | Nome Branch | Stato       |
|-----------------------------------------------------------------------------|-----------|-------------|-------------|
| API necessarie alla connessione e accesso ai dati del db dall'applicazione             | -         | -           | ❌ Da fare   |
| Autenticazione e permessi - creazione e utilizzo dei token (parte delle API)                | -         | -           | ❌ Da fare   |
| Deploy e connessione al cloud del db                | -         | -           | ❌ Da fare   |
| Unit e integration testing               | -         | -           | ❌ Da fare   |





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
