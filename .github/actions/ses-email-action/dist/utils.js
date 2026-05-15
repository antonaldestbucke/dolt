/**
 * Utility functions for the SES email action.
 * Provides helpers for email validation, template rendering,
 * and error handling used across the action.
 */

'use strict';

const core = require('@actions/core');

/**
 * Validates an email address format using RFC 5322 simplified regex.
 * @param {string} email - The email address to validate.
 * @returns {boolean} True if valid, false otherwise.
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

/**
 * Parses a comma-separated list of email addresses.
 * Filters out any invalid addresses and logs warnings.
 * @param {string} emailList - Comma-separated email addresses.
 * @returns {string[]} Array of valid email addresses.
 */
function parseEmailList(emailList) {
  if (!emailList) return [];
  const emails = emailList.split(',').map(e => e.trim()).filter(Boolean);
  const valid = [];
  for (const email of emails) {
    if (isValidEmail(email)) {
      valid.push(email);
    } else {
      core.warning(`Skipping invalid email address: ${email}`);
    }
  }
  return valid;
}

/**
 * Truncates a string to a maximum length, appending ellipsis if needed.
 * @param {string} str - The string to truncate.
 * @param {number} maxLength - Maximum allowed length.
 * @returns {string} Truncated string.
 */
function truncate(str, maxLength = 100) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Formats an AWS error for human-readable logging.
 * @param {Error} err - The error object from AWS SDK.
 * @returns {string} Formatted error message.
 */
function formatAwsError(err) {
  if (!err) return 'Unknown error';
  const code = err.Code || err.code || err.name || 'UnknownError';
  const message = err.message || err.Message || 'No message provided';
  const requestId = err.$metadata && err.$metadata.requestId
    ? ` (RequestId: ${err.$metadata.requestId})`
    : '';
  return `[${code}] ${message}${requestId}`;
}

/**
 * Builds a plain-text fallback from an HTML email body.
 * Strips common HTML tags for a simple text version.
 * @param {string} html - HTML content string.
 * @returns {string} Plain text content.
 */
function htmlToPlainText(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/?(h[1-6]|p|div|li|ul|ol|tr|td|th)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Retries an async function with exponential backoff.
 * @param {Function} fn - Async function to retry.
 * @param {number} maxRetries - Maximum number of retry attempts.
 * @param {number} baseDelayMs - Base delay in milliseconds.
 * @returns {Promise<any>} Result of the function.
 */
async function withRetry(fn, maxRetries = 3, baseDelayMs = 500) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        core.debug(`Attempt ${attempt + 1} failed: ${err.message}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

module.exports = {
  isValidEmail,
  parseEmailList,
  truncate,
  formatAwsError,
  htmlToPlainText,
  withRetry,
};
