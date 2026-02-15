require('dotenv').config();
const express = require('express');
const router = express.Router();
const axios = require('axios');

// msg91 Configuration
const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID || 'RAAHIB'; // 6 chars sender ID
const MSG91_ROUTE = process.env.MSG91_ROUTE || '4'; // 4 = Transactional

console.log('=== SMS SERVICE (msg91) ENVIRONMENT DEBUG ===');
console.log('MSG91_AUTH_KEY:', MSG91_AUTH_KEY ? `${MSG91_AUTH_KEY.substring(0, 10)}...` : 'NOT FOUND');
console.log('MSG91_SENDER_ID:', MSG91_SENDER_ID);
console.log('=====================================');

// Store user SMS subscriptions (in production, use a database)
const smsSubscriptions = new Map();

// SMS Service Class using msg91
class SMSService {
    // Test msg91 connection
    static async testConnection() {
        try {
            if (!MSG91_AUTH_KEY) {
                throw new Error('msg91 AUTH_KEY not configured');
            }

            // Test with balance check API
            const response = await axios.get('https://api.msg91.com/api/balance.php', {
                params: {
                    authkey: MSG91_AUTH_KEY,
                    type: 4 // SMS balance
                }
            });
            
            console.log('✅ msg91 connection test successful');
            console.log('SMS Balance:', response.data);
            return { success: true, balance: response.data };
        } catch (error) {
            console.error('❌ msg91 connection test failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Subscribe user for SMS updates
    static async subscribeUser(phoneNumber, preferences = {}) {
        try {
            console.log('=== SUBSCRIBE USER DEBUG ===');
            console.log('Phone number:', phoneNumber);
            
            // Test connection first
            const connectionTest = await this.testConnection();
            if (!connectionTest.success) {
                return {
                    success: false,
                    message: `msg91 connection failed: ${connectionTest.error}`
                };
            }
            
            // Validate phone number format
            if (!this.isValidPhoneNumber(phoneNumber)) {
                throw new Error('Invalid phone number format. Use: +91XXXXXXXXXX');
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

            console.log('User subscription stored, sending welcome SMS...');

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
        const message = `Welcome to Raahi Bus Tracking!

You'll receive bus updates via SMS when internet is slow.

Commands:
- Reply "ETA [Bus Number]" for arrival time
- Reply "STATUS [Route]" for route status
- Reply "STOP" to unsubscribe
- Reply "HELP" for more commands

Stay connected even in low network areas!`;

        return await this.sendSMS(phoneNumber, message);
    }

    // Send SMS using msg91
    static async sendSMS(phoneNumber, message) {
        try {
            console.log('=== SEND SMS DEBUG ===');
            console.log('To:', phoneNumber);
            console.log('Message length:', message.length);
            
            if (!MSG91_AUTH_KEY) {
                throw new Error('msg91 AUTH_KEY not configured');
            }

            // Remove + from phone number for msg91
            const cleanPhone = phoneNumber.replace('+', '');
            
            // msg91 API v5 - JSON format
            const response = await axios.post(
                'https://api.msg91.com/api/v5/flow/',
                {
                    template_id: process.env.MSG91_TEMPLATE_ID, // Optional: for template
                    short_url: '0',
                    recipients: [
                        {
                            mobiles: cleanPhone,
                            var1: message // If using template
                        }
                    ]
                },
                {
                    headers: {
                        'authkey': MSG91_AUTH_KEY,
                        'content-type': 'application/json'
                    }
                }
            );

            console.log('✅ SMS sent successfully via msg91!');
            console.log('Response:', response.data);
            
            // Update last message sent time
            const subscription = smsSubscriptions.get(phoneNumber);
            if (subscription) {
                subscription.lastMessageSent = new Date();
                smsSubscriptions.set(phoneNumber, subscription);
            }

            return {
                success: true,
                messageId: response.data.request_id,
                status: response.data.type
            };
        } catch (error) {
            console.error('❌ SMS sending failed:');
            console.error('Error:', error.response?.data || error.message);
            
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    // Alternative: Simple SMS without template (for testing)
    static async sendSimpleSMS(phoneNumber, message) {
        try {
            const cleanPhone = phoneNumber.replace('+', '');
            
            const response = await axios.get('https://api.msg91.com/api/sendhttp.php', {
                params: {
                    authkey: MSG91_AUTH_KEY,
                    mobiles: cleanPhone,
                    message: message,
                    sender: MSG91_SENDER_ID,
                    route: MSG91_ROUTE,
                    country: '91'
                }
            });

            console.log('✅ Simple SMS sent:', response.data);
            
            return {
                success: true,
                response: response.data
            };
        } catch (error) {
            console.error('❌ Simple SMS failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Send bus ETA via SMS
    static async sendBusETA(phoneNumber, busNumber, eta, routeName) {
        const message = `🚌 Raahi Bus Update

Bus: ${busNumber}
Route: ${routeName}
ETA: ${eta} minutes

Current time: ${new Date().toLocaleTimeString()}

Reply STATUS ${busNumber} for details`;

        // Use simple SMS for now (easier to test)
        return await this.sendSimpleSMS(phoneNumber, message);
    }

    // Validate phone number (Indian format)
    static isValidPhoneNumber(phoneNumber) {
        // Accept formats: +919876543210 or 9876543210
        const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
        
        // Indian mobile numbers: +91 followed by 10 digits starting with 6-9
        const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
        
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

// Test route
router.get('/test', async (req, res) => {
    const connectionTest = await SMSService.testConnection();
    
    res.json({ 
        message: 'msg91 SMS service is working',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        msg91Configured: !!MSG91_AUTH_KEY,
        connectionTest: connectionTest
    });
});

// Subscribe to SMS notifications
router.post('/subscribe', async (req, res) => {
    console.log('=== SMS SUBSCRIBE ENDPOINT HIT ===');
    console.log('Request body:', req.body);
    
    const { phoneNumber, preferences } = req.body;

    if (!phoneNumber) {
        return res.status(400).json({
            success: false,
            message: 'Phone number is required'
        });
    }

    const result = await SMSService.subscribeUser(phoneNumber, preferences);
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
    res.json(result);
});

console.log('✅ SMS Service (msg91) initialized');

module.exports = { SMSService, router };