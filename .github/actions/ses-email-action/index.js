/**
 * SES Email Action - Main Entry Point
 *
 * This GitHub Action sends emails via AWS SES.
 * It reads inputs from the GitHub Actions environment and
 * delegates to the core email sending logic.
 */

const core = require('@actions/core');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { buildEmailParams } = require('./dist/index.js');

/**
 * Validates that required inputs are present and non-empty.
 * @param {string} name - The input name
 * @param {string} value - The input value
 * @throws {Error} if the value is empty
 */
function requireInput(name, value) {
  if (!value || value.trim() === '') {
    throw new Error(`Required input '${name}' is missing or empty`);
  }
}

/**
 * Main action entrypoint.
 * Reads GitHub Actions inputs, constructs SES email params,
 * and sends the email via AWS SES.
 */
async function run() {
  try {
    // Read inputs
    const awsRegion = core.getInput('aws-region') || 'us-east-1';
    const fromAddress = core.getInput('from');
    const toAddresses = core.getInput('to');
    const subject = core.getInput('subject');
    const body = core.getInput('body');
    const bodyHtml = core.getInput('body-html');
    const replyTo = core.getInput('reply-to');

    // Validate required inputs
    requireInput('from', fromAddress);
    requireInput('to', toAddresses);
    requireInput('subject', subject);

    if (!body && !bodyHtml) {
      throw new Error("At least one of 'body' or 'body-html' inputs must be provided");
    }

    // Parse comma-separated recipient list
    const toList = toAddresses.split(',').map((addr) => addr.trim()).filter(Boolean);
    const replyToList = replyTo
      ? replyTo.split(',').map((addr) => addr.trim()).filter(Boolean)
      : [];

    core.info(`Sending email from '${fromAddress}' to ${toList.length} recipient(s)`);

    // Build the SES email parameters
    const emailParams = buildEmailParams({
      from: fromAddress,
      to: toList,
      subject,
      body: body || undefined,
      bodyHtml: bodyHtml || undefined,
      replyTo: replyToList.length > 0 ? replyToList : undefined,
    });

    // Initialize the SES client
    const sesClient = new SESClient({ region: awsRegion });

    // Send the email
    const command = new SendEmailCommand(emailParams);
    const response = await sesClient.send(command);

    core.info(`Email sent successfully. MessageId: ${response.MessageId}`);
    core.setOutput('message-id', response.MessageId);
  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

run();
