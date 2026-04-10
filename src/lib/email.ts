import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

export const sendEmail = async (to: string | string[], subject: string, html: string) => {
  try {
    await addDoc(collection(db, 'mail'), {
      to: Array.isArray(to) ? to : [to],
      from: '"GUANTES" <guantesparaencajar@gmail.com>',
      replyTo: 'guantesparaencajar@gmail.com',
      message: {
        subject: subject,
        html: html,
      },
    });
    console.log('Email queued for delivery to:', to);
  } catch (error) {
    console.error('Error queueing email:', error);
  }
};
