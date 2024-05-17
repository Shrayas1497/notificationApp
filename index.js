require('dotenv').config();
const { App } = require('@slack/bolt');
const http = require('http');

// Initialize Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

// Handle /approval-test slash command
app.command('/approval-test', async ({ command, ack, client }) => {
  await ack();
  try {
    await client.views.open({
      trigger_id: command.trigger_id,
      view: {
        type: 'modal',
        callback_id: 'approval_modal',
        title: {
          type: 'plain_text',
          text: 'Approval Request'
        },
        blocks: [
          {
            type: 'input',
            block_id: 'approver_block',
            element: {
              type: 'users_select',
              action_id: 'approver',
              placeholder: {
                type: 'plain_text',
                text: 'Select an approver'
              }
            },
            label: {
              type: 'plain_text',
              text: 'Approver'
            }
          },
          {
            type: 'input',
            block_id: 'request_block',
            element: {
              type: 'plain_text_input',
              multiline: true,
              action_id: 'request'
            },
            label: {
              type: 'plain_text',
              text: 'Approval Request'
            }
          }
        ],
        submit: {
          type: 'plain_text',
          text: 'Submit'
        }
      }
    });
  } catch (error) {
    console.error(error);
  }
});

// Handle approval modal submission
app.view('approval_modal', async ({ ack, body, view, client }) => {
  await ack();

  const approver = view.state.values.approver_block.approver.selected_user;
  const requestText = view.state.values.request_block.request.value;

  try {
    await client.chat.postMessage({
      channel: approver,
      text: `Approval Request: ${requestText}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Approval Request:* ${requestText}`
          }
        },
        {
          type: 'actions',
          block_id: 'approval_actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Approve'
              },
              style: 'primary',
              action_id: 'approve'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Reject'
              },
              style: 'danger',
              action_id: 'reject'
            }
          ]
        }
      ]
    });
  } catch (error) {
    console.error(error);
  }
});

// Handle approve and reject actions
app.action('approve', async ({ body, ack, client }) => {
  await ack();
  await handleApprovalResponse(body, client, 'approved');
});

app.action('reject', async ({ body, ack, client }) => {
  await ack();
  await handleApprovalResponse(body, client, 'rejected');
});

const handleApprovalResponse = async (body, client, response) => {
  try {
    const requester = body.message.user; // Assuming requester is stored in the message's user field
    const approver = body.user.id;
    await client.chat.postMessage({
      channel: requester,
      text: `Your request has been ${response} by <@${approver}>.`
    });
  } catch (error) {
    console.error(error);
  }
};

// Start the Slack app and HTTP server
(async () => {
  const port = process.env.PORT || 3000;
  try {
    await app.start(port);
    console.log(`⚡️ Slack app is running on port ${port}!`);
    
    // Simple HTTP server
    http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Hello! This is a Slack app.');
    }).listen(port);
  } catch (error) {
    console.error('Failed to start Slack app:', error);
  }
})();
