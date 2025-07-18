// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyB8B5Saw8kArUOIL_m5NHFWDQwplR8HF_c",
    authDomain: "language-study-tracker.firebaseapp.com",
    projectId: "language-study-tracker",
    storageBucket: "language-study-tracker.appspot.com",
    messagingSenderId: "47054764584",
    appId: "1:47054764584:web:7c0b6597bc42aaf961131d"
};
firebase.initializeApp(firebaseConfig);

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const oobCode = urlParams.get('oobCode');
    // Get the mode parameter (action to perform) to determine the form to show
    const mode = urlParams.get('mode');

    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const h1Element = document.querySelector('h1');
    const resetPasswordMsg = document.getElementById('resetPasswordMsg');
    const titleElement = document.querySelector('title');

    // Hide all forms initially
    resetPasswordForm.style.display = 'none';

    // Show the appropriate form and update the header based on the action
    if (mode === 'resetPassword') {
        h1Element.textContent = 'Reset Your Password';
        titleElement.textContent = 'Reset Password';
        resetPasswordForm.style.display = 'block';
    } else if (mode === 'verifyAndChangeEmail') {
        h1Element.textContent = 'Verify and Change Your Email';
        titleElement.textContent = 'Verify Email';
        const verifyAndUpdateEmail = async () => {
            try {
                await firebase.auth().applyActionCode(oobCode);
                resetPasswordMsg.textContent = 'Email has been verified and updated successfully! Please log in with your new email address.';
                resetPasswordMsg.classList.add('text-green-500');
            } catch (error) {
                console.error('Error verifying and updating email:', error);
                resetPasswordMsg.textContent = `Failed to verify and update email: ${error.message}`;
                resetPasswordMsg.classList.add('text-red-500');
            }
        };

        verifyAndUpdateEmail();
    } else if (mode === 'recoverEmail') {
        h1Element.textContent = 'Recover Your Email';
        titleElement.textContent = 'Recover Email';
        const recoverEmail = async () => {
            try {
                const info = await firebase.auth().checkActionCode(oobCode);
                const restoredEmail = info.data.email;
                await firebase.auth().applyActionCode(oobCode);
                resetPasswordMsg.textContent = `Your email address (${restoredEmail}) has been successfully restored. Please log in.`;
                resetPasswordMsg.classList.add('text-green-500');
            } catch (error) {
                console.error('Error recovering email:', error);
                resetPasswordMsg.textContent = `Failed to recover email: ${error.message}`;
                resetPasswordMsg.classList.add('text-red-500');
            }
        };

        recoverEmail();
    } else {
        h1Element.textContent = 'Invalid Action';
        titleElement.textContent = 'Invalid Action';
        resetPasswordMsg.textContent = 'Invalid or missing action parameter.';
        resetPasswordMsg.classList.add('text-red-500');
    }

    if (!oobCode) {
        h1Element.textContent = 'Invalid Reset Code';
        titleElement.textContent = 'Invalid Reset Code';
        resetPasswordMsg.textContent = 'Invalid or missing reset code.';
        resetPasswordMsg.classList.add('text-red-500');
        return;
    }

    resetPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('newPassword').value;

        try {
            await firebase.auth().confirmPasswordReset(oobCode, newPassword);
            resetPasswordMsg.textContent = 'Password has been reset successfully! Redirecting to login...';
            resetPasswordMsg.classList.add('text-green-500');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);
        } catch (error) {
            console.error('Error resetting password:', error);
            resetPasswordMsg.textContent = `Failed to reset password: ${error.message}`;
            resetPasswordMsg.classList.add('text-red-500');
        }
    });
});
