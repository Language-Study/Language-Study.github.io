/**
 * Password Reset & Email Recovery Page Script
 * Handles password reset, email verification, and email recovery flows
 */

// Initialize Firebase
const { auth: updateAuth } = initializeFirebase();

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const oobCode = urlParams.get('oobCode');
    const mode = urlParams.get('mode');

    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const h1Element = document.querySelector('h1');
    const resetPasswordMsg = document.getElementById('resetPasswordMsg');
    const titleElement = document.querySelector('title');

    // Hide all forms initially
    if (resetPasswordForm) {
        resetPasswordForm.style.display = 'none';
    }

    // Validate oobCode
    if (!oobCode) {
        h1Element.textContent = 'Invalid Reset Code';
        titleElement.textContent = 'Invalid Reset Code';
        resetPasswordMsg.textContent = 'Invalid or missing reset code.';
        resetPasswordMsg.classList.add('text-red-500');
        return;
    }

    // Handle different action modes
    switch (mode) {
        case 'resetPassword':
            await handlePasswordReset(oobCode, h1Element, titleElement, resetPasswordForm, resetPasswordMsg);
            break;

        case 'verifyAndChangeEmail':
            await handleEmailVerification(oobCode, h1Element, titleElement, resetPasswordMsg);
            break;

        case 'recoverEmail':
            await handleEmailRecovery(oobCode, h1Element, titleElement, resetPasswordMsg);
            break;

        default:
            h1Element.textContent = 'Invalid Action';
            titleElement.textContent = 'Invalid Action';
            resetPasswordMsg.textContent = 'Invalid or missing action parameter.';
            resetPasswordMsg.classList.add('text-red-500');
    }
});

/**
 * Handle password reset form submission
 */
async function handlePasswordReset(oobCode, h1Element, titleElement, resetPasswordForm, resetPasswordMsg) {
    h1Element.textContent = 'Reset Your Password';
    titleElement.textContent = 'Reset Password';
    if (resetPasswordForm) {
        resetPasswordForm.style.display = 'block';
    }

    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPassword = document.getElementById('newPassword').value;

            try {
                await updateAuth.confirmPasswordReset(oobCode, newPassword);
                resetPasswordMsg.textContent = 'Password has been reset successfully! Redirecting to login...';
                resetPasswordMsg.classList.add('text-green-500');
                resetPasswordMsg.classList.remove('text-red-500');

                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);
            } catch (error) {
                console.error('Error resetting password:', error);
                resetPasswordMsg.textContent = `Failed to reset password: ${error.message}`;
                resetPasswordMsg.classList.add('text-red-500');
                resetPasswordMsg.classList.remove('text-green-500');
            }
        });
    }
}

/**
 * Handle email verification and change
 */
async function handleEmailVerification(oobCode, h1Element, titleElement, resetPasswordMsg) {
    h1Element.textContent = 'Verify and Change Your Email';
    titleElement.textContent = 'Verify Email';

    try {
        await updateAuth.applyActionCode(oobCode);
        resetPasswordMsg.textContent = 'Email has been verified and updated successfully! Please log in with your new email address.';
        resetPasswordMsg.classList.add('text-green-500');
        resetPasswordMsg.classList.remove('text-red-500');

        setTimeout(() => {
            window.location.href = 'login.html';
        }, 3000);
    } catch (error) {
        console.error('Error verifying and updating email:', error);
        resetPasswordMsg.textContent = `Failed to verify and update email: ${error.message}`;
        resetPasswordMsg.classList.add('text-red-500');
        resetPasswordMsg.classList.remove('text-green-500');
    }
}

/**
 * Handle email recovery
 */
async function handleEmailRecovery(oobCode, h1Element, titleElement, resetPasswordMsg) {
    h1Element.textContent = 'Recover Your Email';
    titleElement.textContent = 'Recover Email';

    try {
        const info = await updateAuth.checkActionCode(oobCode);
        const restoredEmail = info.data.email;
        await updateAuth.applyActionCode(oobCode);

        resetPasswordMsg.textContent = `Your email address (${restoredEmail}) has been successfully restored. Please log in.`;
        resetPasswordMsg.classList.add('text-green-500');
        resetPasswordMsg.classList.remove('text-red-500');

        setTimeout(() => {
            window.location.href = 'login.html';
        }, 3000);
    } catch (error) {
        console.error('Error recovering email:', error);
        resetPasswordMsg.textContent = `Failed to recover email: ${error.message}`;
        resetPasswordMsg.classList.add('text-red-500');
        resetPasswordMsg.classList.remove('text-green-500');
    }
}
