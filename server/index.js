import express from 'express';

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());

app.get('/', (_request, response) => {
  response.type('text/plain').send('Metro Saathi server is running.');
});

app.listen(port, () => {
  console.log(`Metro Saathi server listening on http://localhost:${port}`);
});
