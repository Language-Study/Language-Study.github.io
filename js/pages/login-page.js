/**
 * Login Page Script
 * Handles login, registration, and password reset on login.html
 */

// Initialize Firebase and get auth
const { auth: loginAuth, db: loginDb } = initializeFirebase();

// DOM Elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const errorMessage = document.getElementById('errorMessage');
const registerErrorMessage = document.getElementById('registerErrorMessage');
const resetPasswordModal = document.getElementById('resetPasswordModal');
const resetPasswordBtn = document.getElementById('resetPasswordBtn');
const resetEmail = document.getElementById('resetEmail');
const resetErrorMessage = document.getElementById('resetErrorMessage');
const resetSuccessMessage = document.getElementById('resetSuccessMessage');

// Show/Hide Forms
document.getElementById('showRegisterBtn').addEventListener('click', () => {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
});

document.getElementById('showLoginBtn').addEventListener('click', () => {
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
});

// Email/Password Login
document.getElementById('loginBtn').addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        await loginWithEmailPassword(email, password);
        window.location.href = 'index.html';
    } catch (error) {
        errorMessage.textContent = error.message;
        errorMessage.classList.remove('hidden');
    }
});

// Register
document.getElementById('registerBtn').addEventListener('click', async () => {
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    try {
        await registerUser(email, password, confirmPassword);
        window.location.href = 'index.html';
    } catch (error) {
        registerErrorMessage.textContent = error.message;
        registerErrorMessage.classList.remove('hidden');
    }
});

// Show password reset modal
document.getElementById('showResetPasswordBtn').addEventListener('click', () => {
    resetPasswordModal.classList.remove('hidden');
    resetErrorMessage.classList.add('hidden');
    resetSuccessMessage.classList.add('hidden');
    resetEmail.value = '';
});

// Close password reset modal
document.getElementById('closeResetModal').addEventListener('click', () => {
    resetPasswordModal.classList.add('hidden');
});

// Password Reset
resetPasswordBtn.addEventListener('click', async () => {
    const email = resetEmail.value.trim();

    try {
        await sendPasswordResetEmail(email);
        resetSuccessMessage.textContent = 'Password reset email sent! Check your inbox.';
        resetSuccessMessage.classList.remove('hidden');
        resetErrorMessage.classList.add('hidden');
    } catch (error) {
        resetErrorMessage.textContent = error.message;
        resetErrorMessage.classList.remove('hidden');
        resetSuccessMessage.classList.add('hidden');
    }
});

// Enter key support for forms
['email', 'password'].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('loginBtn').click();
            }
        });
    }
});

['registerEmail', 'registerPassword', 'confirmPassword'].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('registerBtn').click();
            }
        });
    }
});

if (resetEmail) {
    resetEmail.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            resetPasswordBtn.click();
        }
    });
}

// Google Login
const googleLoginBtn = document.getElementById('googleLoginBtn');
if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
        try {
            await loginWithGoogle();
            window.location.href = 'index.html';
        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.classList.remove('hidden');
        }
    });
}

// Auto-redirect if already logged in
onAuthStateChanged((user) => {
    if (user) {
        window.location.href = 'index.html';
    }
});
