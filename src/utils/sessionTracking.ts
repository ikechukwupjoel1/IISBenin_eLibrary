import { supabase } from '../lib/supabase';

// Generate a unique session token
function generateSessionToken(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
}

// Get stored session token
function getStoredSessionToken(): string | null {
  return sessionStorage.getItem('session_token');
}

// Store session token
function storeSessionToken(token: string): void {
  sessionStorage.setItem('session_token', token);
}

// Remove session token
function removeSessionToken(): void {
  sessionStorage.removeItem('session_token');
}

// Start a new session
export async function startSession(): Promise<string | null> {
  try {
    const sessionToken = generateSessionToken();
    const userAgent = navigator.userAgent;
    
    // Get IP address (optional - may fail due to CORS)
    let ipAddress: string | null = null;
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      ipAddress = ipData.ip;
    } catch {
      // IP fetch failed, continue without it
    }

    const { error } = await supabase.rpc('start_session', {
      p_session_token: sessionToken,
      p_user_agent: userAgent,
      p_ip_address: ipAddress
    });

    if (error) {
      console.error('Failed to start session:', error);
      return null;
    }

    storeSessionToken(sessionToken);
    
    // Set up periodic activity updates
    setupActivityTracking(sessionToken);
    
    return sessionToken;
  } catch (error) {
    console.error('Error starting session:', error);
    return null;
  }
}

// Update session activity
export async function updateSessionActivity(): Promise<boolean> {
  try {
    const sessionToken = getStoredSessionToken();
    if (!sessionToken) return false;

    const { data, error } = await supabase.rpc('update_session_activity', {
      p_session_token: sessionToken
    });

    if (error) {
      console.error('Failed to update session activity:', error);
      return false;
    }

    return data || false;
  } catch (error) {
    console.error('Error updating session activity:', error);
    return false;
  }
}

// End current session
export async function endSession(): Promise<boolean> {
  try {
    const sessionToken = getStoredSessionToken();
    if (!sessionToken) return false;

    const { data, error } = await supabase.rpc('end_session', {
      p_session_token: sessionToken
    });

    if (error) {
      console.error('Failed to end session:', error);
      return false;
    }

    removeSessionToken();
    clearActivityTracking();
    
    return data || false;
  } catch (error) {
    console.error('Error ending session:', error);
    return false;
  }
}

// Set up periodic activity tracking
let activityInterval: NodeJS.Timeout | null = null;

function setupActivityTracking(_sessionToken: string): void {
  // Clear any existing interval
  clearActivityTracking();
  
  // Update activity every 5 minutes
  activityInterval = setInterval(() => {
    updateSessionActivity();
  }, 5 * 60 * 1000); // 5 minutes
  
  // Update on user activity (mouse move, click, keypress)
  let lastActivityTime = Date.now();
  
  const updateOnActivity = () => {
    const now = Date.now();
    // Only update if more than 1 minute has passed since last update
    if (now - lastActivityTime > 60 * 1000) {
      lastActivityTime = now;
      updateSessionActivity();
    }
  };
  
  document.addEventListener('mousemove', updateOnActivity, { passive: true });
  document.addEventListener('click', updateOnActivity);
  document.addEventListener('keypress', updateOnActivity);
}

function clearActivityTracking(): void {
  if (activityInterval) {
    clearInterval(activityInterval);
    activityInterval = null;
  }
  
  // Note: We don't remove event listeners as they're lightweight and passive
}

// Clean up on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    // Try to end session (may not complete due to browser closing)
    const sessionToken = getStoredSessionToken();
    if (sessionToken) {
      // Use sendBeacon for more reliable cleanup
      navigator.sendBeacon(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/end-session`,
        JSON.stringify({ session_token: sessionToken })
      );
    }
  });
}
