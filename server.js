const express = require('express');
const mysql = require('mysql');
const path = require('path');
const cors = require('cors');
const app = express();
const port = 3000;

// MySQL connection setup
const db = mysql.createConnection({
  host: 'localhost',
  port:3306,
  user: 'root',
  password: 'New-p@ssword12321',
  database: 'sys'
});

db.connect(err => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL');
});

// Middleware to parse JSON requests
app.use(express.json());
app.use(cors()); // Add CORS support
app.use(express.static(path.join(__dirname, './assets'))); // Serve static files

// Define a route to fetch data
// app.get('/api/data', (req, res) => {
//   const query = 'SELECT * FROM tblcustomers';
//   db.query(query, (err, results) => {
//     if (err) {
//       res.status(500).json({ error: err.message });
//       return;
//     }
//     res.json(results);
//   });
// });

app.get('/api/data/:username/:password', (req, res) => {
  const { username, password } = req.params;
  const query = 'SELECT CASE WHEN EXISTS (SELECT * FROM tbladmin WHERE BINARY username = ? AND Password = ?) THEN "true" ELSE "false" END AS RecordExists';
  db.query(query, [username, password], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ success: results[0].RecordExists === 'true' });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
