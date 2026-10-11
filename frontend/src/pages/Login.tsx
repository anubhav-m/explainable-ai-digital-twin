import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../App';
import { useAuth } from '../context/AuthContext';
import { AuthField, AuthShell } from '../components/AuthShell';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const res = await axios.post(`${API_BASE}/auth/login`, formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      login(res.data.access_token);
      navigate('/');
    } catch (err: any) {
      setError(err.response ? 'That email and password do not match. Try again.' : 'Could not reach the server. Check that the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Sign in"
      lede="Open your twin and pick up where you left off."
      error={error}
      footer={<>New here? <Link to="/signup" className="link text-ink">Create an account</Link></>}
    >
      <form onSubmit={handleLogin} className="mt-7 space-y-5">
        <AuthField label="Email address" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
        <AuthField label="Password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit" disabled={loading} className="btn w-full">{loading ? 'Signing in' : 'Sign in'}</button>
      </form>
    </AuthShell>
  );
};
