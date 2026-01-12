const axios = require('axios');
const https = require('https');
require('dotenv').config();

// Creamos un agente que ignora el error de certificado
const agent = new https.Agent({  
  rejectUnauthorized: false
});

// Configuramos Axios con ese agente y la URL de tu .env
const client = axios.create({
  baseURL: process.env.API_BASE_URL,
  httpsAgent: agent
});

module.exports = client;