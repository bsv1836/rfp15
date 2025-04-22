const express = require('express');
const router = express.Router();
const Manager = require('../models/Manager');
const Order = require('../models/Order');
const Agent = require('../models/Agent');
const FuelInventory = require('../models/FuelInventory');
const bcrypt = require("bcrypt"); // Add this at the top if not already


// Route: POST /manager/register
router.post("/register", async (req, res) => {
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
    return res.status(400).send("Passwords do not match");
  }

  try {
    const existingManager = await Manager.findOne({ email });
    if (existingManager) {
      return res.status(400).send("Manager already registered");
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

    // ✅ Insert default fuel inventory for each selected fuel type
    const fuelInventoryDocs = savedManager.fuelStation.fuelTypes.map((type) => ({
      managerId: savedManager._id,
      fuelType: type,
      quantityAvailable: 1000, // You can adjust the default quantity
      price: 96.72 // Set a default price here for each fuel type
    }));
    
    await FuelInventory.insertMany(fuelInventoryDocs);
    
    
    // Store manager session for dashboard access
    req.session.manager = {
      id: savedManager._id,
      name: savedManager.name,
      fuelStation: savedManager.fuelStation,
    };
    
    res.redirect("/manager/dashboard");
    
  } catch (err) {
    console.error("Error registering manager:", err);
    res.status(500).send("Server error during manager registration");
  }
});


// Route: GET /manager/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    // Simulate manager login (replace with session auth later)
    const managerId = req.session.manager?.id;
    if (!managerId) return res.redirect('/');
    // Replace this with actual logged-in ID
    const manager = await Manager.findById(managerId).lean();

    // Fetch related data
    const orders = await Order.find({ managerId }).lean();
    const agents = await Agent.find({ managerId }).lean();
    const fuelInventory = await FuelInventory.find({ managerId }).lean();

    // Dashboard stats
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

// Route: POST /manager/orders/:id/accept
router.post('/orders/:id/accept', async (req, res) => {
  try {
    const orderId = req.params.id;
    await Order.findByIdAndUpdate(orderId, { status: 'In Progress' });
    res.redirect('/manager/dashboard');
  } catch (err) {
    console.error('Error accepting order:', err);
    res.status(500).send('Error accepting order');
  }
});

// Route: POST /manager/orders/:id/reject
router.post('/orders/:id/reject', async (req, res) => {
  try {
    const orderId = req.params.id;
    await Order.findByIdAndUpdate(orderId, { status: 'Rejected' });
    res.redirect('/manager/dashboard');
  } catch (err) {
    console.error('Error rejecting order:', err);
    res.status(500).send('Error rejecting order');
  }
});

module.exports = router;
