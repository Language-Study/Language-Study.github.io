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

    // Hide all forms initially
    resetPasswordForm.style.display = 'none';

    // Show the appropriate form based on the action
    if (mode === 'resetPassword') {
        resetPasswordForm.style.display = 'block';
    } else if (mode === 'verifyAndChangeEmail') {
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
    } else {
        document.getElementById('resetPasswordMsg').textContent = 'Invalid or missing action parameter.';
        resetPasswordMsg.classList.add('text-red-500');
    }

    if (!oobCode) {
        document.getElementById('resetPasswordMsg').textContent = 'Invalid or missing reset code.';
        resetPasswordMsg.classList.add('text-red-500');
        return;
    }

    resetPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('newPassword').value;
        const resetPasswordMsg = document.getElementById('resetPasswordMsg');

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
