import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getAuth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { app } from '../firebase';
import { EnvelopeSimple, LockKey, GoogleLogo } from 'phosphor-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth(app);

  const isSignUp = location.pathname === '/signup';

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    setError('');
    
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || `Failed to ${isSignUp ? 'sign up' : 'log in'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to log in with Google');
    }
  };

  return (
    <div className="login-layout">
      <div className="hero-bg-glow" style={{ opacity: 0.5 }}></div>
      <div className="container" style={{ position: 'absolute', top: '1.5rem', left: '0', padding: '0 2rem' }}>
        <Link to="/" className="logo text-gradient">iurl.me</Link>
      </div>

      <div className="glass-card login-card animate-fade-in">
        <div className="text-center mb-4">
          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {isSignUp ? 'Get started with a free iurl.me account' : 'Log in to your iurl.me account'}
          </p>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(231, 76, 60, 0.1)', color: 'var(--error)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <button 
          type="button" 
          className="btn btn-google"
          onClick={handleGoogleLogin}
        >
          <GoogleLogo size={20} weight="bold" color="#ea4335" />
          {isSignUp ? 'Sign up with Google' : 'Continue with Google'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0', color: 'var(--border)' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}></div>
          <span style={{ padding: '0 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>or</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}></div>
        </div>

        <form onSubmit={handleEmailAuth}>
          <div className="input-group">
            <label htmlFor="email">Email address</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                <EnvelopeSimple size={20} />
              </div>
              <input 
                id="email"
                type="email" 
                className="input-field" 
                style={{ paddingLeft: '2.5rem' }}
                placeholder="name@company.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="password">Password</label>
              {!isSignUp && (
                <Link to="/forgot-password" style={{ fontSize: '0.875rem', color: 'var(--primary)', textDecoration: 'none' }}>Forgot password?</Link>
              )}
            </div>
            <div style={{ position: 'relative' }}>
               <div style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                <LockKey size={20} />
              </div>
              <input 
                id="password"
                type="password" 
                className="input-field" 
                style={{ paddingLeft: '2.5rem' }}
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? (isSignUp ? 'Creating account...' : 'Logging in...') : (isSignUp ? 'Sign up' : 'Log in')}
          </button>
        </form>

        <p className="text-center" style={{ marginTop: '1.5rem', fontSize: '0.875rem' }}>
          {isSignUp ? (
            <>
              Already have an account? <Link to="/signin" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '500' }}>Log in</Link>
            </>
          ) : (
            <>
              Don't have an account? <Link to="/signup" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '500' }}>Sign up</Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default Login;
