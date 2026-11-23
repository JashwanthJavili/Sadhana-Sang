import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { submitSlokaRequest } from '../services/requests';
import MantraForm, { MantraFormValues } from './MantraForm';

interface SlokaRequestFormProps {
  onClose: () => void;
}

/** "Suggest a mantra" for devotees — goes to the admins for review. */
export default function SlokaRequestForm({ onClose }: SlokaRequestFormProps) {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();

  const send = async (v: MantraFormValues) => {
    if (!user || user.uid === 'guest') {
      showError('Please sign in to suggest a mantra');
      throw new Error('not signed in');
    }
    await submitSlokaRequest({
      title: v.title.trim(),
      sanskrit: v.mantra.trim(),
      transliteration: '',
      translation: v.meaning.trim(),
      category: v.category,
      purport: '',
      reference: '',
      requesterId: user.uid,
      requesterName: user.displayName || 'Devotee',
      requesterEmail: user.email || '',
    });
    showSuccess('Thank you', 'Your mantra will be added after review.');
    onClose();
  };

  return <MantraForm mode="suggest" onClose={onClose} onSubmit={send} />;
}
