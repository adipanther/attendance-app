// Check authentication
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token) {
    window.location.href = '/';
}

document.getElementById('userName').textContent = user.name;

let currentLocation = null;
let selectedLocation = null;
let currentAttendance = null;

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

// API helper
async function apiCall(url, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'API request failed');
    }
    
    return data;
}

// Show message
function showMessage(message, type = 'info') {
    const statusDiv = document.getElementById('attendanceStatus');
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
}

// Get current user location
function getCurrentUserLocation() {
    if (!navigator.geolocation) {
        showMessage('Geolocation is not supported by your browser', 'error');
        return;
    }
    
    showMessage('Getting your location...', 'info');
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            currentLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };
            
            const locationDiv = document.getElementById('currentLocation');
            locationDiv.innerHTML = `
                <p><strong>Latitude:</strong> ${currentLocation.latitude.toFixed(6)}</p>
                <p><strong>Longitude:</strong> ${currentLocation.longitude.toFixed(6)}</p>
                <p><strong>Accuracy:</strong> ${position.coords.accuracy.toFixed(2)} meters</p>
            `;
            
            showMessage('Location detected successfully', 'success');
            checkLocationProximity();
        },
        (error) => {
            showMessage('Error getting location: ' + error.message, 'error');
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// Load locations
async function loadLocations() {
    try {
        const data = await apiCall('http://10.160.65.43:3000/api/locations');
        const select = document.getElementById('locationSelect');
        
        if (data.locations.length === 0) {
            select.innerHTML = '<option value="">No locations available</option>';
            return;
        }
        
        select.innerHTML = '<option value="">Select a location</option>' +
            data.locations.map(loc => 
                `<option value="${loc._id}" data-lat="${loc.latitude}" data-lng="${loc.longitude}" data-radius="${loc.radius}">
                    ${loc.name}
                </option>`
            ).join('');
        
        select.addEventListener('change', (e) => {
            const option = e.target.selectedOptions[0];
            if (option.value) {
                selectedLocation = {
                    id: option.value,
                    name: option.textContent,
                    latitude: parseFloat(option.dataset.lat),
                    longitude: parseFloat(option.dataset.lng),
                    radius: parseInt(option.dataset.radius)
                };
                displayLocationInfo();
                checkLocationProximity();
            } else {
                selectedLocation = null;
                document.getElementById('locationInfo').innerHTML = '';
            }
        });
    } catch (error) {
        console.error('Error loading locations:', error);
        showMessage('Error loading locations: ' + error.message, 'error');
    }
}

// Display location info
function displayLocationInfo() {
    if (!selectedLocation) return;
    
    const infoDiv = document.getElementById('locationInfo');
    infoDiv.innerHTML = `
        <p><strong>Location:</strong> ${selectedLocation.name}</p>
        <p><strong>Coordinates:</strong> ${selectedLocation.latitude.toFixed(6)}, ${selectedLocation.longitude.toFixed(6)}</p>
        <p><strong>Required Radius:</strong> ${selectedLocation.radius} meters</p>
    `;
}

// Calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c; // Distance in meters
}

// Check if user is within location proximity
function checkLocationProximity() {
    if (!currentLocation || !selectedLocation) return;
    
    const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        selectedLocation.latitude,
        selectedLocation.longitude
    );
    
    const infoDiv = document.getElementById('locationInfo');
    const distanceInfo = `<p><strong>Your Distance:</strong> ${distance.toFixed(2)} meters</p>`;
    
    if (distance <= selectedLocation.radius) {
        infoDiv.innerHTML += distanceInfo + '<p style="color: green;">✓ You are within the required range</p>';
    } else {
        infoDiv.innerHTML += distanceInfo + '<p style="color: red;">✗ You are too far from the location</p>';
    }
}

// Check today's attendance status
async function checkTodayStatus() {
    try {
        const data = await apiCall('http://10.160.65.43:3000/api/attendance/today/status');
        
        if (data.hasCheckedIn) {
            currentAttendance = data.attendance;
            document.getElementById('checkInSection').style.display = 'none';
            document.getElementById('checkOutSection').style.display = 'block';
            document.getElementById('checkedInTime').textContent = new Date(data.attendance.checkInTime).toLocaleString();
            document.getElementById('checkedInLocation').textContent = data.attendance.location.name;
            showMessage('You have already checked in today', 'info');
        } else {
            document.getElementById('checkInSection').style.display = 'block';
            document.getElementById('checkOutSection').style.display = 'none';
        }
    } catch (error) {
        console.error('Error checking status:', error);
    }
}

