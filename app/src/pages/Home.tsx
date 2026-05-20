import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { 
  Link as LinkIcon, 
  ArrowRight, 
  ChartLineUp, 
  ShieldCheck, 
  Copy, 
  Trash, 
  SignOut, 
  Check,
  CaretDown,
  CaretUp,
  PencilSimple
} from 'phosphor-react';

interface LinkData {
  id: string; // The shortPath
  originalUrl: string;
  label: string;
  count: number;
  createdAt: any;
}

const Home: React.FC = () => {
  const [url, setUrl] = useState('');
  const [customPath, setCustomPath] = useState('');
  const [label, setLabel] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  
  // Dashboard & table states
  const [links, setLinks] = useState<LinkData[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [shortening, setShortening] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Edit Link States
  const [editingLink, setEditingLink] = useState<LinkData | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [editCustomPath, setEditCustomPath] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [editError, setEditError] = useState('');
  const [updating, setUpdating] = useState(false);

  const navigate = useNavigate();

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // Listen to Firestore urlRedirects real-time updates when logged in
  useEffect(() => {
    if (!user) {
      setLinks([]);
      setLoadingLinks(false);
      return;
    }

    setLoadingLinks(true);
    const q = query(
      collection(db, 'urlRedirects'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLinks: LinkData[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedLinks.push({
          id: docSnap.id,
          originalUrl: data.originalUrl,
          label: data.label || '',
          count: data.count || 0,
          createdAt: data.createdAt
        });
      });
      
      // Sort by createdAt descending
      fetchedLinks.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setLinks(fetchedLinks);
      setLoadingLinks(false);
    }, (err) => {
      console.error("Error loading links: ", err);
      setLoadingLinks(false);
    });

    return unsubscribe;
  }, [user]);

  // Handle Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setToast('Logged out successfully.');
      setTimeout(() => setToast(''), 3000);
    } catch (err) {
      console.error("Sign out failed: ", err);
    }
  };

  // Generate random 6 character slug
  const generateRandomSlug = () => {
    return Math.random().toString(36).substring(2, 8);
  };

  // Create Shortened Link
  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!url) return;

    // If not logged in, redirect to login
    if (!user) {
      navigate('/signin');
      return;
    }

    setShortening(true);

    let finalSlug = customPath.trim().toLowerCase();
    if (!finalSlug) {
      finalSlug = generateRandomSlug();
    }

    // Basic URL validation & clean
    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    try {
      // Check if custom path is taken
      const docRef = doc(db, 'urlRedirects', finalSlug);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setError(`The short path "${finalSlug}" is already taken. Please try another one.`);
        setShortening(false);
        return;
      }

      // Write new redirect
      await setDoc(docRef, {
        originalUrl: targetUrl,
        label: label.trim() || targetUrl.replace(/^https?:\/\/(www\.)?/, '').substring(0, 30),
        count: 0,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Clear input fields
      setUrl('');
      setCustomPath('');
      setLabel('');
      setShowOptions(false);
      
      setToast('Link shortened successfully!');
      setTimeout(() => setToast(''), 3000);
    } catch (err: any) {
      console.error("Error creating short link: ", err);
      setError(err.message || 'Failed to shorten URL');
    } finally {
      setShortening(false);
    }
  };

  const getShortUrl = (shortPath: string) => {
    const { hostname, protocol, host } = window.location;
    const baseDomain = (hostname === 'localhost' || hostname === '127.0.0.1')
      ? `${protocol}//${hostname}:5005`
      : `${protocol}//${host}`;
    return `${baseDomain}/${shortPath}`;
  };

  // Copy shortened URL to clipboard
  const handleCopyLink = (shortPath: string) => {
    const fullShortUrl = getShortUrl(shortPath);
    
    navigator.clipboard.writeText(fullShortUrl).then(() => {
      setCopiedId(shortPath);
      setToast('Copied to clipboard!');
      setTimeout(() => {
        setCopiedId(null);
        setToast('');
      }, 2500);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  // Delete Link
  const handleDeleteLink = async (shortPath: string) => {
    if (!window.confirm(`Are you sure you want to delete the short path "/${shortPath}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'urlRedirects', shortPath));
      setToast('Link deleted successfully.');
      setTimeout(() => setToast(''), 3000);
    } catch (err: any) {
      console.error('Failed to delete: ', err);
      setToast('Failed to delete link.');
      setTimeout(() => setToast(''), 3000);
    }
  };

  const startEditing = (link: LinkData) => {
    setEditingLink(link);
    setEditUrl(link.originalUrl);
    setEditCustomPath(link.id);
    setEditLabel(link.label);
    setEditError('');
  };

  const handleUpdateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');

    if (!editingLink) return;
    if (!editUrl.trim()) {
      setEditError('Original URL is required.');
      return;
    }

    const cleanSlug = editCustomPath.trim().toLowerCase();
    if (!cleanSlug) {
      setEditError('Short path slug is required.');
      return;
    }

    // URL Clean/Validation
    let targetUrl = editUrl.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    setUpdating(true);

    try {
      const isSlugChanged = cleanSlug !== editingLink.id;

      if (isSlugChanged) {
        // If slug changed, verify new slug isn't already taken
        const docRef = doc(db, 'urlRedirects', cleanSlug);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setEditError(`The short path "${cleanSlug}" is already taken by another link.`);
          setUpdating(false);
          return;
        }

        // Set new document with copy of data + modifications
        await setDoc(docRef, {
          originalUrl: targetUrl,
          label: editLabel.trim() || targetUrl.replace(/^https?:\/\/(www\.)?/, '').substring(0, 30),
          count: editingLink.count,
          ownerId: user?.uid || editingLink.id,
          createdAt: editingLink.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Delete old document
        await deleteDoc(doc(db, 'urlRedirects', editingLink.id));
      } else {
        // Same slug, just write/overwrite the existing doc ID
        const docRef = doc(db, 'urlRedirects', editingLink.id);
        await setDoc(docRef, {
          originalUrl: targetUrl,
          label: editLabel.trim() || targetUrl.replace(/^https?:\/\/(www\.)?/, '').substring(0, 30),
          count: editingLink.count,
          ownerId: user?.uid || editingLink.id,
          createdAt: editingLink.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      setEditingLink(null);
      setToast('Link updated successfully!');
      setTimeout(() => setToast(''), 3000);
    } catch (err: any) {
      console.error("Error updating link: ", err);
      setEditError(err.message || 'Failed to update link');
    } finally {
      setUpdating(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: 'var(--text-secondary)' }}>Loading dashboard...</p>
        <style dangerouslySetInnerHTML={{__html: `@keyframes spin { to { transform: rotate(360deg); } }`}} />
      </div>
    );
  }

  // Helper to format displaying username
  const getUserName = () => {
    if (!user) return '';
    const rawName = user.displayName || user.email?.split('@')[0] || 'User';
    return rawName.split('_').filter(Boolean).join(' ');
  };

  return (
    <div className="home-layout">
      {/* Toast Notification */}
      {toast && <div className="toast-message">{toast}</div>}

      {/* Navbar */}
      <nav className="navbar">
        <Link to="/" className="logo text-gradient">iurl.me</Link>
        <div className="nav-links flex-center" style={{ gap: '1rem' }}>
          {user ? (
            <>
              <div className="user-badge">
                <div className="user-avatar">
                  {getUserName().charAt(0).toUpperCase()}
                </div>
                <span className="user-name-text">Hi {getUserName()}</span>
              </div>
              <button onClick={handleLogout} className="btn btn-secondary flex-center" style={{ padding: '0.5rem 1rem' }}>
                <SignOut size={18} /> Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/signin" className="btn btn-secondary">Log in</Link>
              <Link to="/signup" className="btn btn-primary">Sign up Free</Link>
            </>
          )}
        </div>
      </nav>

      {/* Main hero or dashboard */}
      <main className="hero-section" style={{ justifyContent: user ? 'flex-start' : 'center', paddingTop: user ? '5rem' : '4rem' }}>
        <div className="hero-bg-glow"></div>
        
        <div className="container" style={{ maxWidth: '900px' }}>
          {user ? (
            <>
              {/* Logged in Dashboard Header */}
              <h1 className="dashboard-title text-gradient">
                Create & Manage Links
              </h1>
              <p className="dashboard-subtitle">
                Shorten long URLs, customize slugs, and track their analytics in real-time.
              </p>
            </>
          ) : (
            <>
              {/* Logged out Hero */}
              <h1 className="animate-fade-in text-gradient" style={{ fontSize: '4rem', letterSpacing: '-1px' }}>
                Build stronger digital connections
              </h1>
              <p className="animate-fade-in delay-1" style={{ fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
                Use our URL shortener, custom links, and QR codes to build your brand and connect with your audience.
              </p>
            </>
          )}

          {/* Creation Box */}
          <form className="glass-card animate-fade-in" style={{ padding: '2rem', textAlign: 'left', width: '100%', maxWidth: '800px', margin: '0 auto' }} onSubmit={handleShorten}>
            {error && (
              <div style={{ backgroundColor: 'rgba(231, 76, 60, 0.1)', color: 'var(--error)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.875rem', border: '1px solid rgba(231,76,60,0.2)' }}>
                {error}
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '0.5rem', color: 'var(--text-secondary)' }}>
                <LinkIcon size={24} />
              </div>
              <input 
                type="text" 
                className="input-field"
                style={{ flex: 1, fontSize: '1.1rem', padding: '1rem' }}
                placeholder="Paste a long URL here (e.g., https://example.com/very/long/path)" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0 2rem', fontSize: '1.1rem' }} disabled={shortening}>
                {shortening ? 'Creating...' : user ? 'Shorten' : 'Get Started'} <ArrowRight size={20} weight="bold" />
              </button>
            </div>

            {user && (
              <>
                <button 
                  type="button" 
                  className="expandable-form-toggle" 
                  onClick={() => setShowOptions(!showOptions)}
                >
                  {showOptions ? <CaretUp size={16} /> : <CaretDown size={16} />}
                  Advanced options (Custom slug, title label)
                </button>

                {showOptions && (
                  <div className="optional-fields">
                    <div className="input-group">
                      <label htmlFor="custom-slug">Custom Slug (optional)</label>
                      <input 
                        id="custom-slug"
                        type="text" 
                        className="input-field" 
                        placeholder="e.g. my-promo-link"
                        value={customPath}
                        onChange={(e) => setCustomPath(e.target.value)}
                      />
                    </div>
                    <div className="input-group">
                      <label htmlFor="link-label">Link Title Label (optional)</label>
                      <input 
                        id="link-label"
                        type="text" 
                        className="input-field" 
                        placeholder="e.g. Summer Campaign"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </form>

          {user ? (
            /* Links Table Card */
            <div className="glass-card links-table-card animate-fade-in delay-1">
              <div className="table-header">
                <h2>Your Shortened Links</h2>
                <div className="clicks-badge" style={{ padding: '0.4rem 1rem' }}>
                  Total: {links.length} {links.length === 1 ? 'Link' : 'Links'}
                </div>
              </div>

              {loadingLinks ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading links database...
                </div>
              ) : links.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <LinkIcon size={32} />
                  </div>
                  <h3>No shortened links yet</h3>
                  <p style={{ maxWidth: '300px' }}>Shorten your first long URL using the form above to start tracking clicks.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="links-table">
                    <thead>
                      <tr>
                        <th>Title & Shortened URL</th>
                        <th>Original URL</th>
                        <th style={{ textAlign: 'center' }}>Clicks</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {links.map((link) => {
                        const fullShortUrl = getShortUrl(link.id);
                        return (
                          <tr key={link.id}>
                            <td style={{ position: 'relative', overflow: 'visible' }}>
                              <div className="link-label-cell" style={{ overflow: 'visible' }}>
                                <div data-tooltip={link.label || `/${link.id}`} className="custom-tooltip-wrapper">
                                  <span className="link-label-text">
                                    {link.label || `/${link.id}`}
                                  </span>
                                </div>
                                <div data-tooltip={fullShortUrl} className="custom-tooltip-wrapper" style={{ marginTop: '0.25rem' }}>
                                  <a 
                                    href={fullShortUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="link-short-url-a"
                                  >
                                    /{link.id}
                                  </a>
                                </div>
                              </div>
                            </td>
                            <td style={{ position: 'relative', overflow: 'visible' }}>
                              <div data-tooltip={link.originalUrl} className="custom-tooltip-wrapper">
                                <span className="link-original-url">
                                  {link.originalUrl}
                                </span>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="clicks-badge">{link.count}</span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div className="action-buttons-cell" style={{ justifyContent: 'flex-end' }}>
                                <button 
                                  onClick={() => handleCopyLink(link.id)} 
                                  className={`icon-btn ${copiedId === link.id ? 'copy-active' : ''}`}
                                  title="Copy to clipboard"
                                >
                                  {copiedId === link.id ? <Check size={18} weight="bold" /> : <Copy size={18} />}
                                </button>
                                <button 
                                  onClick={() => startEditing(link)} 
                                  className="icon-btn edit-btn"
                                  title="Edit link"
                                >
                                  <PencilSimple size={18} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteLink(link.id)} 
                                  className="icon-btn delete-btn"
                                  title="Delete link"
                                >
                                  <Trash size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* Logged out Selling Points */
            <div className="animate-fade-in delay-3" style={{ display: 'flex', justifyContent: 'center', gap: '3rem', marginTop: '5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'rgba(80, 227, 194, 0.1)', padding: '1rem', borderRadius: '50%', color: 'var(--secondary)' }}>
                  <ChartLineUp size={32} />
                </div>
                <h3>Powerful Analytics</h3>
                <p style={{ fontSize: '0.9rem', maxWidth: '200px' }}>Track clicks, location, and device data in real-time.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                 <div style={{ background: 'rgba(74, 144, 226, 0.1)', padding: '1rem', borderRadius: '50%', color: 'var(--primary)' }}>
                  <ShieldCheck size={32} />
                </div>
                <h3>Secure & Reliable</h3>
                <p style={{ fontSize: '0.9rem', maxWidth: '200px' }}>Enterprise-grade security and 99.9% uptime guarantee.</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Edit Link Modal Overlay */}
      {editingLink && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Edit Shortened Link</h3>
              <button 
                onClick={() => setEditingLink(null)} 
                className="icon-btn" 
                style={{ border: 'none', background: 'transparent', padding: '0.2rem', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-secondary)' }}
                title="Close"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateLink}>
              <div className="modal-body">
                <div className="input-group">
                  <label htmlFor="edit-original-url">Original URL Destination</label>
                  <input 
                    id="edit-original-url"
                    type="text" 
                    className="input-field"
                    required
                    placeholder="https://example.com/very-long-link"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                  />
                </div>
                
                <div className="input-group">
                  <label htmlFor="edit-custom-path">Short Link Path Slug</label>
                  <div className="flex-center" style={{ gap: '0.25rem' }}>
                    <span style={{ color: 'var(--text-secondary)', paddingRight: '0.25rem', fontSize: '0.9rem' }}>iurl.me/</span>
                    <input 
                      id="edit-custom-path"
                      type="text" 
                      className="input-field"
                      required
                      placeholder="custom-slug"
                      value={editCustomPath}
                      onChange={(e) => setEditCustomPath(e.target.value)}
                    />
                  </div>
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="edit-link-label">Link Title Label</label>
                  <input 
                    id="edit-link-label"
                    type="text" 
                    className="input-field"
                    placeholder="e.g. Personal Instagram"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                  />
                </div>

                {editError && (
                  <div className="error-message">{editError}</div>
                )}
              </div>
              
              <div className="modal-footer">
                <button 
                  type="button" 
                  onClick={() => setEditingLink(null)} 
                  className="btn btn-secondary"
                  disabled={updating}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={updating}
                  style={{ padding: '0.5rem 1.5rem', fontSize: '0.9rem' }}
                >
                  {updating ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
