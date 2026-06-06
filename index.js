const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
// Render environment variables will store the Firebase Service Account JSON
try {
  let serviceAccount;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    // Fallback for local testing if running without env var
    // Do NOT commit your real serviceAccountKey.json to GitHub!
    serviceAccount = require('./serviceAccountKey.json');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("Firebase Admin Initialized Successfully");
} catch (error) {
  console.error("Failed to initialize Firebase Admin. Please ensure FIREBASE_SERVICE_ACCOUNT env var is set.", error);
}

const db = admin.firestore();

// The API Endpoint to trigger the bell
app.post('/ring-bell', async (req, res) => {
  try {
    const { targetToken, senderName, title, message } = req.body;

    if (!targetToken) {
      return res.status(400).json({ error: 'targetToken is required' });
    }

    // Prepare the FCM payload
    const payload = {
      notification: {
        title: title || 'Doorbell Rung!',
        body: message || `${senderName || 'Someone'} is at the door!`,
      },
      data: {
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        action: 'ring_bell',
      },
      token: targetToken,
    };

    // Send Push Notification via Firebase Cloud Messaging
    const response = await admin.messaging().send(payload);
    
    console.log(`Successfully sent message:`, response);
    return res.status(200).json({ success: true, response });

  } catch (error) {
    console.error("Error triggering bell:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.send('RemoteBell Backend is running!');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
