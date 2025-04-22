document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("managerRegisterForm");
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");

    form.addEventListener("submit", function (event) {
        if (password.value !== confirmPassword.value) {
            event.preventDefault();
            alert("Passwords do not match!");
        }
    });
});
