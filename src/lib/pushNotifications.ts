import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function initializePushNotifications(userId: string) {
  // Push notifications are only supported on native platforms
  if (Capacitor.getPlatform() === 'web') {
    console.info('Push notifications are not supported on web platform.');
    return;
  }

  try {
    // Request permission to use push notifications
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('User denied push notification permissions!');
      return;
    }

    // On success, we should be able to receive notifications
    await PushNotifications.register();

    // On success, we should be able to receive notifications
    PushNotifications.addListener('registration', async (token) => {
      console.log('Push registration success, token: ' + token.value);
      // Save token to Firestore
      try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          fcm_token: token.value,
        });
      } catch (err) {
        console.error('Error saving FCM token:', err);
      }
    });

    // Some issue with our setup and push will not work
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Error on registration: ' + JSON.stringify(error));
    });

    // Show us the notification payload if the app is open on our device
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received: ' + JSON.stringify(notification));
    });

    // Method called when tapping on a notification
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed: ' + JSON.stringify(notification));
    });
  } catch (err) {
    console.error('Error initializing push notifications:', err);
  }
}
