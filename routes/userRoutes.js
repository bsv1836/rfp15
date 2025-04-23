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

// User Registration Route
router.post('/register', async (req, res) => {
  const { name, email, password, mobile } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).send('User already registered');
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, mobile, password: hashedPassword });
    await newUser.save();
    req.session.user = newUser; // Auto-login
    res.redirect('/user/dashboard');
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).send('Error registering user');
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
      } else res.status(401).send('Invalid user credentials');
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).send('Login failed');
  }
});

// User Dashboard Route
router.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.session.user.id });
    res.render('user-dashboard', { user: req.session.user, orders });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).send('Error loading dashboard');
  }
});

// Fuel Station Selection Page
router.get('/stations', isAuthenticated, async (req, res) => {
  try {
    const stations = await Manager.find({});
    res.render('station-select', { stations });
  } catch (err) {
    console.error('Error loading stations:', err);
    res.status(500).send('Failed to load fuel stations');
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
    res.render('fuel-select', { inventory, stationId, prices });
  } catch (err) {
    console.error('Error fetching data:', err);
    res.status(500).send('Could not load fuel options');
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
      return res.status(400).send('Fuel price not available');
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
      csrfToken: req.csrfToken(), // Explicitly pass CSRF token
    });
  } catch (err) {
    console.error('Error in confirm-order:', err);
    res.status(500).send('Something went wrong');
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
    res.status(500).send('Failed to load order history');
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
      address, // Added address field
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