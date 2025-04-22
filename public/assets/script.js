document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const userRegisterForm = document.getElementById("userRegisterForm");
    const managerRegisterForm = document.getElementById("managerRegisterForm");

    if (loginForm) {
        loginForm.addEventListener("submit", function (event) {
            event.preventDefault();
            alert("Login successful!");
        });
    }

    if (userRegisterForm) {
        userRegisterForm.addEventListener("submit", function (event) {
            const password = document.getElementById("password").value;
            const confirmPassword = document.getElementById("confirmPassword").value;

            if (password !== confirmPassword) {
                event.preventDefault();
                alert("Passwords do not match!");
            }
        });
    }

    if (managerRegisterForm) {
        managerRegisterForm.addEventListener("submit", function (event) {
            event.preventDefault();
            alert("Manager registered successfully!");
        });
    }
});
