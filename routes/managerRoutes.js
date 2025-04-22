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

    const queryManagerId = manager._id.toString();

    const orders = await Order.find({ managerId: manager._id })
      .populate('agentId')
      .lean();
    console.log('Orders:', orders);
    const inProgressOrders = orders.filter(o => o.status === 'In Progress');
    console.log('In Progress Orders:', inProgressOrders);

    // Reset agents marked as Busy but not assigned to any In Progress orders
    const agents = await Agent.find({ managerId: queryManagerId });
    for (const agent of agents) {
      if (agent.status === 'Busy') {
        const isAssigned = inProgressOrders.some(order => order.agentId && order.agentId._id.toString() === agent._id.toString());
        if (!isAssigned) {
          agent.status = 'Available';
          await agent.save();
          console.log(`Reset agent ${agent._id} status to Available (no In Progress orders)`);
        }
      }
    }

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
      agents: agents.map(agent => agent.toObject()), // Convert to plain object for rendering
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

// Route: POST /manager/assign-agent/:orderId
router.post('/assign-agent/:orderId', isAuthenticated, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { agentId } = req.body;
    console.log('Assigning agent to order:', { orderId, agentId });
    const order = await Order.findById(orderId);
    if (!order) throw new Error('Order not found');
    if (order.managerId.toString() !== req.session.manager.id) throw new Error('Unauthorized');
    if (order.status !== 'Confirmed') throw new Error('Order must be confirmed before assigning an agent');
    const agent = await Agent.findById(agentId);
    if (!agent) throw new Error('Agent not found');
    if (agent.status !== 'Available') throw new Error('Agent is not available');
    order.agentId = agent._id;
    order.status = 'In Progress';
    agent.status = 'Busy';
    await Promise.all([order.save(), agent.save()]);
    console.log('Agent assigned successfully:', { agentId, orderId });
    req.flash('success', `Agent ${agent.name} assigned to order ${orderId}!`);
    res.redirect('/manager/dashboard');
  } catch (err) {
    console.error('Error assigning agent:', err);
    req.flash('error', 'Error assigning agent: ' + err.message);
    res.redirect('/manager/dashboard');
  }
});

// Route: POST /manager/remove-agent/:agentId
router.post('/remove-agent/:agentId', isAuthenticated, async (req, res) => {
  try {
    const agentId = req.params.agentId;
    const agent = await Agent.findById(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }
    console.log('Removing agent:', { agentId, managerId: agent.managerId, sessionManagerId: req.session.manager.id });
    if (agent.managerId !== req.session.manager.id) {
      throw new Error('Unauthorized to remove this agent');
    }
    const assignedOrder = await Order.findOne({ agentId: agent._id, status: 'In Progress' });
    if (assignedOrder) {
      throw new Error('Cannot remove agent assigned to an in-progress order');
    }
    await Agent.deleteOne({ _id: agent._id });
    console.log('Agent removed successfully:', agentId);
    req.flash('success', 'Agent removed successfully!');
    res.redirect('/manager/dashboard');
  } catch (err) {
    console.error('Error removing agent:', err);
    req.flash('error', 'Error removing agent: ' + err.message);
    res.redirect('/manager/dashboard');
  }
});

// Route: POST /manager/orders/:id/reject
router.post('/orders/:id/reject', isAuthenticated, async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId);
    if (!order) throw new Error('Order not found');
    if (order.managerId.toString() !== req.session.manager.id) throw new Error('Unauthorized');
    if (order.agentId) {
      const agent = await Agent.findById(order.agentId);
      if (agent) {
        agent.status = 'Available';
        await agent.save();
      }
    }
    order.status = 'Rejected';
    order.agentId = null;
    await order.save();
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
    const order = await Order.findById(orderId);
    if (!order) throw new Error('Order not found');
    if (order.managerId.toString() !== req.session.manager.id) throw new Error('Unauthorized');
    const agent = await Agent.findById(order.agentId);
    if (agent) {
      agent.status = 'Available';
      await agent.save();
    }
    order.status = 'Delivered';
    order.agentId = null;
    await order.save();
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

// Route: POST /manager/add-agent
router.post('/add-agent', isAuthenticated, async (req, res) => {
  try {
    const { name, contactNumber } = req.body;
    const managerId = req.session.manager.id;

    // Validate inputs
    if (!name || !contactNumber) {
      req.flash('error', 'Agent name and contact number are required.');
      return res.redirect('/manager/dashboard');
    }

    // Create new agent
    const newAgent = new Agent({
      managerId,
      name,
      contactNumber,
      status: 'Available'
    });

    await newAgent.save();
    req.flash('success', 'Agent added successfully!');
    res.redirect('/manager/dashboard');
  } catch (err) {
    console.error('Error adding agent:', err);
    req.flash('error', 'Error adding agent: ' + err.message);
    res.redirect('/manager/dashboard');
  }
});

module.exports = router;