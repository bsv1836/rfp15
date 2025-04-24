const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const flash = require('connect-flash');

dotenv.config();
const GlobalFuelPrice = require('./models/GlobalFuelPrice');
const Manager = require('./models/Manager');
const User = require('./models/User');

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// Session Configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// CSRF and Flash Middleware
app.use(csrf());
app.use(flash());

// Make CSRF token and flash messages available in templates
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  res.locals.success_msg = req.flash('success');
  res.locals.error_msg = req.flash('error');
  next();
});

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Set View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static Files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => res.render('index'));

app.get('/manager-register', (req, res) => res.render('manager-register'));

app.post('/manager-register', async (req, res) => {
  const {
    name,
    email,
    mobile,
    password,
    confirmPassword,
    fuelStationName,
    fuelStationAddress,
    fuelTypes,
  } = req.body;

  if (password !== confirmPassword) {
    return res.render('manager-register', {
      csrfToken: req.csrfToken(),
      error_msg: 'Passwords do not match'
    });
  }

  try {
    const existingManager = await Manager.findOne({ email });
    if (existingManager) {
      return res.render('manager-register', {
        csrfToken: req.csrfToken(),
        error_msg: 'Manager already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newManager = new Manager({
      name,
      email,
      mobile,
      password: hashedPassword,
      fuelStation: {
        name: fuelStationName,
        address: fuelStationAddress,
        fuelTypes: Array.isArray(fuelTypes) ? fuelTypes : [fuelTypes],
      },
    });

    await newManager.save();

    req.session.manager = {
      id: newManager._id,
      name: newManager.name,
    };

    res.redirect('/manager/dashboard');
  } catch (err) {
    console.error('Error registering manager:', err);
    res.render('manager-register', {
      csrfToken: req.csrfToken(),
      error_msg: 'Manager registration failed'
    });
  }
});

// Import Routes
const managerRoutes = require('./routes/managerRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/manager', managerRoutes);
app.use('/user', userRoutes);

// Common Login Handler
app.post('/login', async (req, res) => {
  const { email, password, role } = req.body;
  try {
    if (role === 'manager') {
      const manager = await Manager.findOne({ email });
      if (manager && (await manager.comparePassword(password))) {
        req.session.manager = {
          id: manager._id,
          name: manager.name,
          fuelStation: manager.fuelStation,
        };
        return res.redirect('/manager/dashboard');
      } else {
        return res.render('index', {
          csrfToken: req.csrfToken(),
          error_msg: 'Invalid manager credentials'
        });
      }
    } else if (role === 'user') {
      const user = await User.findOne({ email });
      if (user && (await user.comparePassword(password))) {
        req.session.user = { id: user._id, name: user.name };
        return res.redirect('/user/dashboard');
      } else {
        return res.render('index', {
          csrfToken: req.csrfToken(),
          error_msg: 'Invalid user credentials'
        });
      }
    } else {
      return res.render('index', {
        csrfToken: req.csrfToken(),
        error_msg: 'Invalid role'
      });
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.render('index', {
      csrfToken: req.csrfToken(),
      error_msg: 'Error during login'
    });
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Error destroying session:', err);
      return res.redirect('/');
    }
    res.redirect('/');
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).send('404 - Page Not Found');
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});