// server.js corrigido

const express = require('express');
const multer = require('multer');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session config
app.use(session({
  secret: 'seusegredoaqui',
  resave: false,
  saveUninitialized: true
}));

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middleware de autenticação
function checkAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    next();
  } else {
    res.redirect('/login.html');
  }
}

// Rotas
app.get('/', (req, res) => {
  res.redirect('/admin-sarcas.html');
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin') {
    req.session.authenticated = true;
    res.redirect('/admin-sarcas.html');
  } else {
    res.redirect('/login.html');
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/logout.html');
  });
});

// Upload para banners-sarcas
app.post('/upload', checkAuth, upload.single('banner'), async (req, res) => {
  const { file } = req;
  const { titulo, data, descricao } = req.body;
  if (!file) return res.status(400).send('Nenhum arquivo enviado.');

  try {
    cloudinary.uploader.upload_stream({
      folder: 'banners_sarcas',
      resource_type: 'image'
    }, (error, result) => {
      if (error) return res.status(500).send('Erro ao enviar imagem.');

      let banners = [];
      try {
        const dataFile = fs.readFileSync(path.join(__dirname, 'banners-sarcas.json'));
        banners = dataFile.length ? JSON.parse(dataFile) : [];
      } catch (e) {
        banners = [];
      }

      banners.push({
        url: result.secure_url,
        nome: file.originalname,
        titulo,
        data,
        descricao
      });

      fs.writeFileSync(path.join(__dirname, 'banners-sarcas.json'), JSON.stringify(banners, null, 2));
      res.redirect('/admin-sarcas.html');
    }).end(file.buffer);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro interno.');
  }
});

// Deletar banner
app.post('/delete', checkAuth, (req, res) => {
  const { url } = req.body;
  let banners = JSON.parse(fs.readFileSync(path.join(__dirname, 'banners-sarcas.json')));
  banners = banners.filter(b => b.url !== url);
  fs.writeFileSync(path.join(__dirname, 'banners-sarcas.json'), JSON.stringify(banners, null, 2));
  res.redirect('/admin-sarcas.html');
});

// Servir o JSON dos banners
app.get('/banners-sarcas.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'banners-sarcas.json'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

