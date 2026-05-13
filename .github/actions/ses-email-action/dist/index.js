/**
 * SES Email Action - Main Entry Point
 * Sends an email using AWS Simple Email Service (SES)
 * when triggered from a GitHub Actions workflow.
 */

'use strict';

const core = require('@actions/core');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

/**
 * Builds the email message object for the SES SendEmailCommand.
 *
 * @param {string} from - Sender email address
 * @param {string[]} toAddresses - List of recipient email addresses
 * @param {string} subject - Email subject line
 * @param {string} body - Email body (plain text)
 * @param {string|null} bodyHtml - Optional HTML email body
 * @returns {object} SES message params
 */
function buildEmailParams(from, toAddresses, subject, body, bodyHtml) {
  const message = {
    Source: from,
    Destination: {
      ToAddresses: toAddresses,
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        Text: {
          Data: body,
          Charset: 'UTF-8',
        },
      },
    },
  };

  if (bodyHtml) {
    message.Message.Body.Html = {
      Data: bodyHtml,
      Charset: 'UTF-8',
    };
  }

  return message;
}

/**
 * Main function — reads action inputs, creates SES client,
 * and sends the email.
 */
async function run() {
  try {
    // Required inputs
    const awsRegion = core.getInput('aws-region', { required: true });
    const from = core.getInput('from', { required: true });
    const to = core.getInput('to', { required: true });
    const subject = core.getInput('subject', { required: true });
    const body = core.getInput('body', { required: true });

    // Optional inputs
    const bodyHtml = core.getInput('body-html') || null;
    const awsAccessKeyId = core.getInput('aws-access-key-id') || undefined;
    const awsSecretAccessKey = core.getInput('aws-secret-access-key') || undefined;

    // Parse comma-separated recipient list
    const toAddresses = to.split(',').map((addr) => addr.trim()).filter(Boolean);

    if (toAddresses.length === 0) {
      throw new Error('No valid recipient addresses found in "to" input.');
    }

    core.info(`Sending email from "${from}" to ${toAddresses.join(', ')}`);

    // Configure SES client
    const clientConfig = { region: awsRegion };
    if (awsAccessKeyId && awsSecretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
      };
    }

    const sesClient = new SESClient(clientConfig);

    const params = buildEmailParams(from, toAddresses, subject, body, bodyHtml);
    const command = new SendEmailCommand(params);

    const response = await sesClient.send(command);

    core.info(`Email sent successfully. MessageId: ${response.MessageId}`);
    core.setOutput('message-id', response.MessageId);
  } catch (error) {
    core.setFailed(`Failed to send email: ${error.message}`);
  }
}

run();
