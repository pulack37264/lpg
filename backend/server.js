const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const bcrypt = require('bcryptjs');
const { sql, poolPromise } = require('./db');
const { generateToken } = require('./auth');
const { authenticate, authorizeRole } = require('./middleware/auth');

const app = express();

const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : [];

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.length === 0) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

function sendError(res, message, status = 400) {
  return res.status(status).json({ success: false, error: message });
}

function isValidEmail(email) {
  return typeof email === 'string' && /.+@.+\..+/.test(email);
}

app.post('/api/customers/register', authLimiter, async (req, res) => {
  const { name, email, password, address, phone } = req.body;
  if (!name || !email || !password || !address || !phone) {
    return sendError(res, 'Name, email, password, address, and phone are required.');
  }

  if (!isValidEmail(email)) {
    return sendError(res, 'A valid email address is required.');
  }

  if (password.length < 8) {
    return sendError(res, 'Password must be at least 8 characters long.');
  }

  try {
    const pool = await poolPromise;
    const existing = await pool
      .request()
      .input('email', sql.NVarChar, email)
      .query('SELECT Id FROM Customers WHERE Email = @email');

    if (existing.recordset.length > 0) {
      return sendError(res, 'A customer with that email already exists.', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await pool
      .request()
      .input('name', sql.NVarChar, name)
      .input('email', sql.NVarChar, email)
      .input('passwordHash', sql.NVarChar, hashedPassword)
      .input('address', sql.NVarChar, address)
      .input('phone', sql.NVarChar, phone)
      .query(
        'INSERT INTO Customers (Name, Email, PasswordHash, Address, Phone, IsActive) OUTPUT INSERTED.Id VALUES (@name, @email, @passwordHash, @address, @phone, 1)'
      );

    const customer = result.recordset[0];
    const token = generateToken({ id: customer.Id, role: 'customer', name, email });

    return res.json({
      success: true,
      token,
      user: {
        id: customer.Id,
        name,
        email,
        address,
        phone,
        role: 'customer',
      },
    });
  } catch (error) {
    console.error(error);
    return sendError(res, 'Unable to register customer.');
  }
});

app.post('/api/login/customer', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return sendError(res, 'Email and password are required.');
  }

  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('email', sql.NVarChar, email)
      .query('SELECT Id, Name, Email, PasswordHash, Address, Phone FROM Customers WHERE Email = @email AND IsActive = 1');

    const user = result.recordset[0];
    if (!user || !(await bcrypt.compare(password, user.PasswordHash))) {
      return sendError(res, 'Invalid customer credentials.', 401);
    }

    const token = generateToken({ id: user.Id, role: 'customer', name: user.Name, email: user.Email });
    return res.json({
      success: true,
      token,
      user: {
        id: user.Id,
        name: user.Name,
        email: user.Email,
        address: user.Address,
        phone: user.Phone,
        role: 'customer',
      },
    });
  } catch (error) {
    console.error(error);
    return sendError(res, 'Unable to login customer.');
  }
});

app.post('/api/login/admin', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return sendError(res, 'Email and password are required.');
  }

  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('email', sql.NVarChar, email)
      .query('SELECT Id, Name, Email, PasswordHash FROM Admins WHERE Email = @email');

    const user = result.recordset[0];
    if (!user || !(await bcrypt.compare(password, user.PasswordHash))) {
      return sendError(res, 'Invalid admin credentials.', 401);
    }

    const token = generateToken({ id: user.Id, role: 'admin', name: user.Name, email: user.Email });
    return res.json({
      success: true,
      token,
      user: {
        id: user.Id,
        name: user.Name,
        email: user.Email,
        role: 'admin',
      },
    });
  } catch (error) {
    console.error(error);
    return sendError(res, 'Unable to login admin.');
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT Id, Name, Description, Price, Tag, Stock FROM Products ORDER BY Id');
    return res.json({ success: true, products: result.recordset });
  } catch (error) {
    console.error(error);
    return sendError(res, 'Unable to load products.');
  }
});

app.get('/api/customer/profile', authenticate, authorizeRole('customer'), async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id', sql.Int, req.user.id)
      .query('SELECT Id, Name, Email, Address, Phone FROM Customers WHERE Id = @id');

    if (!result.recordset.length) {
      return sendError(res, 'Customer not found.', 404);
    }

    return res.json({ success: true, profile: result.recordset[0] });
  } catch (error) {
    console.error(error);
    return sendError(res, 'Unable to load customer profile.');
  }
});

