document.addEventListener("DOMContentLoaded", function () {
      const form = document.getElementById("login-form");
      if (!form) return;

      form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const email = form.elements['email'].value;
        const password = form.elements['user_password'].value;

        try {
          const response = await fetch('/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password }),
            credentials: 'include' // Important: include cookies in the request
          });

          if (response.ok) {
            const data = await response.json();
            
            if (data.access_token) {
              // Store token in localStorage
              localStorage.setItem('access_token', data.access_token);
              
              // Also store in sessionStorage as backup
              sessionStorage.setItem('access_token', data.access_token);
              
              // Set a custom cookie if HTTP-only cookies aren't working
              document.cookie = `access_token=${data.access_token}; path=/; max-age=3600; SameSite=Strict`;
              
              showNotification('Login successful! Redirecting...', 'success');
              
              // Add a slight delay to ensure cookies are set
              setTimeout(() => {
                // Redirect with token in URL as a last resort
                window.location.href = `/setpreference?token=${encodeURIComponent(data.access_token)}`;
              }, 500);
            } else {
              showNotification('Login successful but no token received', 'warning');
              window.location.href = '/dashboard';
            }
          } else {
            // Parse error message if available
            let errorMessage = 'Login failed. Please check your credentials.';
            try {
              const errorData = await response.json();
              if (errorData.detail) {
                errorMessage = errorData.detail;
              }
            } catch (e) {
              // If response is not JSON, use default message
            }
            showNotification(errorMessage, 'error');
          }
        } catch (error) {
          showNotification('Network error. Please try again.', 'error');
          console.error('Login error:', error);
        }
      });

      const manualLink = document.getElementById('manual-preferences-link');
      if (manualLink) {
        manualLink.addEventListener('click', function(e) {
          e.preventDefault();
          const token = localStorage.getItem('access_token');
          if (token) {
            window.location.href = `/setpreference?token=${encodeURIComponent(token)}`;
          } else {
            showNotification('Please login first to get a token', 'error');
          }
        });
      }
    });

    // Add notification function
    function showNotification(message, type = 'info') {
      // Check if notification container exists
      let container = document.getElementById('notification-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
      }

      // Create notification
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;
      notification.style.backgroundColor = type === 'error' ? '#f8d7da' : 
                                           type === 'success' ? '#d4edda' : 
                                           type === 'warning' ? '#fff3cd' : '#d1ecf1';
      notification.style.color = type === 'error' ? '#721c24' : 
                                 type === 'success' ? '#155724' : 
                                 type === 'warning' ? '#856404' : '#0c5460';
      notification.style.padding = '12px 20px';
      notification.style.marginBottom = '10px';
      notification.style.borderRadius = '4px';
      notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
      notification.style.display = 'flex';
      notification.style.justifyContent = 'space-between';
      notification.style.alignItems = 'center';
      notification.style.minWidth = '250px';

      notification.innerHTML = `
        <span>${message}</span>
        <button style="background: none; border: none; cursor: pointer; font-size: 16px; opacity: 0.7;">&times;</button>
      `;

      // Add close handler
      notification.querySelector('button').addEventListener('click', () => {
        container.removeChild(notification);
      });

      // Add to container
      container.appendChild(notification);

      // Auto remove after 5 seconds
      setTimeout(() => {
        if (notification.parentNode === container) {
          container.removeChild(notification);
        }
      }, 5000);
    }

    (function() {
      // Intercept all fetch requests to add auth token
      const originalFetch = window.fetch;
      window.fetch = function(url, options = {}) {
        // Get token from storage
        const token = localStorage.getItem('access_token') || 
                      sessionStorage.getItem('access_token');
        
        if (token) {
          // Create headers if they don't exist
          options.headers = options.headers || {};
          
          // Add Authorization header with token
          if (options.headers instanceof Headers) {
            options.headers.append('Authorization', `Bearer ${token}`);
          } else {
            options.headers['Authorization'] = `Bearer ${token}`;
          }
        }
        
        // Include credentials in all requests
        options.credentials = 'include';
        
        // Call the original fetch with our modified options
        return originalFetch(url, options);
      };
    })();