require('dotenv').config();

const twilio = require('twilio');
const express = require('express');
const router = express.Router();

console.log('Loading SMS Service environment variables...');
console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID);
console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? 'Found' : 'Not found');
console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER);

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const client = twilio(accountSid, authToken);

// Store user SMS subscriptions (in production, use a database)
const smsSubscriptions = new Map();

// SMS Service Class
class SMSService {
    // Subscribe user for SMS updates
    static async subscribeUser(phoneNumber, preferences = {}) {
        try {
            console.log('Subscribing user:', phoneNumber);
            
            // Validate phone number format
            if (!this.isValidPhoneNumber(phoneNumber)) {
                throw new Error('Invalid phone number format');
            }

            // Store subscription preferences
            smsSubscriptions.set(phoneNumber, {
                isActive: true,
                preferences: {
                    busUpdates: preferences.busUpdates || true,
                    routeAlerts: preferences.routeAlerts || true,
                    emergencyAlerts: preferences.emergencyAlerts || true,
                    etaUpdates: preferences.etaUpdates || true,
                    subscribedRoutes: preferences.subscribedRoutes || [],
                    subscribedBuses: preferences.subscribedBuses || []
                },
                subscribedAt: new Date(),
                lastMessageSent: null
            });

            // Send welcome SMS
            const welcomeResult = await this.sendWelcomeSMS(phoneNumber);
            
            if (welcomeResult.success) {
                return {
                    success: true,
                    message: 'Successfully subscribed to SMS notifications'
                };
            } else {
                return {
                    success: false,
                    message: 'Subscribed but failed to send welcome SMS: ' + welcomeResult.error
                };
            }
        } catch (error) {
            console.error('SMS subscription error:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    // Send welcome SMS
    static async sendWelcomeSMS(phoneNumber) {
        const message = `Welcome to Raahi Bus Tracking SMS service!

You'll receive bus updates via SMS when internet is slow.

Commands:
- Reply "ETA [Bus Number]" for arrival time
- Reply "STATUS [Route]" for route status  
- Reply "STOP" to unsubscribe
- Reply "HELP" for more commands

Stay connected even in low network areas!`;

        return await this.sendSMS(phoneNumber, message);
    }

    // Send SMS using Twilio
    static async sendSMS(phoneNumber, message) {
        try {
            console.log('Attempting to send SMS to:', phoneNumber);
            console.log('From number:', twilioPhoneNumber);
            console.log('Message preview:', message.substring(0, 50) + '...');
            
            const result = await client.messages.create({
                body: message,
                from: twilioPhoneNumber,
                to: phoneNumber
            });

            console.log(`SMS sent successfully. SID: ${result.sid}`);
            
            // Update last message sent time
            const subscription = smsSubscriptions.get(phoneNumber);
            if (subscription) {
                subscription.lastMessageSent = new Date();
                smsSubscriptions.set(phoneNumber, subscription);
            }

            return {
                success: true,
                messageSid: result.sid,
                status: result.status
            };
        } catch (error) {
            console.error('SMS sending error:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Send bus ETA via SMS
    static async sendBusETA(phoneNumber, busNumber, eta, routeName) {
        const message = `🚌 Bus Update - Raahi

Bus: ${busNumber}
Route: ${routeName}
ETA: ${eta} minutes

Current time: ${new Date().toLocaleTimeString()}

Reply "STATUS ${busNumber}" for more details.`;

        return await this.sendSMS(phoneNumber, message);
    }

    // Send route status via SMS
    static async sendRouteStatus(phoneNumber, routeName, buses) {
        let message = `📍 Route Status - ${routeName}\n\n`;
        
        buses.forEach(bus => {
            message += `Bus ${bus.busNumber}: ${bus.status.toUpperCase()}\n`;
            message += `Occupancy: ${bus.currentOccupancy}/${bus.capacity}\n`;
            message += `Speed: ${bus.speed} km/h\n\n`;
        });

        message += `Time: ${new Date().toLocaleTimeString()}\nReply "ETA [Bus Number]" for arrival time.`;

        return await this.sendSMS(phoneNumber, message);
    }

    // Handle incoming SMS commands
    static async handleIncomingSMS(from, body) {
        console.log(`Processing SMS from ${from}: ${body}`);
        
        const command = body.trim().toUpperCase();
        const subscription = smsSubscriptions.get(from);

        if (!subscription || !subscription.isActive) {
            console.log('User not subscribed:', from);
            return await this.sendSMS(from, "You're not subscribed to SMS updates. Visit our app to subscribe first.");
        }

        try {
            if (command === 'STOP') {
                return await this.unsubscribeUser(from);
            } else if (command === 'HELP') {
                return await this.sendHelpSMS(from);
            } else if (command === 'START') {
                return await this.sendSMS(from, "You're already subscribed! Reply 'HELP' for commands.");
            } else if (command.startsWith('ETA ')) {
                const busNumber = command.replace('ETA ', '');
                return await this.handleETARequest(from, busNumber);
            } else if (command.startsWith('STATUS ')) {
                const route = command.replace('STATUS ', '');
                return await this.handleStatusRequest(from, route);
            } else {
                return await this.sendSMS(from, "Unknown command. Reply 'HELP' for available commands.");
            }
        } catch (error) {
            console.error('Error handling SMS command:', error);
            return await this.sendSMS(from, "Sorry, there was an error processing your request. Please try again.");
        }
    }

    // Send help SMS
    static async sendHelpSMS(phoneNumber) {
        const message = `📱 Raahi SMS Commands:

ETA [Bus Number] - Get arrival time
STATUS [Route Name] - Get route status
STOP - Unsubscribe from SMS
HELP - Show this help

Examples:
"ETA DL-1234"
"STATUS City Center"

24/7 SMS support for low network areas.`;

        return await this.sendSMS(phoneNumber, message);
    }

    // Handle ETA request
    static async handleETARequest(phoneNumber, busNumber) {
        console.log(`ETA requested for bus ${busNumber} by ${phoneNumber}`);
        // This integrates with your existing bus tracking logic
        // For now, returning a sample response
        const eta = Math.floor(Math.random() * 15) + 1; // Sample ETA
        return await this.sendBusETA(phoneNumber, busNumber, eta, "Sample Route");
    }

    // Handle status request  
    static async handleStatusRequest(phoneNumber, routeName) {
        console.log(`Status requested for route ${routeName} by ${phoneNumber}`);
        // Sample buses data - replace with actual data from your database
        const sampleBuses = [
            { busNumber: 'DL-1234', status: 'active', currentOccupancy: 15, capacity: 40, speed: 25 },
            { busNumber: 'DL-5678', status: 'idle', currentOccupancy: 8, capacity: 45, speed: 0 }
        ];
        return await this.sendRouteStatus(phoneNumber, routeName, sampleBuses);
    }

    // Unsubscribe user
    static async unsubscribeUser(phoneNumber) {
        const subscription = smsSubscriptions.get(phoneNumber);
        if (subscription) {
            subscription.isActive = false;
            smsSubscriptions.set(phoneNumber, subscription);
        }

        const message = `You've been unsubscribed from Raahi SMS updates.

To resubscribe, visit our app anytime.

Thank you for using Raahi!`;

        return await this.sendSMS(phoneNumber, message);
    }

    // Validate phone number
    static isValidPhoneNumber(phoneNumber) {
        // Remove any spaces, dashes, or parentheses
        const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
        
        // Check for valid international format
        const phoneRegex = /^\+[1-9]\d{7,15}$/;
        
        return phoneRegex.test(cleaned);
    }

    // Check if user is subscribed
    static isUserSubscribed(phoneNumber) {
        const subscription = smsSubscriptions.get(phoneNumber);
        return subscription && subscription.isActive;
    }

    // Get all active subscriptions
    static getActiveSubscriptions() {
        return Array.from(smsSubscriptions.entries())
            .filter(([phone, sub]) => sub.isActive)
            .map(([phone, sub]) => ({ phone, ...sub }));
    }
}

// API Routes
console.log('Setting up SMS API routes...');

// Test route
router.get('/test', (req, res) => {
    res.json({ 
        message: 'SMS service is working',
        timestamp: new Date().toISOString(),
        twilioConfigured: !!(accountSid && authToken && twilioPhoneNumber)
    });
});

// Subscribe to SMS notifications
router.post('/subscribe', async (req, res) => {
    console.log('=== SMS SUBSCRIBE ENDPOINT HIT ===');
    console.log('Request body:', req.body);
    
    const { phoneNumber, preferences } = req.body;

    if (!phoneNumber) {
        console.log('No phone number provided');
        return res.status(400).json({
            success: false,
            message: 'Phone number is required'
        });
    }

    console.log('Processing subscription for:', phoneNumber);
    const result = await SMSService.subscribeUser(phoneNumber, preferences);
    console.log('Subscription result:', result);
    
    res.json(result);
});

// Handle incoming webhooks from Twilio
router.post('/webhook', async (req, res) => {
    console.log('=== INCOMING SMS WEBHOOK RECEIVED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('From:', req.body.From);
    console.log('Body:', req.body.Body);
    console.log('Full Request Body:', JSON.stringify(req.body, null, 2));
    console.log('=====================================');
    
    const { From, Body } = req.body;
    
    try {
        await SMSService.handleIncomingSMS(From, Body);
        console.log('SMS command processed successfully');
    } catch (error) {
        console.error('Error handling incoming SMS:', error);
    }
    
    // Respond with empty TwiML to acknowledge
    res.set('Content-Type', 'text/xml');
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
});

// Send ETA to specific user
router.post('/send-eta', async (req, res) => {
    console.log('=== SEND ETA ENDPOINT HIT ===');
    console.log('Request body:', req.body);
    
    const { phoneNumber, busNumber, eta, routeName } = req.body;
    
    if (!phoneNumber || !busNumber) {
        return res.status(400).json({
            success: false,
            message: 'Phone number and bus number are required'
        });
    }
    
    const result = await SMSService.sendBusETA(phoneNumber, busNumber, eta, routeName);
    console.log('Send ETA result:', result);
    
    res.json(result);
});

// Send emergency alert
router.post('/emergency-alert', async (req, res) => {
    const { phoneNumber, message, busNumber } = req.body;
    
    const result = await SMSService.sendEmergencyAlert(phoneNumber, message, busNumber);
    res.json(result);
});

// Unsubscribe user
router.post('/unsubscribe', async (req, res) => {
    const { phoneNumber } = req.body;
    
    const result = await SMSService.unsubscribeUser(phoneNumber);
    res.json(result);
});

console.log('SMS Service initialized successfully');

module.exports = { SMSService, router };