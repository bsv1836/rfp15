const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const User = require("../models/User");
const Order = require("../models/Order");
const Manager = require("../models/Manager");
const FuelInventory = require("../models/FuelInventory");
const GlobalFuelPrice = require("../models/GlobalFuelPrice");
const mongoose = require('mongoose'); // Make sure this is at the top

// ✅ Middleware to protect user routes
function isAuthenticated(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/");
  }
  next();
}

// ✅ User Registration Route
router.post("/register", async (req, res) => {
  const { name, email, password, mobile } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send("User already registered with this email.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      mobile,
      password: hashedPassword,
    });

    await newUser.save();
    res.redirect("/");
  } catch (error) {
    console.error("❌ Error registering user:", error);
    res.status(500).send("Error registering user");
  }
});

// ✅ Serve Login Page
router.get("/login", (req, res) => {
  res.render("login");
});

// ✅ User Login Route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).send("Invalid user credentials");
    }

    req.session.user = { id: user._id, name: user.name };
    res.redirect("/user/dashboard");
  } catch (error) {
    console.error("❌ Error during user login:", error);
    res.status(500).send("Login failed");
  }
});

// ✅ User Dashboard Route
router.get("/dashboard", isAuthenticated, async (req, res) => {
  try {
    const orders = await Order.find({ customerName: req.session.user.name });
    res.render("user-dashboard", { user: req.session.user, orders });
  } catch (err) {
    console.error("❌ Error fetching orders:", err);
    res.status(500).send("Error loading dashboard");
  }
});

// ✅ Fuel Station Selection Page
router.get("/stations", isAuthenticated, async (req, res) => {
  try {
    const stations = await Manager.find({});
    res.render("station-select", { stations });
  } catch (err) {
    console.error("❌ Error loading stations:", err);
    res.status(500).send("Failed to load fuel stations");
  }
});



router.get("/select-station/:stationId", isAuthenticated, async (req, res) => {
  const { stationId } = req.params;

  try {
    const [inventory, fuelPrices] = await Promise.all([
      FuelInventory.find({ managerId: new mongoose.Types.ObjectId(stationId) }),
      GlobalFuelPrice.find({})
    ]);

    const prices = {};
    fuelPrices.forEach(item => {
      prices[item.fuelType] = item.price;
    });

    res.render("fuel-select", { inventory, stationId, prices });
  } catch (err) {
    console.error("❌ Error fetching data:", err);
    res.status(500).send("Could not load fuel options");
  }
});



router.post("/confirm-order/:stationId", isAuthenticated, async (req, res) => {
  const { stationId } = req.params;
  const { fuelType, quantity } = req.body;

  try {
    const fuelData = await GlobalFuelPrice.findOne({ fuelType });

    if (!fuelData || !fuelData.price) {
      console.log("❌ Global fuel price not set for:", fuelType);
      return res.status(400).send("Fuel price not available for selected type.");
    }

    const basePrice = fuelData.price;
    const subtotal = quantity * basePrice;
    const serviceFee = subtotal * 0.1;
    const totalAmount = subtotal + serviceFee;

    res.render("payment-method", {
      stationId,
      fuelType,
      quantity,
      basePrice,
      subtotal: subtotal.toFixed(2),
      serviceFee: serviceFee.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
    });
  } catch (err) {
    console.error("❌ Error confirming order:", err);
    res.status(500).send("Something went wrong while preparing your order");
  }
});



// ✅ Final Order Placement with Online Payment Simulation
router.post("/place-order/:stationId", isAuthenticated, async (req, res) => {
  const { stationId } = req.params;
  const { fuelType, quantity, totalAmount, paymentMethod } = req.body;

  try {
    const parsedQuantity = parseFloat(quantity);
    const parsedAmount = parseFloat(totalAmount);

    const newOrder = await Order.create({
      customerName: req.session.user.name,
      fuelType,
      quantity: parsedQuantity,
      amount: parsedAmount,
      paymentMethod,
      status: "Pending",
      managerId: stationId,
    });

    // ✅ Simulate Online Payment Success
    if (paymentMethod === "Online Payment") {
      return res.render("payment-success", { order: newOrder });
    }

    // ✅ For COD, go to order history
    res.redirect("/user/orders");
  } catch (err) {
    console.error("❌ Order placing failed:", err);
    res.status(500).send("Failed to place your order.");
  }
});


// ✅ View Past Orders - Enhanced Version
router.get("/orders", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user._id;

    // Fetch orders related to the logged-in user, sorted by creation date (newest first)
    const orders = await Order.find({ userId })
      .populate({
        path: "fuelStation",
        populate: { path: "managerId", select: "stationName" }
      })
      .sort({ createdAt: -1 });

    res.render("user-orders", {
      orders,
      user: req.session.user,
    });
  } catch (err) {
    console.error("❌ Error fetching user orders:", err);
    res.status(500).send("Failed to load order history");
  }
});


module.exports = router;
