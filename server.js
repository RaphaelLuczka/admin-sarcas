
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static('public'));

app.use(session({
  secret: 'rochaSecret123',
  resave: false,
  saveUninitialized: true,
}));

// Configuração de armazenamento para multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage });

// Middleware de autenticação
function checkAuth(req, res, next) {
  if (req.session.loggedIn) return next();
  return res.redirect('/login.html');
}

// Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === '1234') {
    req.session.loggedIn = true;
    res.redirect('/admin.html');
  } else {
    res.send('Usuário ou senha inválidos');
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login.html');
});

// Enviar banner
app.post('/upload', checkAuth, upload.single('banner'), (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).send('Nenhum arquivo enviado.');

  let banners = [];
  try {
    const data = fs.readFileSync('banners.json');
    banners = data.length ? JSON.parse(data) : [];
  } catch (e) {
    banners = [];
  }
  banners.push({ url: '/uploads/' + file.filename, nome: file.originalname });
  fs.writeFileSync('banners.json', JSON.stringify(banners, null, 2));
  res.redirect('/admin.html');
});

// Deletar banner
app.post('/delete', checkAuth, (req, res) => {
  const { url } = req.body;
  let banners = JSON.parse(fs.readFileSync('banners.json'));
  banners = banners.filter(b => b.url !== url);
  fs.writeFileSync('banners.json', JSON.stringify(banners, null, 2));
  res.redirect('/admin.html');
});

// API pública
app.get('/banners.json', (req, res) => {
  const data = fs.readFileSync('banners.json');
  res.setHeader('Content-Type', 'application/json');
  res.send(data);
});

// Rota principal para exibir o login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});


// Forçando teste deploy no Railway
app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
// teste