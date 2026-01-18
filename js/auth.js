/**
 * Authentication & User Management Module
 * Handles user login, registration, password reset, email management, and account operations
 */

/**
 * Login user with email and password
 * @async
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<void>}
 */
async function loginWithEmailPassword(email, password) {
    if (!email || !password) {
        throw new Error('Please fill in both fields.');
    }

    try {
        const credential = await auth.signInWithEmailAndPassword(email, password);
        const user = credential.user;

        // Block access until email is verified for password-based accounts, except for user@test.com (temporary exception)
        const isPasswordAccount = user?.providerData?.some(p => p.providerId === 'password');
        if (user && isPasswordAccount && !user.emailVerified && user.email !== 'user@test.com') {
            // Best-effort resend to avoid locking users out if they missed the first email
            try {
                await user.sendEmailVerification();
            } catch (err) {
                console.warn('Failed to resend verification email:', err);
            }

            await auth.signOut();
            throw new Error('Please verify your email. We just sent you a verification link.');
        }
    } catch (error) {
        throw new Error(error.message || 'Login failed');
    }
}

/**
 * Register new user
 * @async
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} confirmPassword - Password confirmation
 * @returns {Promise<void>}
 */
async function registerUser(email, password, confirmPassword) {
    if (password !== confirmPassword) {
        throw new Error("Passwords don't match");
    }

    try {
        const credential = await auth.createUserWithEmailAndPassword(email, password);

        // Send verification email and sign out so the user must verify before using the app
        if (credential?.user) {
            await credential.user.sendEmailVerification();
            await auth.signOut();
        }
        return { verificationSent: true };
    } catch (error) {
        throw new Error(error.message || 'Registration failed');
    }
}

/**
 * Sign in with Google provider
 * @async
 * @returns {Promise<void>}
 */
async function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await auth.signInWithPopup(provider);
    } catch (error) {
        throw new Error(error.message || 'Google sign-in failed');
    }
}

/**
 * Send password reset email
 * @async
 * @param {string} email - User email
 * @returns {Promise<void>}
 */
async function sendPasswordResetEmail(email) {
    if (!email) {
        throw new Error('Please enter your email address.');
    }

    try {
        await auth.sendPasswordResetEmail(email);
    } catch (error) {
        throw new Error(error.message || 'Failed to send password reset email.');
    }
}

/**
 * Send email verification to current user
 * @async
 * @returns {Promise<void>}
 */
async function sendEmailVerification() {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('No user is currently signed in.');
    }

    try {
        await user.sendEmailVerification();
    } catch (error) {
        throw new Error(error.message || 'Failed to send verification email.');
    }
}

/**
 * Change user email (sends verification link)
 * @async
 * @param {string} newEmail - New email address
 * @returns {Promise<void>}
 */
async function changeUserEmail(newEmail) {
    if (!currentUser) {
        throw new Error('No user is logged in.');
    }

    if (!newEmail) {
        throw new Error('Please enter an email address.');
    }

    if (newEmail === currentUser.email) {
        throw new Error('You entered your current email. Please enter a different email address.');
    }

    try {
        await currentUser.verifyBeforeUpdateEmail(newEmail);
    } catch (error) {
        if (error.code === 'auth/requires-recent-login') {
            throw new Error('Please log out and log in again, then try changing your email.');
        } else if (error.code === 'auth/email-already-in-use') {
            throw new Error('This email is already in use by another account.');
        } else if (error.code === 'auth/invalid-email') {
            throw new Error('The email address is not valid.');
        } else if (error.code === 'auth/operation-not-allowed') {
            throw new Error('Email change is not allowed. Check your Firebase Authentication settings.');
        }
        throw new Error(error.message || 'Failed to change email.');
    }
}

/**
 * Link Google Account to current account
 * @async
 * @returns {Promise<void>}
 */
async function linkGoogleSignIn() {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('No user is logged in.');
    }

    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await user.linkWithPopup(provider);
    } catch (error) {
        throw new Error(error.message || 'Failed to link Google account.');
    }
}

/**
 * Unlink Google Account from current account
 * @async
 * @returns {Promise<void>}
 */
async function unlinkGoogleSignIn() {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('No user is logged in.');
    }

    try {
        await user.unlink('google.com');
    } catch (error) {
        throw new Error(error.message || 'Failed to unlink Google account.');
    }
}

/**
 * Check if user has Google provider linked
 * @returns {boolean}
 */
function isGoogleLinked() {
    const user = auth.currentUser;
    if (!user) return false;

    return user.providerData.some(provider => provider.providerId === 'google.com');
}

/**
 * Delete user account and all data
 * @async
 * @returns {Promise<void>}
 */
async function deleteUserAccount() {
    if (!currentUser) {
        throw new Error('No user is logged in.');
    }

    try {
        const userDocRef = db.collection('users').doc(currentUser.uid);

        // Delete subcollections
        const vocabSnapshot = await userDocRef.collection('vocabulary').get();
        const skillsSnapshot = await userDocRef.collection('skills').get();
        const portfolioSnapshot = await userDocRef.collection('portfolio').get();
        const metadataSnapshot = await userDocRef.collection('metadata').get();

        const batch = db.batch();
        vocabSnapshot.forEach(doc => batch.delete(doc.ref));
        skillsSnapshot.forEach(doc => batch.delete(doc.ref));
        portfolioSnapshot.forEach(doc => batch.delete(doc.ref));
        metadataSnapshot.forEach(doc => batch.delete(doc.ref));

        await batch.commit();

        // Delete mentor code if exists
        const codeDoc = await db.collection('mentorCodes').where('uid', '==', currentUser.uid).get();
        if (!codeDoc.empty) {
            await db.collection('mentorCodes').doc(codeDoc.docs[0].id).delete();
        }

        // Delete user document
        await userDocRef.delete();

        // Delete auth user
        await currentUser.delete();
    } catch (error) {
        if (error.code === 'auth/requires-recent-login') {
            throw new Error('Please log out and log in again, then try deleting your account.');
        }
        throw new Error(error.message || 'Error deleting account');
    }
}

/**
 * Sign out current user
 * @async
 * @returns {Promise<void>}
 */
async function logoutUser() {
    try {
        await auth.signOut();
    } catch (error) {
        throw new Error(error.message || 'Logout failed');
    }
}

/**
 * Watch authentication state changes
 * @param {Function} callback - Callback function(user)
 * @returns {Function} Unsubscribe function
 */
function onAuthStateChanged(callback) {
    return auth.onAuthStateChanged(callback);
}
