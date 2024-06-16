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
  database: 'salonsystem'
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

app.get('/api/fetchtimeslots', (req, res) => {
  const {EmployeeID, AptDate } = req.query;
  const query = 'SELECT * FROM tbltimeslots WHERE ID NOT IN (SELECT AptTimeID FROM tblappointment WHERE EmployeeID = ? AND AptDate = ?)';
  db.query(query, [EmployeeID, AptDate], (err, results) => {
    if (err) {
      console.error('API ERROR:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results); // Send the results directly
  });
});

app.get('/api/fetchServiceNames', (req, res) => {
  const query = 'SELECT * FROM tblservices';
  db.query(query, (err, results) => {
      if (err) {
          console.error('API ERROR:', err);
          res.status(500).json({ error: err.message });
          return;
      }
      res.json(results); // Send the results directly
  });
});

app.get('/api/barbers', (req, res) => {
  const query = 'SELECT * FROM tblemployee';
  db.query(query, (err, results) => {
      if (err) {
          console.error('API ERROR:', err);
          res.status(500).json({ error: err.message });
          return;
      }
      res.json(results); // Send the results directly
  });
});

// API endpoint to insert a new appointment
app.post('/api/AddAppointments', (req, res) => {
  const { name, employeeid, adate, atime, email, phone, Remarks, selectedServices } = req.body;


  // Validate the input
  if (!name || !employeeid || !adate || !atime || !email || !phone || !selectedServices || selectedServices.length === 0) {
      return res.status(400).json({ error: 'Name, EmployeeID, AptDate, AptTimeID, Email, Services, and PhoneNumber are required' });
  }

  // Insert appointment query
  const appointmentQuery = 'INSERT INTO tblappointment (Name, EmployeeID, AptDate, AptTimeID, Email, PhoneNumber, Remarks) VALUES (?, ?, ?, ?, ?, ?, ?)';
  db.query(appointmentQuery, [name, employeeid, adate, atime, email, phone, Remarks], (err, result) => {
      if (err) {
          console.error('API ERROR:', err);
          return res.status(500).json({ error: err.message });
      }

      const appointmentID = result.insertId;

      const invoicequery = 'INSERT INTO tblinvoice (AppointmentID) VALUES (?)';
      db.query(invoicequery,[result.insertId],(err,invoice_result) =>{
      if (err) {
      console.error('API ERROR:', err);
      return res.status(500).json({ error: err.message });
      }


      // Check if the InvoiceID exists or create a new invoice
      const invoiceID = invoice_result.insertId; // Assuming InvoiceID is passed in the request body

      if (invoiceID) {
          // InvoiceID exists, proceed with inserting into tblbilling
          const billingValues = selectedServices.map(serviceID => `(${serviceID}, ${invoiceID})`).join(',');
          const billingQuery = `INSERT INTO tblbilling (ServiceID, InvoiceID) VALUES ${billingValues}`;

          db.query(billingQuery, (billingErr, billingResult) => {
              if (billingErr) {
                  console.error('API ERROR:', billingErr);
                  return res.status(500).json({ error: billingErr.message });
              }
              
              
              return res.status(201).json({ success: true, message: 'Appointment created successfully', appointmentID });
          });
              
      } else {
        return res.status(500).json({ error: "Error generating Invoice" });
      }
  });
});
});
app.get('/api/AppointmentDetails', (req, res) => {
  const { aptno } = req.query;

  if (!aptno) {
    return res.status(400).json({ error: 'Appointment number (aptno) is required' });
  }

  const query = `
    SELECT 
      Apt.ID AS appointmentID,
      Inv.ID AS invoiceID,
      Apt.Name,
      Apt.AptDate,
      ts.TimeSlots,
      SUM(Ser.cost) AS Total 
    FROM 
      tblappointment Apt 
    JOIN 
      tblinvoice Inv ON Apt.ID = Inv.AppointmentID  
    JOIN 
      tblbilling bill ON Inv.ID = bill.InvoiceID 
    JOIN 
      tblservices Ser ON bill.ServiceID = Ser.ID 
    JOIN 
      tbltimeslots ts ON Apt.AptTimeID = ts.ID 
    WHERE 
      Apt.ID = ? 
    GROUP BY 
      Apt.ID, Apt.Name, Apt.AptDate, Inv.ID, ts.TimeSlots`;

  db.query(query, [aptno], (err, results) => {
    if (err) {
      console.error('API ERROR:', err);
      return res.status(500).json({ error: err.message });
    }
    
    res.json(results); // Send the results directly
  });
});


// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
