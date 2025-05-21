require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// View engine
/*app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));*/
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const indexRouter = require('./routes/index');
app.use('/', indexRouter);
app.use('/api', indexRouter);

// Server start
app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});

// Users route
const utentiRouter = require('./routes/users');
app.use('/api/users', utentiRouter);

//Products route
const productsRouter = require('./routes/products');
app.use('/api/products', productsRouter);