// Check in
async function checkIn() {
    if (!selectedLocation) {
        showMessage('Please select a location', 'error');
        return;
    }
    
    // Get current location
    if (!navigator.geolocation) {
        showMessage('Geolocation is not supported', 'error');
        return;
    }
    
    showMessage('Getting your location...', 'info');
    const checkInBtn = document.getElementById('checkInBtn');
    checkInBtn.disabled = true;
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            try {
                const data = await apiCall('http://10.160.65.43:3000/api/attendance/checkin', 'POST', {
                    locationId: selectedLocation.id,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
                
                showMessage('Check-in successful!', 'success');
                currentAttendance = data.attendance;
                
                // Switch to check-out view
                document.getElementById('checkInSection').style.display = 'none';
                document.getElementById('checkOutSection').style.display = 'block';
                document.getElementById('checkedInTime').textContent = new Date(data.attendance.checkInTime).toLocaleString();
                document.getElementById('checkedInLocation').textContent = data.attendance.location.name;
                
                loadAttendanceHistory();
            } catch (error) {
                showMessage('Check-in failed: ' + error.message, 'error');
            } finally {
                checkInBtn.disabled = false;
            }
        },
        (error) => {
            showMessage('Error getting location: ' + error.message, 'error');
            checkInBtn.disabled = false;
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// Check out
async function checkOut() {
    if (!navigator.geolocation) {
        showMessage('Geolocation is not supported', 'error');
        return;
    }
    
    showMessage('Getting your location...', 'info');
    const checkOutBtn = document.getElementById('checkOutBtn');
    checkOutBtn.disabled = true;
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            try {
                const data = await apiCall('http://10.160.65.43:3000/api/attendance/checkout', 'POST', {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
                
                showMessage('Check-out successful!', 'success');
                
                // Switch back to check-in view
                setTimeout(() => {
                    document.getElementById('checkInSection').style.display = 'block';
                    document.getElementById('checkOutSection').style.display = 'none';
                    showMessage('', '');
                    loadAttendanceHistory();
                }, 2000);
            } catch (error) {
                showMessage('Check-out failed: ' + error.message, 'error');
            } finally {
                checkOutBtn.disabled = false;
            }
        },
        (error) => {
            showMessage('Error getting location: ' + error.message, 'error');
            checkOutBtn.disabled = false;
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// Load attendance history
async function loadAttendanceHistory() {
    try {
        const params = new URLSearchParams({ page: 1, limit: 50 });
        
        const startDate = document.getElementById('historyStartDate').value;
        const endDate = document.getElementById('historyEndDate').value;
        
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        const data = await apiCall(`/api/attendance/my-attendance?${params}`);
        displayAttendanceHistory(data.attendance);
    } catch (error) {
        console.error('Error loading history:', error);
        document.getElementById('attendanceHistory').innerHTML = 
            `<div class="error-message show">Error loading history: ${error.message}</div>`;
    }
}

// Display attendance history
function displayAttendanceHistory(attendance) {
    const container = document.getElementById('attendanceHistory');
    
    if (attendance.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>No attendance records found</h3></div>';
        return;
    }
    
    const table = `
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Location</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Duration</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${attendance.map(a => {
                    const checkIn = new Date(a.checkInTime);
                    const checkOut = a.checkOutTime ? new Date(a.checkOutTime) : null;
                    const duration = checkOut ? calculateDuration(checkIn, checkOut) : '-';
                    
                    return `
                        <tr>
                            <td>${checkIn.toLocaleDateString()}</td>
                            <td>${a.location.name}</td>
                            <td>${checkIn.toLocaleTimeString()}</td>
                            <td>${checkOut ? checkOut.toLocaleTimeString() : '-'}</td>
                            <td>${duration}</td>
                            <td><span class="badge badge-${getStatusBadge(a.status)}">${a.status}</span></td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = table;
}

// Calculate duration
function calculateDuration(start, end) {
    const diff = end - start;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
}

// Get status badge class
function getStatusBadge(status) {
    const badges = {
        'present': 'success',
        'absent': 'danger',
        'late': 'warning',
        'half-day': 'info'
    };
    return badges[status] || 'info';
}

// Initialize
loadLocations();
checkTodayStatus();
loadAttendanceHistory();

// Auto-detect location on page load
setTimeout(() => {
    getCurrentUserLocation();
}, 1000);

