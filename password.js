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

// Function to send a password reset email with a link to the custom reset page
function sendCustomPasswordResetEmail(email) {
    const actionCodeSettings = {
        url: `${window.location.origin}/reset-password.html`,
        handleCodeInApp: true
    };

    return firebase.auth().sendPasswordResetEmail(email, actionCodeSettings);
}

// Event listener for reset password button
document.getElementById('resetPasswordBtn').addEventListener('click', () => {
    resetPasswordWithParams('resetEmailInput', 'resetPasswordMsg', 'text-green-500', 'text-red-500');
});

// Function to handle email change
function changeEmail(newEmailInputId, confirmEmailInputId, messageElementId, successClass, errorClass) {
    const newEmail = document.getElementById(newEmailInputId).value;
    const confirmEmail = document.getElementById(confirmEmailInputId).value;
    const messageElement = document.getElementById(messageElementId);

    // Ensure the message element is visible
    messageElement.classList.remove('hidden');

    if (!newEmail || !confirmEmail) {
        messageElement.textContent = 'Please fill in both email fields.';
        messageElement.classList.add(errorClass);
        return;
    }

    if (newEmail !== confirmEmail) {
        messageElement.textContent = 'Emails do not match. Please try again.';
        messageElement.classList.add(errorClass);
        return;
    }

    // Firebase email update logic
    const user = firebase.auth().currentUser;
    if (user) {
        user.updateEmail(newEmail)
            .then(() => {
                messageElement.textContent = 'Email updated successfully!';
                messageElement.classList.remove(errorClass);
                messageElement.classList.add(successClass);
            })
            .catch((error) => {
                console.error('Error updating email:', error);
                messageElement.textContent = `Failed to update email: ${error.message}`;
                messageElement.classList.add(errorClass);
            });
    } else {
        messageElement.textContent = 'No user is currently signed in.';
        messageElement.classList.add(errorClass);
    }
}

// Event listener for change email form
document.getElementById('changeEmailForm').addEventListener('submit', (e) => {
    e.preventDefault();
    changeEmail('newEmail', 'confirmEmail', 'resetPasswordMsg', 'text-green-500', 'text-red-500');
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
document.getElementById('resendVerificationBtn').addEventListener('click', () => {
    sendEmailVerification('emailVerificationMsg', 'text-green-500', 'text-red-500');
});
