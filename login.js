// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB8B5Saw8kArUOIL_m5NHFWDQwplR8HF_c",
    authDomain: "language-study-tracker.firebaseapp.com",
    projectId: "language-study-tracker",
    storageBucket: "language-study-tracker.firebasestorage.app",
    messagingSenderId: "47054764584",
    appId: "1:47054764584:web:7c0b6597bc42aaf961131d"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// DOM Elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const errorMessage = document.getElementById('errorMessage');
const registerErrorMessage = document.getElementById('registerErrorMessage');
// Password reset modal elements
const resetPasswordModal = document.getElementById('resetPasswordModal');
const showResetPasswordBtn = document.getElementById('showResetPasswordBtn');
const closeResetModal = document.getElementById('closeResetModal');
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

// Email/Password Login with Validation
document.getElementById('loginBtn').addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        errorMessage.textContent = "Please fill in both fields.";
        errorMessage.classList.remove('hidden');
        return;
    }

    try {
        await auth.signInWithEmailAndPassword(email, password);
        window.location.href = 'index.html';
    } catch (error) {
        errorMessage.textContent = error.message;
        errorMessage.classList.remove('hidden');
    }
});

// Register with Validation
document.getElementById('registerBtn').addEventListener('click', async () => {
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        registerErrorMessage.textContent = "Passwords don't match";
        registerErrorMessage.classList.remove('hidden');
        return;
    }

    try {
        await auth.createUserWithEmailAndPassword(email, password);
        window.location.href = 'index.html';
    } catch (error) {
        registerErrorMessage.textContent = error.message;
        registerErrorMessage.classList.remove('hidden');
    }
});

// Show password reset modal
showResetPasswordBtn.addEventListener('click', () => {
    resetPasswordModal.classList.remove('hidden');
    resetErrorMessage.classList.add('hidden');
    resetSuccessMessage.classList.add('hidden');
    resetEmail.value = '';
});

// Close password reset modal
closeResetModal.addEventListener('click', () => {
    resetPasswordModal.classList.add('hidden');
});

// Send password reset email
resetPasswordBtn.addEventListener('click', async () => {
    const email = resetEmail.value.trim();
    resetErrorMessage.classList.add('hidden');
    resetSuccessMessage.classList.add('hidden');
    if (!email) {
        resetErrorMessage.textContent = 'Please enter your email.';
        resetErrorMessage.classList.remove('hidden');
        return;
    }
    try {
        await auth.sendPasswordResetEmail(email);
        resetSuccessMessage.textContent = 'Password reset email sent! Check your inbox.';
        resetSuccessMessage.classList.remove('hidden');
    } catch (error) {
        resetErrorMessage.textContent = error.message;
        resetErrorMessage.classList.remove('hidden');
    }
});

// Add Enter key support for login form
['email', 'password'].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('loginBtn').click();
            }
        });
    }
});

// Add Enter key support for register form
['registerEmail', 'registerPassword', 'confirmPassword'].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('registerBtn').click();
            }
        });
    }
});

// Add Enter key support for reset password modal
if (resetEmail) {
    resetEmail.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            resetPasswordBtn.click();
        }
    });
}

// Check auth state (auto-login)
auth.onAuthStateChanged((user) => {
    if (user) {
        window.location.href = 'index.html';
    }
});
