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
const registerSuccessMessage = document.getElementById('registerSuccessMessage');
const resetPasswordModal = document.getElementById('resetPasswordModal');
const resetPasswordBtn = document.getElementById('resetPasswordBtn');
const resetEmail = document.getElementById('resetEmail');
const resetErrorMessage = document.getElementById('resetErrorMessage');
const resetSuccessMessage = document.getElementById('resetSuccessMessage');

// Show/Hide Forms
document.getElementById('showRegisterBtn').addEventListener('click', () => {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    errorMessage.classList.add('hidden');
    registerErrorMessage.classList.add('hidden');
    registerSuccessMessage?.classList.add('hidden');
});

document.getElementById('showLoginBtn').addEventListener('click', () => {
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    registerErrorMessage.classList.add('hidden');
    registerSuccessMessage?.classList.add('hidden');
});

// Surface verification requirement messages from redirects
const params = new URLSearchParams(window.location.search);
if (params.get('verify') === 'required' && errorMessage) {
    errorMessage.textContent = 'Please verify your email before signing in. Check your inbox for the verification link.';
    errorMessage.classList.remove('hidden');
}

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
        if (registerSuccessMessage) {
            registerSuccessMessage.textContent = 'Account created! Check your email to verify, then sign in.';
            registerSuccessMessage.classList.remove('hidden');
        }
        registerErrorMessage.classList.add('hidden');
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    } catch (error) {
        registerErrorMessage.textContent = error.message;
        registerErrorMessage.classList.remove('hidden');
        registerSuccessMessage?.classList.add('hidden');
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
onAuthStateChanged(async (user) => {
    if (!user) return;

    const isPasswordAccount = user.providerData?.some(p => p.providerId === 'password');
    if (isPasswordAccount && !user.emailVerified) {
        try {
            await user.sendEmailVerification();
        } catch (err) {
            console.warn('Failed to resend verification email:', err);
        }
        await logoutUser();
        if (errorMessage) {
            errorMessage.textContent = 'Please verify your email before signing in. We just sent you a new link.';
            errorMessage.classList.remove('hidden');
        }
        return;
    }

    window.location.href = 'index.html';
});
