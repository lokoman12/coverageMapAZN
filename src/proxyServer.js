const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors());

app.get('/api/lookup', async (req, res) => {
  try {
    const { locations } = req.query;
    console.log(`Fetching elevation data for locations: ${locations}`); // Добавлено логирование
    const response = await axios.get(`https://api.open-elevation.com/api/v1/lookup?locations=${locations}`);
    res.json(response.data);
  } catch (error) {
    console.error(`Error fetching elevation data: ${error.message}`); // Добавлено логирование ошибок
    res.status(500).send(`Server error: ${error.message}`); // Возвращаем сообщение об ошибке
  }
});

app.listen(port, () => {
  console.log(`Proxy server is running on http://localhost:${port}`);
});
