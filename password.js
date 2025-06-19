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

// Function to send email verification
function sendEmailVerification(messageElementId, successClass, errorClass) {
    const messageElement = document.getElementById(messageElementId);

    // Ensure the message element is visible
    messageElement.classList.remove('hidden');

    const user = firebase.auth().currentUser;
    if (user) {
        user.sendEmailVerification()
            .then(() => {
                messageElement.textContent = 'Verification email sent successfully!';
                messageElement.classList.remove(errorClass);
                messageElement.classList.add(successClass);
            })
            .catch((error) => {
                console.error('Error sending verification email:', error);
                messageElement.textContent = `Failed to send verification email: ${error.message}`;
                messageElement.classList.add(errorClass);
            });
    } else {
        messageElement.textContent = 'No user is currently signed in.';
        messageElement.classList.add(errorClass);
    }
}

// Event listener for resend verification email button
document.addEventListener('DOMContentLoaded', () => {
    const resendVerificationBtn = document.getElementById('resendVerificationBtn');

    if (resendVerificationBtn) {
        resendVerificationBtn.addEventListener('click', () => {
            const user = firebase.auth().currentUser;
            const messageElement = document.getElementById('emailVerificationMsg');

            if (!user) {
                messageElement.textContent = 'You must be signed in to resend the verification email.';
                messageElement.classList.add('text-red-500');
                return;
            }

            user.sendEmailVerification()
                .then(() => {
                    messageElement.textContent = 'Verification email has been resent. Please check your inbox.';
                    messageElement.classList.add('text-green-500');
                })
                .catch((error) => {
                    console.error('Error resending verification email:', error);
                    messageElement.textContent = `Failed to resend verification email: ${error.message}`;
                    messageElement.classList.add('text-red-500');
                });
        });
    } else {
        console.error('Resend verification button not found in the DOM.');
    }
});
