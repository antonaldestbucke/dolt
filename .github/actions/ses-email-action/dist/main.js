/**
 * Main entry point for the SES Email Action.
 * Handles sending emails via AWS SES using the provided inputs.
 */

'use strict';

const core = require('@actions/core');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { buildEmailParams } = require('./index.js');

/**
 * Validates that required AWS credentials are present in the environment.
 * @throws {Error} If any required credential is missing.
 */
function validateCredentials() {
  const required = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'];
  for (const envVar of required) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
}

/**
 * Creates and returns an SES client configured for the current environment.
 * @returns {SESClient} Configured SES client instance.
 */
function createSESClient() {
  return new SESClient({
    region: process.env.AWS_REGION || core.getInput('aws-region'),
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN,
    },
  });
}

/**
 * Main function that orchestrates the email sending workflow.
 * Reads action inputs, builds email parameters, and sends via SES.
 */
async function run() {
  try {
    // Validate that necessary AWS credentials are available
    validateCredentials();

    // Read action inputs
    const toAddresses = core.getInput('to', { required: true }).split(',').map(s => s.trim());
    const fromAddress = core.getInput('from', { required: true });
    const subject = core.getInput('subject', { required: true });
    const body = core.getInput('body', { required: true });
    const bodyType = core.getInput('body-type') || 'text';
    const ccAddresses = core.getInput('cc') ? core.getInput('cc').split(',').map(s => s.trim()) : [];
    const bccAddresses = core.getInput('bcc') ? core.getInput('bcc').split(',').map(s => s.trim()) : [];

    core.info(`Sending email to: ${toAddresses.join(', ')}`);
    core.info(`Subject: ${subject}`);

    // Build email parameters using the shared helper
    const emailParams = buildEmailParams({
      toAddresses,
      fromAddress,
      subject,
      body,
      bodyType,
      ccAddresses,
      bccAddresses,
    });

    // Create the SES client and send the email
    const client = createSESClient();
    const command = new SendEmailCommand(emailParams);
    const response = await client.send(command);

    core.info(`Email sent successfully. Message ID: ${response.MessageId}`);
    core.setOutput('message-id', response.MessageId);
  } catch (error) {
    core.error(`Failed to send email: ${error.message}`);
    core.setFailed(error.message);
  }
}

// Execute the main function
run();
