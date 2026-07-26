const express = require('express');
const bodyParser = require('body-parser');
const proxyHandler = require('./api/proxy');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.all('/api/proxy', (req, res) => {
  // Adapt serverless handler signature: pass req, res through
  proxyHandler(req, res);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Dev proxy listening on http://localhost:${PORT}/api/proxy`));
