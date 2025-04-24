const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Order = require('../models/Order');
const Manager = require('../models/Manager');
const FuelInventory = require('../models/FuelInventory');
const GlobalFuelPrice = require('../models/GlobalFuelPrice');
const mongoose = require('mongoose');

// Middleware to protect user routes
function isAuthenticated(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/');
  }
  next();
}

// User Registration Page
router.get('/register', (req, res) => {
  res.render('register', {
    csrfToken: req.csrfToken(),
    error_msg: req.flash('error')
  });
});

// User Registration Route
router.post('/register', async (req, res) => {
  const { name, email, password, mobile, confirm_password } = req.body;
  try {
    // Validate password match
    if (password !== confirm_password) {
      req.flash('error', 'Passwords do not match');
      return res.redirect('/user/register');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      req.flash('error', 'User already registered');
      return res.redirect('/user/register');
    }

    // Hash password and create new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, mobile, password: hashedPassword });
    await newUser.save();

    // Auto-login
    req.session.user = { id: newUser._id, name: newUser.name };
    res.redirect('/user/dashboard');
  } catch (error) {
    console.error('Error registering user:', error);
    req.flash('error', 'Error registering user');
    res.redirect('/user/register');
  }
});

// Serve Login Page
router.get('/login', (req, res) => res.render('index'));

// User Login Route
router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;
  try {
    if (role === 'user') {
      const user = await User.findOne({ email });
      if (user && await bcrypt.compare(password, user.password)) {
        req.session.user = { id: user._id, name: user.name };
        res.redirect('/user/dashboard');
      } else {
        req.flash('error', 'Invalid user credentials');
        res.redirect('/');
      }
    }
  } catch (error) {
    console.error('Error during login:', error);
    req.flash('error', 'Login failed');
    res.redirect('/');
  }
});

// User Dashboard Route
router.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.session.user.id });
    res.render('user-dashboard', { user: req.session.user, orders });
  } catch (err) {
    console.error('Error fetching orders:', err);
    req.flash('error', 'Error loading dashboard');
    res.redirect('/');
  }
});

// Fuel Station Selection Page
router.get('/stations', isAuthenticated, async (req, res) => {
  try {
    const stations = await Manager.find({});
    res.render('station-select', { stations });
  } catch (err) {
    console.error('Error loading stations:', err);
    req.flash('error', 'Failed to load fuel stations');
    res.redirect('/user/dashboard');
  }
});

router.get('/select-station/:stationId', isAuthenticated, async (req, res) => {
  const { stationId } = req.params;
  console.log('Rendering fuel-select with stationId:', stationId);
  try {
    const [inventory, fuelPrices] = await Promise.all([
      FuelInventory.find({ managerId: new mongoose.Types.ObjectId(stationId) }),
      GlobalFuelPrice.find({})
    ]);
    const prices = {};
    fuelPrices.forEach(item => prices[item.fuelType] = item.price);
    res.render('fuel-select', { inventory, stationId, prices, csrfToken: req.csrfToken() });
  } catch (err) {
    console.error('Error fetching data:', err);
    req.flash('error', 'Could not load fuel options');
    res.redirect('/user/stations');
  }
});

console.log('Registering route: /confirm-order/:stationId');
router.post('/confirm-order/:stationId', isAuthenticated, async (req, res) => {
  console.log('Handling /confirm-order/:stationId with stationId:', req.params.stationId);
  console.log('Request body:', req.body);
  const { stationId } = req.params;
  const { fuelType, quantity } = req.body;
  try {
    console.log('Fetching fuel data for:', fuelType);
    const fuelData = await GlobalFuelPrice.findOne({ fuelType });
    if (!fuelData || !fuelData.price) {
      console.log('Global fuel price not set for:', fuelType);
      req.flash('error', 'Fuel price not available');
      return res.redirect(`/user/select-station/${stationId}`);
    }
    const basePrice = fuelData.price;
    const subtotal = quantity * basePrice;
    const serviceFee = subtotal * 0.1;
    const totalAmount = subtotal + serviceFee;
    console.log('Rendering payment-method with data:', { stationId, fuelType, quantity, totalAmount });
    res.render('payment-method', {
      stationId,
      fuelType,
      quantity,
      basePrice,
      subtotal: subtotal.toFixed(2),
      serviceFee: serviceFee.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error('Error in confirm-order:', err);
    req.flash('error', 'Something went wrong');
    res.redirect(`/user/select-station/${stationId}`);
  }
});

// View Past Orders
router.get('/orders', isAuthenticated, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.session.user.id })
      .populate({
        path: 'fuelStation.managerId',
        select: 'fuelStation.name'
      })
      .sort({ createdAt: -1 });
    res.render('user-orders', { orders, user: req.session.user });
  } catch (err) {
    console.error('Error fetching orders:', err);
    req.flash('error', 'Failed to load order history');
    res.redirect('/user/dashboard');
  }
});

// Add POST /place-order/:stationId route
router.post('/place-order/:stationId', isAuthenticated, async (req, res) => {
  console.log('Handling /place-order/:stationId with stationId:', req.params.stationId);
  console.log('Request body:', req.body);
  const { stationId } = req.params;
  const { fuelType, quantity, totalAmount, paymentMethod, address } = req.body;
  try {
    if (!req.session.user || !req.session.user.id) {
      throw new Error('User session invalid');
    }
    const parsedQuantity = parseFloat(quantity);
    const parsedAmount = parseFloat(totalAmount);
    if (!paymentMethod || parsedQuantity <= 0) {
      throw new Error('Invalid order details');
    }
    const manager = await Manager.findById(stationId);
    if (!manager) {
      throw new Error('No manager found for this station');
    }
    const user = await User.findById(req.session.user.id).lean();
    const newOrder = new Order({
      userId: req.session.user.id,
      managerId: manager._id,
      customerName: user.name,
      fuelType,
      quantity: parsedQuantity,
      paymentMethod,
      address,
      totalAmount: parsedAmount,
      status: 'Pending',
      fuelStation: { managerId: stationId }
    });
    await newOrder.save();
    req.flash('success', 'Order placed successfully and awaiting manager confirmation!');
    res.render('order-confirmation', { order: newOrder });
  } catch (err) {
    console.error('Order placing failed:', err);
    req.flash('error', 'Failed to place order: ' + err.message);
    res.redirect(`/user/select-station/${stationId}`);
  }
});

module.exports = router;