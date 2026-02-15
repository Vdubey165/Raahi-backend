require('dotenv').config();
const twilio = require('twilio');
const express = require('express');
const router = express.Router();

// Twilio Configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let client;
try {
    client = twilio(accountSid, authToken);
    console.log('✅ Twilio client initialized');
} catch (error) {
    console.error('❌ Failed to initialize Twilio:', error.message);
}

// Store subscriptions
const smsSubscriptions = new Map();

class SMSService {
    static async sendSMS(phoneNumber, message) {
        try {
            const result = await client.messages.create({
                body: message,
                from: twilioPhoneNumber,
                to: phoneNumber
            });

            console.log('✅ SMS sent:', result.sid);
            return { success: true, messageSid: result.sid };
        } catch (error) {
            console.error('❌ SMS failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    static async subscribeUser(phoneNumber, preferences = {}) {
        // Store subscription
        smsSubscriptions.set(phoneNumber, {
            isActive: true,
            preferences: preferences,
            subscribedAt: new Date()
        });

        // Send welcome SMS
        const welcomeMsg = `Welcome to Raahi Bus Tracking!

You'll receive bus updates via SMS.

Commands:
- Reply "ETA [Bus]" for arrival time
- Reply "STATUS [Route]" for route status
- Reply "STOP" to unsubscribe

Stay connected!`;

        return await this.sendSMS(phoneNumber, welcomeMsg);
    }

    static async sendBusETA(phoneNumber, busNumber, eta, routeName) {
        const message = `🚌 Bus Update - Raahi

Bus: ${busNumber}
Route: ${routeName}
ETA: ${eta} minutes

Time: ${new Date().toLocaleTimeString()}

Reply STATUS ${busNumber} for details`;

        return await this.sendSMS(phoneNumber, message);
    }
}

// Routes
router.get('/test', (req, res) => {
    res.json({ 
        message: 'Twilio SMS service working',
        configured: !!(accountSid && authToken && twilioPhoneNumber)
    });
});

router.post('/subscribe', async (req, res) => {
    const { phoneNumber, preferences } = req.body;
    const result = await SMSService.subscribeUser(phoneNumber, preferences);
    res.json(result);
});

router.post('/send-eta', async (req, res) => {
    const { phoneNumber, busNumber, eta, routeName } = req.body;
    const result = await SMSService.sendBusETA(phoneNumber, busNumber, eta, routeName);
    res.json(result);
});

module.exports = { SMSService, router };