# Fuel Station Management System (rfp15)

A comprehensive web application for managing fuel stations, tracking global fuel prices, and facilitating interactions between Fuel Station Managers and regular Users. Built with Node.js, Express, and MongoDB.

## Features

*   **Role-Based Access Control**: Separate portals and dashboards for 'Managers' and 'Users'.
*   **Manager Portal**:
    *   Register as a Fuel Station Manager with details about the fuel station (Name, Address, Fuel Types).
    *   Manager Dashboard for station administration.
*   **User Portal**:
    *   Register and login as a regular User.
    *   User Dashboard.
*   **Security**:
    *   Password hashing using `bcrypt`.
    *   Session management with `express-session`.
    *   Cross-Site Request Forgery (CSRF) protection using `csurf`.
*   **Database**: MongoDB integration via `mongoose` for storing User, Manager, and Global Fuel Price data.
*   **UI/UX**: Server-side rendering using EJS templating engine and flash messages for user feedback.

## Tech Stack

*   **Backend**: Node.js, Express.js
*   **Database**: MongoDB, Mongoose
*   **Templating Engine**: EJS (Embedded JavaScript)
*   **Authentication & Security**: bcrypt, express-session, csurf, cookie-parser
*   **Environment Variables**: dotenv

## Prerequisites

Before you begin, ensure you have the following installed:
*   [Node.js](https://nodejs.org/) (v14 or higher recommended)
*   [MongoDB](https://www.mongodb.com/try/download/community) (running locally or a MongoDB Atlas URI)

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/bsv1836/rfp15.git
    cd rfp15
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Configuration:**
    Create a `.env` file in the root directory and configure the necessary environment variables. Example:
    ```env
    PORT=3000
    MONGO_URI=your_mongodb_connection_string_here
    SESSION_SECRET=your_super_secret_session_key
    ```

4.  **Run the application:**
    ```bash
    npm start
    ```
    The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

## Project Structure

*   `app.js`: Main application entry point and server configuration.
*   `models/`: Mongoose schemas and models (User, Manager, GlobalFuelPrice).
*   `routes/`: Express route handlers for different application parts (`userRoutes`, `managerRoutes`).
*   `views/`: EJS templates for rendering the user interface.
*   `public/`: Static assets (CSS, images, client-side JS).

## License

This project is licensed under the ISC License.
