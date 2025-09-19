require('dotenv').config();

const twilio = require('twilio');
const express = require('express');
const router = express.Router();

// Enhanced logging for environment variables
console.log('=== SMS SERVICE ENVIRONMENT DEBUG ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? `${process.env.TWILIO_ACCOUNT_SID.substring(0, 10)}...` : 'NOT FOUND');
console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? `${process.env.TWILIO_AUTH_TOKEN.substring(0, 10)}...` : 'NOT FOUND');
console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER || 'NOT FOUND');
console.log('All env keys:', Object.keys(process.env).filter(key => key.startsWith('TWILIO')));
console.log('=====================================');

// Initialize Twilio client with error handling
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Validate credentials before creating client
if (!accountSid || !authToken || !twilioPhoneNumber) {
    console.error('❌ CRITICAL: Missing Twilio credentials!');
    console.error('AccountSid:', !!accountSid);
    console.error('AuthToken:', !!authToken);
    console.error('PhoneNumber:', !!twilioPhoneNumber);
}

let client;
try {
    client = twilio(accountSid, authToken);
    console.log('✅ Twilio client initialized successfully');
} catch (error) {
    console.error('❌ Failed to initialize Twilio client:', error.message);
}

// Store user SMS subscriptions (in production, use a database)
const smsSubscriptions = new Map();

// SMS Service Class
class SMSService {
    // Test Twilio connection
    static async testTwilioConnection() {
        try {
            if (!client) {
                throw new Error('Twilio client not initialized');
            }
            
            // Try to fetch account details
            const account = await client.api.accounts(accountSid).fetch();
            console.log('✅ Twilio connection test successful');
            console.log('Account status:', account.status);
            return { success: true, status: account.status };
        } catch (error) {
            console.error('❌ Twilio connection test failed:', error.message);
            console.error('Error code:', error.code);
            console.error('Error details:', error);
            return { success: false, error: error.message, code: error.code };
        }
    }

    // Subscribe user for SMS updates
    static async subscribeUser(phoneNumber, preferences = {}) {
        try {
            console.log('=== SUBSCRIBE USER DEBUG ===');
            console.log('Phone number:', phoneNumber);
            console.log('Client available:', !!client);
            console.log('AccountSid available:', !!accountSid);
            console.log('AuthToken available:', !!authToken);
            console.log('TwilioPhone available:', !!twilioPhoneNumber);
            
            // Test Twilio connection first
            const connectionTest = await this.testTwilioConnection();
            if (!connectionTest.success) {
                console.error('Twilio connection failed:', connectionTest.error);
                return {
                    success: false,
                    message: `Twilio connection failed: ${connectionTest.error}`
                };
            }
            
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

            console.log('User subscription stored, attempting to send welcome SMS...');

            // Send welcome SMS
            const welcomeResult = await this.sendWelcomeSMS(phoneNumber);
            console.log('Welcome SMS result:', welcomeResult);
            
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

    // Send SMS using Twilio with enhanced debugging
    static async sendSMS(phoneNumber, message) {
        try {
            console.log('=== SEND SMS DEBUG ===');
            console.log('To:', phoneNumber);
            console.log('From:', twilioPhoneNumber);
            console.log('Message length:', message.length);
            console.log('Client initialized:', !!client);
            
            if (!client) {
                throw new Error('Twilio client not initialized');
            }
            
            if (!twilioPhoneNumber) {
                throw new Error('Twilio phone number not configured');
            }
            
            console.log('Calling Twilio API...');
            const result = await client.messages.create({
                body: message,
                from: twilioPhoneNumber,
                to: phoneNumber
            });

            console.log(`✅ SMS sent successfully!`);
            console.log('Message SID:', result.sid);
            console.log('Status:', result.status);
            console.log('Price:', result.price);
            
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
            console.error('❌ SMS sending failed:');
            console.error('Error message:', error.message);
            console.error('Error code:', error.code);
            console.error('Status:', error.status);
            console.error('More info:', error.moreInfo);
            console.error('Full error:', error);
            
            return {
                success: false,
                error: error.message,
                code: error.code,
                status: error.status
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
}

// API Routes
console.log('Setting up SMS API routes...');

// Enhanced test route
router.get('/test', async (req, res) => {
    const connectionTest = await SMSService.testTwilioConnection();
    
    res.json({ 
        message: 'SMS service is working',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        twilioConfigured: !!(accountSid && authToken && twilioPhoneNumber),
        connectionTest: connectionTest,
        credentials: {
            accountSid: !!accountSid,
            authToken: !!authToken,
            phoneNumber: !!twilioPhoneNumber
        }
    });
});

// Subscribe to SMS notifications
router.post('/subscribe', async (req, res) => {
    console.log('=== SMS SUBSCRIBE ENDPOINT HIT ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Request body:', req.body);
    console.log('Headers:', req.headers);
    
    const { phoneNumber, preferences } = req.body;

    if (!phoneNumber) {
        console.log('❌ No phone number provided');
        return res.status(400).json({
            success: false,
            message: 'Phone number is required'
        });
    }

    console.log('Processing subscription for:', phoneNumber);
    const result = await SMSService.subscribeUser(phoneNumber, preferences);
    console.log('Final subscription result:', result);
    
    res.json(result);
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

console.log('✅ SMS Service initialized');

module.exports = { SMSService, router };