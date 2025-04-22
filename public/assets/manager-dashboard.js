document.addEventListener("DOMContentLoaded", function () {
    // Dummy data (Replace with backend API calls)
    const orders = [
        { id: 1, customer: "John Doe", fuel: "Diesel", qty: "20L", amount: "$50", status: "Pending" },
        { id: 2, customer: "Alice Brown", fuel: "Petrol", qty: "15L", amount: "$40", status: "In Progress" }
    ];

    const agents = [
        { name: "NotRahul", status: "Available" },
        { name: "Sam", status: "Unavailable" }
    ];

    const fuelStock = [
        { type: "Petrol", quantity: "500L" },
        { type: "Diesel", quantity: "700L" }
    ];

    // Render orders
    const orderList = document.getElementById("order-list");
    orders.forEach(order => {
        const row = `<tr>
                        <td>${order.id}</td>
                        <td>${order.customer}</td>
                        <td>${order.fuel}</td>
                        <td>${order.qty}</td>
                        <td>${order.amount}</td>
                        <td>${order.status}</td>
                        <td><button class="approve-btn">Approve</button></td>
                    </tr>`;
        orderList.innerHTML += row;
    });

    // Render delivery agents
    const agentList = document.getElementById("agent-list");
    agents.forEach(agent => {
        agentList.innerHTML += `<p>${agent.name} - <b>${agent.status}</b></p>`;
    });

    // Render fuel stock
    const fuelList = document.getElementById("fuel-list");
    fuelStock.forEach(fuel => {
        fuelList.innerHTML += `<p>${fuel.type}: ${fuel.quantity}</p>`;
    });

    // Fix Logout Button - Clears session and redirects to login
    document.getElementById("logout").addEventListener("click", () => {
        fetch('/logout', { method: 'GET' })
            .then(() => {
                window.location.href = "/"; // ✅ Redirects to index.ejs
            })
            .catch(err => console.error('Logout failed:', err));
    });
    document.getElementById("logout").addEventListener("click", () => {
        fetch('/logout', { method: 'GET' })
            .then(() => {
                window.location.href = "/"; // ✅ Redirects to index.ejs
            })
            .catch(err => console.error('Logout failed:', err));
    });
        
});
document.addEventListener("DOMContentLoaded", function () {
    // Count Pending Orders
    const pendingOrders = document.querySelectorAll("td.text-yellow-500").length;
    document.getElementById("pendingOrdersCount").textContent = pendingOrders;

    // Count Active Deliveries
    const activeDeliveries = document.querySelectorAll("td.text-blue-500").length;
    document.getElementById("activeDeliveriesCount").textContent = activeDeliveries;

    // Count Available Agents
    const availableAgents = document.querySelectorAll(".agent-status[data-status='Available']").length;
    document.getElementById("availableAgentsCount").textContent = availableAgents;
});
document.getElementById("save-timing").addEventListener("click", function () {
    const openingTime = document.getElementById("opening-time").value;
    const closingTime = document.getElementById("closing-time").value;
    
    alert(`Operational timing updated: ${openingTime} to ${closingTime}`);
});
