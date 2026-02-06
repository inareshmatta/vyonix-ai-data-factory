/**
 * Budget Enforcer Cloud Function
 * Automatically stops Cloud Run service when budget is exceeded
 */

const { RunServiceClient } = require('@google-cloud/run').v2;

const PROJECT_ID = 'alert-nimbus-482707-p6';
const SERVICE_NAME = 'vyonix-studio';
const REGION = 'us-central1';
const BUDGET_LIMIT = 10; // $10 USD

exports.enforceBudget = async (pubsubMessage, context) => {
    const pubsubData = JSON.parse(
        Buffer.from(pubsubMessage.data, 'base64').toString()
    );

    console.log('Budget notification received:', JSON.stringify(pubsubData));

    // Extract cost and budget info
    const costAmount = pubsubData.costAmount || 0;
    const budgetAmount = pubsubData.budgetAmount || BUDGET_LIMIT;

    console.log(`Current cost: $${costAmount}, Budget: $${budgetAmount}`);

    // Check if we've exceeded or are at 100% of budget
    if (costAmount >= budgetAmount) {
        console.log('⚠️  BUDGET EXCEEDED! Pausing Cloud Run service...');

        try {
            const client = new RunServiceClient();
            const servicePath = `projects/${PROJECT_ID}/locations/${REGION}/services/${SERVICE_NAME}`;

            // Get current service configuration
            const [service] = await client.getService({ name: servicePath });

            // Scale to 0 instances to stop all traffic (keeps service deployed)
            const updatedService = {
                ...service,
                template: {
                    ...service.template,
                    scaling: {
                        maxInstanceCount: 0,
                        minInstanceCount: 0
                    }
                }
            };

            await client.updateService({
                service: updatedService,
                updateMask: { paths: ['template.scaling'] }
            });

            console.log('✅ Service paused successfully (scaled to 0 instances)!');
            console.log('📧 Budget exceeded. Service has been paused. No instances running = No charges.');

            return {
                success: true,
                message: 'Service paused due to budget limit (scaled to 0)'
            };
        } catch (error) {
            console.error('❌ Failed to pause service:', error);
            throw error;
        }
    } else {
        console.log(`✓ Budget OK (${((costAmount / budgetAmount) * 100).toFixed(1)}% used)`);
        return {
            success: true,
            message: 'Budget within limits'
        };
    }
};
