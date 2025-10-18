import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../utils/api';

const SentPage = () => {
  const [sent, setSent] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetchWithAuth('/mails', token)
      .then(data => setSent(data.sent || []))
      .catch(err => setError(err.message));
  }, []);

  return (
    <div>
      <h1>Sent</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <ul>
        {sent.map(mail => (
          <li key={mail.id}>
            <strong>{mail.subject}</strong> - To: {mail.recipient}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SentPage;
