// Admin Polling Module - Auto-refreshes bookings every 8 seconds
(function() {
  let bookingsPollId = null;

  // Start polling bookings (called when admin is on booking-related pages)
  window.startBookingsPolling = function(intervalMs = 8000) {
    try {
      if (bookingsPollId) return; // already running
      bookingsPollId = setInterval(async function() {
        try {
          const roleKey = (window.userRole || window.role || '').toString().toLowerCase();
          if (roleKey.includes('admin')) {
            // Refresh both views
            if (typeof renderBookingsList === 'function') await renderBookingsList();
            if (typeof renderLaundryManagementBookings === 'function') await renderLaundryManagementBookings();
          }
        } catch (e) {
          console.error('bookings poll error', e);
        }
      }, intervalMs);
      console.debug('[Polling] startBookingsPolling @ ' + intervalMs + 'ms');
    } catch (e) {
      console.error('startBookingsPolling error', e);
    }
  };

  // Stop polling
  window.stopBookingsPolling = function() {
    if (bookingsPollId) {
      clearInterval(bookingsPollId);
      bookingsPollId = null;
      console.debug('[Polling] stopBookingsPolling');
    }
  };

  // Hook into nav() to control polling
  if (window.nav && typeof window.nav === 'function') {
    const originalNav = window.nav;
    window.nav = async function(page) {
      // Call original nav
      await originalNav(page);
      
      // Control polling based on page/role
      try {
        const roleKey = (window.userRole || window.role || '').toString().toLowerCase();
        if (roleKey === 'admin' && (page === 'admin-dashboard' || page === 'bookings' || page === 'laundry-management')) {
          window.startBookingsPolling();
        } else {
          window.stopBookingsPolling();
        }
      } catch (e) {
        // ignore nav hook errors
      }
    };
  }

  console.debug('[Polling] Admin polling module loaded');
})();
