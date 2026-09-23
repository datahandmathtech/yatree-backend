const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.receiveMessage = async (req, res) => {
    try {
        console.log('Received WhatsApp Webhook Payload:', JSON.stringify(req.body, null, 2));

        // Basic parsing for GreenAPI / UltraMsg format
        // (This will be adjusted based on the specific provider's payload structure)
        
        let messageText = '';
        let senderPhone = '';

        // Example for GreenAPI
        if (req.body.messageData && req.body.messageData.textMessageData) {
            messageText = req.body.messageData.textMessageData.textMessage;
            senderPhone = req.body.senderData?.sender;
        } 
        // Example for UltraMsg
        else if (req.body.data && req.body.data.body) {
            messageText = req.body.data.body;
            senderPhone = req.body.data.from;
        }

        console.log(`Parsed Message: "${messageText}" from ${senderPhone}`);

        // Acknowledge receipt to the API provider immediately
        res.status(200).json({ success: true });

        // TODO: Pass messageText to Google Gemini AI to extract Fuel Entry data
        // TODO: Save to Fuel collection

    } catch (error) {
        console.error('Error in WhatsApp Webhook:', error);
        // Still return 200 so the API provider doesn't keep retrying
        res.status(200).send('Error processed');
    }
};
