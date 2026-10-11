import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../App';
import { AuthField, AuthShell } from '../components/AuthShell';

export const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API_BASE}/auth/register`, {
        full_name: name,
        email: email,
        password: password
      });
      navigate('/login');
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail[0].msg);
      } else {
        setError(detail || (err.response ? 'The account could not be created. Check your details and try again.' : 'Could not reach the server. Check that the backend is running.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      lede="It takes a minute. Your twin starts empty and grows with each visit you log."
      error={error}
      footer={<>Already have an account? <Link to="/login" className="link text-ink">Sign in</Link></>}
    >
      <form onSubmit={handleSignup} className="mt-7 space-y-5">
        <AuthField label="Full name" type="text" autoComplete="name" value={name} onChange={e => setName(e.target.value)} />
        <AuthField label="Email address" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
        <AuthField label="Password" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit" disabled={loading} className="btn w-full">{loading ? 'Creating your account' : 'Create account'}</button>
      </form>
    </AuthShell>
  );
};
