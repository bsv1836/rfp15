// In managerRoutes.js
const express = require('express');
const router = express.Router();
const Manager = require('../models/Manager');
const Order = require('../models/Order');
const Agent = require('../models/Agent');
const FuelInventory = require('../models/FuelInventory');
const bcrypt = require('bcrypt');

// Middleware to protect manager routes
function isAuthenticated(req, res, next) {
  if (!req.session.manager) {
    return res.redirect('/');
  }
  next();
}

// Route: POST /manager/register
router.post('/register', async (req, res) => {
  const {
    fuelStationName,
    fuelStationAddress,
    fuelTypes,
    name,
    mobile,
    email,
    password,
    confirm_password,
  } = req.body;

  if (password !== confirm_password) {
    return res.status(400).send('Passwords do not match');
  }

  try {
    const existingManager = await Manager.findOne({ email });
    if (existingManager) {
      return res.status(400).send('Manager already registered');
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

    const savedManager = await newManager.save();

    const fuelInventoryDocs = savedManager.fuelStation.fuelTypes.map((type) => ({
      managerId: savedManager._id,
      fuelType: type,
      quantityAvailable: 1000,
      price: 96.72
    }));

    await FuelInventory.insertMany(fuelInventoryDocs);

    req.session.manager = {
      id: savedManager._id,
      name: savedManager.name,
      fuelStation: savedManager.fuelStation,
    };

    res.redirect('/manager/dashboard');
  } catch (err) {
    console.error('Error registering manager:', err);
    res.status(500).send('Server error during manager registration');
  }
});

// Route: GET /manager/dashboard
router.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    const managerId = req.session.manager.id;
    const manager = await Manager.findById(managerId).lean();

    const orders = await Order.find({ managerId: manager._id }).lean();
    const agents = await Agent.find({ managerId: manager._id }).lean();
    const fuelInventory = await FuelInventory.find({ managerId: manager._id }).lean();

    const today = new Date().toISOString().split('T')[0];
    const stats = {
      pending: orders.filter(o => o.status === 'Pending').length,
      inProgress: orders.filter(o => o.status === 'In Progress').length,
      deliveredToday: orders.filter(o =>
        o.status === 'Delivered' &&
        new Date(o.updatedAt).toISOString().startsWith(today)
      ).length,
      availableAgents: agents.filter(a => a.status === 'Available').length
    };

    res.render('manager-dashboard', {
      manager,
      orders,
      agents,
      fuelInventory,
      stats
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong loading the dashboard.');
  }
});

// Route: POST /manager/confirm-order/:orderId
router.post('/confirm-order/:orderId', isAuthenticated, async (req, res) => {
  console.log('Handling /confirm-order/:orderId with orderId:', req.params.orderId);
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    if (order.managerId.toString() !== req.session.manager.id) {
      throw new Error('Unauthorized to confirm this order');
    }
    order.status = 'Confirmed';
    await order.save();
    req.flash('success', 'Order confirmed successfully!');
    res.redirect('/manager/dashboard');
  } catch (err) {
    console.error('Order confirmation failed:', err);
    req.flash('error', 'Failed to confirm order: ' + err.message);
    res.redirect('/manager/dashboard');
  }
});

// Route: POST /manager/orders/:id/accept
router.post('/orders/:id/accept', isAuthenticated, async (req, res) => {
  try {
    const orderId = req.params.id;
    await Order.findByIdAndUpdate(orderId, { status: 'In Progress' });
    req.flash('success', 'Order accepted and now in progress!');
    res.redirect('/manager/dashboard');
  } catch (err) {
    console.error('Error accepting order:', err);
    req.flash('error', 'Error accepting order: ' + err.message);
    res.redirect('/manager/dashboard');
  }
});

// Route: POST /manager/orders/:id/reject
router.post('/orders/:id/reject', isAuthenticated, async (req, res) => {
  try {
    const orderId = req.params.id;
    await Order.findByIdAndUpdate(orderId, { status: 'Rejected' });
    req.flash('success', 'Order rejected successfully!');
    res.redirect('/manager/dashboard');
  } catch (err) {
    console.error('Error rejecting order:', err);
    req.flash('error', 'Error rejecting order: ' + err.message);
    res.redirect('/manager/dashboard');
  }
});

// Route: POST /manager/orders/:id/deliver
router.post('/orders/:id/deliver', isAuthenticated, async (req, res) => {
  try {
    const orderId = req.params.id;
    await Order.findByIdAndUpdate(orderId, { status: 'Delivered' });
    req.flash('success', 'Order marked as delivered!');
    res.redirect('/manager/dashboard');
  } catch (err) {
    console.error('Error delivering order:', err);
    req.flash('error', 'Error delivering order: ' + err.message);
    res.redirect('/manager/dashboard');
  }
});

// Route: POST /manager/inventory/:id/update
router.post('/inventory/:id/update', isAuthenticated, async (req, res) => {
  try {
    const inventoryId = req.params.id;
    const { quantity } = req.body;
    await FuelInventory.findByIdAndUpdate(inventoryId, { quantityAvailable: parseFloat(quantity) });
    req.flash('success', 'Inventory updated successfully!');
    res.redirect('/manager/dashboard');
  } catch (err) {
    console.error('Error updating inventory:', err);
    req.flash('error', 'Error updating inventory: ' + err.message);
    res.redirect('/manager/dashboard');
  }
});

module.exports = router;