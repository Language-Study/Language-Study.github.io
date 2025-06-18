// This file will contain all password-related JavaScript functionality.

// Refactored function to handle password reset with customizable parameters
function resetPasswordWithParams(emailInputId, messageElementId, successClass, errorClass) {
    const email = document.getElementById(emailInputId).value;
    const messageElement = document.getElementById(messageElementId);

    // Ensure the message element is visible
    messageElement.classList.remove('hidden');

    if (!email) {
        messageElement.textContent = 'Please enter your email address.';
        messageElement.classList.add(errorClass);
        return;
    }

    // Firebase password reset logic
    firebase.auth().sendPasswordResetEmail(email)
        .then(() => {
            messageElement.textContent = 'Password reset email sent!';
            messageElement.classList.remove(errorClass);
            messageElement.classList.add(successClass);
        })
        .catch((error) => {
            console.error('Error sending password reset email:', error);
            messageElement.textContent = 'Failed to send password reset email. Please try again.';
            messageElement.classList.add(errorClass);
        });
}

// Event listener for reset password button
document.getElementById('resetPasswordBtn').addEventListener('click', () => {
    resetPasswordWithParams('resetEmailInput', 'resetPasswordMsg', 'text-green-500', 'text-red-500');
});
