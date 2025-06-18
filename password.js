// This file will contain all password-related JavaScript functionality.

// Function to handle password reset
function resetPassword() {
    const email = document.getElementById('resetEmailInput').value;
    const resetPasswordMsg = document.getElementById('resetPasswordMsg');

    if (!email) {
        resetPasswordMsg.textContent = 'Please enter your email address.';
        resetPasswordMsg.classList.add('text-red-500');
        return;
    }

    // Firebase password reset logic
    firebase.auth().sendPasswordResetEmail(email)
        .then(() => {
            resetPasswordMsg.textContent = 'Password reset email sent!';
            resetPasswordMsg.classList.remove('text-red-500');
            resetPasswordMsg.classList.add('text-green-500');
        })
        .catch((error) => {
            console.error('Error sending password reset email:', error);
            resetPasswordMsg.textContent = 'Failed to send password reset email. Please try again.';
            resetPasswordMsg.classList.add('text-red-500');
        });
}

// Event listener for reset password button
document.getElementById('resetPasswordBtn').addEventListener('click', resetPassword);
