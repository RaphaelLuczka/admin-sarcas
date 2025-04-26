
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;

const app = express();
const PORT = process.env.PORT || 3000;

// Config Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: 'rochaSecret123',
  resave: false,
  saveUninitialized: true,
}));

// Config multer (memória)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Autenticação
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

// Upload
app.post('/upload', checkAuth, upload.single('banner'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).send('Nenhum arquivo enviado.');

  try {
    cloudinary.uploader.upload_stream(
      { folder: 'banners_rocha', resource_type: 'image' },
      (error, result) => {
        if (error) return res.status(500).send('Erro ao enviar imagem.');

        let banners = [];
        try {
          const data = fs.readFileSync('banners.json');
          banners = data.length ? JSON.parse(data) : [];
        } catch (e) {
          banners = [];
        }

        banners.push({ url: result.secure_url, nome: file.originalname });
        fs.writeFileSync('banners.json', JSON.stringify(banners, null, 2));
        res.redirect('/admin.html');
      }
    ).end(file.buffer);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro interno.');
  }
});

// Excluir banner
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

// Página inicial
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Iniciar servidor
app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