app.post('/api/order', authenticate, authorizeRole('customer'), async (req, res) => {
  const { items, total, shippingAddress, phone } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0 || typeof total !== 'number') {
    return sendError(res, 'Items and total are required.');
  }

  try {
    const pool = await poolPromise;
    const order = await pool
      .request()
      .input('customerId', sql.Int, req.user.id)
      .input('total', sql.Decimal(10, 2), total)
      .input('items', sql.NVarChar(sql.MAX), JSON.stringify(items))
      .input('address', sql.NVarChar, shippingAddress || '')
      .input('phone', sql.NVarChar, phone || '')
      .query(
        'INSERT INTO Orders (CustomerId, Total, Items, ShippingAddress, Phone) OUTPUT INSERTED.Id, INSERTED.CreatedAt VALUES (@customerId, @total, @items, @address, @phone)'
      );

    const inserted = order.recordset[0];
    return res.json({ success: true, orderId: inserted.Id, createdAt: inserted.CreatedAt });
  } catch (error) {
    console.error(error);
    return sendError(res, 'Unable to submit order.');
  }
});

app.get('/api/admin/orders', authenticate, authorizeRole('admin'), async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .query(
        `SELECT O.Id, C.Name AS CustomerName, C.Email AS CustomerEmail, O.Total, O.Items, O.ShippingAddress, O.Phone, O.Status, O.CreatedAt
         FROM Orders O
         JOIN Customers C ON O.CustomerId = C.Id
         ORDER BY O.CreatedAt DESC`
      );

    const orders = result.recordset.map((order) => ({
      id: order.Id,
      customerName: order.CustomerName,
      customerEmail: order.CustomerEmail,
      total: order.Total,
      shippingAddress: order.ShippingAddress,
      phone: order.Phone,
      status: order.Status,
      createdAt: order.CreatedAt,
      items: JSON.parse(order.Items),
    }));

    return res.json({ success: true, orders });
  } catch (error) {
    console.error(error);
    return sendError(res, 'Unable to load admin orders.');
  }
});

app.get('/api/admin/products', authenticate, authorizeRole('admin'), async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT Id, Name, Description, Price, Tag, Stock FROM Products ORDER BY Id');
    return res.json({ success: true, products: result.recordset });
  } catch (error) {
    console.error(error);
    return sendError(res, 'Unable to load admin products.');
  }
});

app.post('/api/admin/products', authenticate, authorizeRole('admin'), async (req, res) => {
  const { name, description, price, tag, stock } = req.body;
  if (!name || !description || typeof price !== 'number' || !tag) {
    return sendError(res, 'Name, description, price, tag, and stock are required.');
  }

  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('name', sql.NVarChar, name)
      .input('description', sql.NVarChar, description)
      .input('price', sql.Decimal(10, 2), price)
      .input('tag', sql.NVarChar, tag)
      .input('stock', sql.Int, stock || 0)
      .query(
        'INSERT INTO Products (Name, Description, Price, Tag, Stock) OUTPUT INSERTED.Id VALUES (@name, @description, @price, @tag, @stock)'
      );

    return res.json({ success: true, productId: result.recordset[0].Id });
  } catch (error) {
    console.error(error);
    return sendError(res, 'Unable to create product.');
  }
});

app.put('/api/admin/products/:id', authenticate, authorizeRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { name, description, price, tag, stock } = req.body;
  if (!name || !description || typeof price !== 'number' || !tag) {
    return sendError(res, 'Name, description, price, tag, and stock are required.');
  }

  try {
    const pool = await poolPromise;
    await pool
      .request()
      .input('id', sql.Int, id)
      .input('name', sql.NVarChar, name)
      .input('description', sql.NVarChar, description)
      .input('price', sql.Decimal(10, 2), price)
      .input('tag', sql.NVarChar, tag)
      .input('stock', sql.Int, stock || 0)
      .query('UPDATE Products SET Name = @name, Description = @description, Price = @price, Tag = @tag, Stock = @stock WHERE Id = @id');

    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return sendError(res, 'Unable to update product.');
  }
});

app.delete('/api/admin/products/:id', authenticate, authorizeRole('admin'), async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await poolPromise;
    await pool
      .request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Products WHERE Id = @id');

    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return sendError(res, 'Unable to delete product.');
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

const port = Number(process.env.PORT) || 3000;
const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use.`);
    console.error('Either stop the process using that port, or set a different port in backend/.env or the PORT environment variable.');
    process.exit(1);
  }
  console.error('Server error:', error);
  process.exit(1);
});
