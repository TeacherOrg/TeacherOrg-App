import pb from './pb';

/**
 * Find a user by email address
 * @param {string} email - Email to search for
 * @returns {Promise<Object|null>} - User object or null if not found
 */
export async function findUserByEmail(email) {
  try {
    const sanitizedEmail = email.replace(/'/g, "\\'").trim().toLowerCase();
    const result = await pb.collection('users').getList(1, 1, {
      filter: `email = '${sanitizedEmail}'`
    });
    return result.items.length > 0 ? result.items[0] : null;
  } catch (error) {
    console.error('Error finding user by email:', error);
    return null;
  }
}

/**
 * Check if a user exists by email
 * @param {string} email - Email to check
 * @returns {Promise<boolean>}
 */
export async function userExistsByEmail(email) {
  const user = await findUserByEmail(email);
  return user !== null;
}
