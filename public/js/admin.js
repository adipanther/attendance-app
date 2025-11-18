// Check authentication
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token || user.role !== 'admin') {
    window.location.href = '/';
}

document.getElementById('adminName').textContent = user.name;

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

// Tab management
function showTab(tabName) {
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabName + 'Tab').classList.add('active');
    event.target.classList.add('active');
    
    if (tabName === 'locations') {
        loadLocations();
    } else if (tabName === 'users') {
        loadUsers();
    } else if (tabName === 'attendance') {
        loadAttendance();
        populateFilters();
    }
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

// Locations Management
async function loadLocations() {
    try {
        const data = await apiCall('/api/locations');
        displayLocations(data.locations);
    } catch (error) {
        console.error('Error loading locations:', error);
        alert('Error loading locations: ' + error.message);
    }
}

function displayLocations(locations) {
    const container = document.getElementById('locationsList');
    
    if (locations.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>No locations found</h3><p>Add a location to get started</p></div>';
        return;
    }
    
    const table = `
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Coordinates</th>
                    <th>Radius</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${locations.map(loc => `
                    <tr>
                        <td>${loc.name}</td>
                        <td>${loc.description || '-'}</td>
                        <td>${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}</td>
                        <td>${loc.radius}m</td>
                        <td><span class="badge ${loc.isActive ? 'badge-success' : 'badge-danger'}">${loc.isActive ? 'Active' : 'Inactive'}</span></td>
                        <td class="table-actions">
                            <button onclick="editLocation('${loc._id}')" class="btn btn-secondary btn-small">Edit</button>
                            <button onclick="deleteLocation('${loc._id}')" class="btn btn-danger btn-small">Delete</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = table;
}

function showLocationModal(locationId = null) {
    const modal = document.getElementById('locationModal');
    modal.classList.add('show');
    
    if (locationId) {
        document.getElementById('locationModalTitle').textContent = 'Edit Location';
        loadLocationForEdit(locationId);
    } else {
        document.getElementById('locationModalTitle').textContent = 'Add Location';
        document.getElementById('locationForm').reset();
        document.getElementById('locationId').value = '';
    }
}

function closeLocationModal() {
    document.getElementById('locationModal').classList.remove('show');
}

async function loadLocationForEdit(locationId) {
    try {
        const data = await apiCall(`/api/locations/${locationId}`);
        const loc = data.location;
        
        document.getElementById('locationId').value = loc._id;
        document.getElementById('locationName').value = loc.name;
        document.getElementById('locationDescription').value = loc.description || '';
        document.getElementById('locationLatitude').value = loc.latitude;
        document.getElementById('locationLongitude').value = loc.longitude;
        document.getElementById('locationRadius').value = loc.radius;
    } catch (error) {
        alert('Error loading location: ' + error.message);
    }
}

function editLocation(locationId) {
    showLocationModal(locationId);
}

async function deleteLocation(locationId) {
    if (!confirm('Are you sure you want to delete this location?')) {
        return;
    }
    
    try {
        await apiCall(`/api/locations/${locationId}`, 'DELETE');
        alert('Location deleted successfully');
        loadLocations();
    } catch (error) {
        alert('Error deleting location: ' + error.message);
    }
}

function getCurrentLocation() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            document.getElementById('locationLatitude').value = position.coords.latitude;
            document.getElementById('locationLongitude').value = position.coords.longitude;
        },
        (error) => {
            alert('Error getting location: ' + error.message);
        }
    );
}

document.getElementById('locationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const locationId = document.getElementById('locationId').value;
    const locationData = {
        name: document.getElementById('locationName').value,
        description: document.getElementById('locationDescription').value,
        latitude: parseFloat(document.getElementById('locationLatitude').value),
        longitude: parseFloat(document.getElementById('locationLongitude').value),
        radius: parseInt(document.getElementById('locationRadius').value)
    };
    
    try {
        if (locationId) {
            await apiCall(`/api/locations/${locationId}`, 'PUT', locationData);
            alert('Location updated successfully');
        } else {
            await apiCall('/api/locations', 'POST', locationData);
            alert('Location created successfully');
        }
        
        closeLocationModal();
        loadLocations();
    } catch (error) {
        alert('Error saving location: ' + error.message);
    }
});

// Users Management
async function loadUsers() {
    try {
        const data = await apiCall('/api/users');
        displayUsers(data.users);
    } catch (error) {
        console.error('Error loading users:', error);
        alert('Error loading users: ' + error.message);
    }
}

function displayUsers(users) {
    const container = document.getElementById('usersList');
    
    if (users.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>No users found</h3></div>';
        return;
    }
    
    const table = `
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Employee ID</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(u => `
                    <tr>
                        <td>${u.name}</td>
                        <td>${u.email}</td>
                        <td>${u.employeeId || '-'}</td>
                        <td>${u.department || '-'}</td>
                        <td><span class="badge ${u.role === 'admin' ? 'badge-warning' : 'badge-info'}">${u.role}</span></td>
                        <td><span class="badge ${u.isActive ? 'badge-success' : 'badge-danger'}">${u.isActive ? 'Active' : 'Inactive'}</span></td>
                        <td class="table-actions">
                            <button onclick="editUser('${u._id}')" class="btn btn-secondary btn-small">Edit</button>
                            <button onclick="deleteUser('${u._id}')" class="btn btn-danger btn-small">Delete</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = table;
}

function showUserModal(userId = null) {
    const modal = document.getElementById('userModal');
    modal.classList.add('show');
    
    if (userId) {
        document.getElementById('userModalTitle').textContent = 'Edit User';
        document.getElementById('passwordGroup').style.display = 'none';
        document.getElementById('userPassword').removeAttribute('required');
        loadUserForEdit(userId);
    } else {
        document.getElementById('userModalTitle').textContent = 'Add User';
        document.getElementById('passwordGroup').style.display = 'block';
        document.getElementById('userPassword').setAttribute('required', 'required');
        document.getElementById('userForm').reset();
        document.getElementById('userId').value = '';
    }
}

function closeUserModal() {
    document.getElementById('userModal').classList.remove('show');
}

async function loadUserForEdit(userId) {
    try {
        const data = await apiCall('/api/users');
        const u = data.users.find(user => user._id === userId);
        
        document.getElementById('userId').value = u._id;
        document.getElementById('userName').value = u.name;
        document.getElementById('userEmail').value = u.email;
        document.getElementById('userEmployeeId').value = u.employeeId || '';
        document.getElementById('userDepartment').value = u.department || '';
        document.getElementById('userRole').value = u.role;
    } catch (error) {
        alert('Error loading user: ' + error.message);
    }
}

function editUser(userId) {
    showUserModal(userId);
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) {
        return;
    }
    
    try {
        await apiCall(`/api/users/${userId}`, 'DELETE');
        alert('User deleted successfully');
        loadUsers();
    } catch (error) {
        alert('Error deleting user: ' + error.message);
    }
}

document.getElementById('userForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const userId = document.getElementById('userId').value;
    const userData = {
        name: document.getElementById('userName').value,
        email: document.getElementById('userEmail').value,
        employeeId: document.getElementById('userEmployeeId').value,
        department: document.getElementById('userDepartment').value,
        role: document.getElementById('userRole').value
    };
    
    if (!userId) {
        userData.password = document.getElementById('userPassword').value;
    }
    
    try {
        if (userId) {
            await apiCall(`/api/users/${userId}`, 'PUT', userData);
            alert('User updated successfully');
        } else {
            await apiCall('/api/users', 'POST', userData);
            alert('User created successfully');
        }
        
        closeUserModal();
        loadUsers();
    } catch (error) {
        alert('Error saving user: ' + error.message);
    }
});

// Attendance Management
let allUsers = [];
let allLocations = [];

async function populateFilters() {
    try {
        const [usersData, locationsData] = await Promise.all([
            apiCall('/api/users'),
            apiCall('/api/locations')
        ]);
        
        allUsers = usersData.users;
        allLocations = locationsData.locations;
        
        // Populate filter dropdowns
        const filterUser = document.getElementById('filterUser');
        const filterLocation = document.getElementById('filterLocation');
        const attendanceUser = document.getElementById('attendanceUser');
        const attendanceLocation = document.getElementById('attendanceLocation');
        
        filterUser.innerHTML = '<option value="">All Users</option>' +
            allUsers.map(u => `<option value="${u._id}">${u.name} (${u.email})</option>`).join('');
        
        filterLocation.innerHTML = '<option value="">All Locations</option>' +
            allLocations.map(l => `<option value="${l._id}">${l.name}</option>`).join('');
        
        attendanceUser.innerHTML = '<option value="">Select User</option>' +
            allUsers.filter(u => u.isActive).map(u => `<option value="${u._id}">${u.name} (${u.email})</option>`).join('');
        
        attendanceLocation.innerHTML = '<option value="">Select Location</option>' +
            allLocations.filter(l => l.isActive).map(l => `<option value="${l._id}">${l.name}</option>`).join('');
    } catch (error) {
        console.error('Error populating filters:', error);
    }
}

async function loadAttendance() {
    try {
        const params = new URLSearchParams({
            page: 1,
            limit: 100
        });
        
        const data = await apiCall(`/api/attendance?${params}`);
        displayAttendance(data.attendance);
    } catch (error) {
        console.error('Error loading attendance:', error);
        alert('Error loading attendance: ' + error.message);
    }
}

async function filterAttendance() {
    try {
        const params = new URLSearchParams({
            page: 1,
            limit: 100
        });
        
        const userId = document.getElementById('filterUser').value;
        const locationId = document.getElementById('filterLocation').value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        if (userId) params.append('userId', userId);
        if (locationId) params.append('locationId', locationId);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        const data = await apiCall(`/api/attendance?${params}`);
        displayAttendance(data.attendance);
    } catch (error) {
        alert('Error filtering attendance: ' + error.message);
    }
}

function clearFilters() {
    document.getElementById('filterUser').value = '';
    document.getElementById('filterLocation').value = '';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    loadAttendance();
}

function displayAttendance(attendance) {
    const container = document.getElementById('attendanceList');
    
    if (attendance.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>No attendance records found</h3></div>';
        return;
    }
    
    const table = `
        <table>
            <thead>
                <tr>
                    <th>User</th>
                    <th>Location</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Status</th>
                    <th>Manual</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${attendance.map(a => `
                    <tr>
                        <td>${a.user.name}</td>
                        <td>${a.location.name}</td>
                        <td>${new Date(a.checkInTime).toLocaleString()}</td>
                        <td>${a.checkOutTime ? new Date(a.checkOutTime).toLocaleString() : '-'}</td>
                        <td><span class="badge badge-${getStatusBadge(a.status)}">${a.status}</span></td>
                        <td>${a.isManualEntry ? '✓' : '-'}</td>
                        <td class="table-actions">
                            <button onclick="editAttendance('${a._id}')" class="btn btn-secondary btn-small">Edit</button>
                            <button onclick="deleteAttendance('${a._id}')" class="btn btn-danger btn-small">Delete</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = table;
}

function getStatusBadge(status) {
    const badges = {
        'present': 'success',
        'absent': 'danger',
        'late': 'warning',
        'half-day': 'info'
    };
    return badges[status] || 'info';
}

function showAttendanceModal(attendanceId = null) {
    const modal = document.getElementById('attendanceModal');
    modal.classList.add('show');
    
    if (attendanceId) {
        document.getElementById('attendanceModalTitle').textContent = 'Edit Attendance';
        loadAttendanceForEdit(attendanceId);
    } else {
        document.getElementById('attendanceModalTitle').textContent = 'Add Manual Attendance';
        document.getElementById('attendanceForm').reset();
        document.getElementById('attendanceId').value = '';
    }
}

function closeAttendanceModal() {
    document.getElementById('attendanceModal').classList.remove('show');
}

async function loadAttendanceForEdit(attendanceId) {
    try {
        const data = await apiCall('/api/attendance');
        const a = data.attendance.find(att => att._id === attendanceId);
        
        document.getElementById('attendanceId').value = a._id;
        document.getElementById('attendanceUser').value = a.user._id;
        document.getElementById('attendanceLocation').value = a.location._id;
        document.getElementById('attendanceCheckIn').value = formatDateTimeLocal(a.checkInTime);
        if (a.checkOutTime) {
            document.getElementById('attendanceCheckOut').value = formatDateTimeLocal(a.checkOutTime);
        }
        document.getElementById('attendanceLatitude').value = a.checkInLatitude;
        document.getElementById('attendanceLongitude').value = a.checkInLongitude;
        document.getElementById('attendanceStatus').value = a.status;
        document.getElementById('attendanceNotes').value = a.notes || '';
    } catch (error) {
        alert('Error loading attendance: ' + error.message);
    }
}

function editAttendance(attendanceId) {
    showAttendanceModal(attendanceId);
}

async function deleteAttendance(attendanceId) {
    if (!confirm('Are you sure you want to delete this attendance record?')) {
        return;
    }
    
    try {
        await apiCall(`/api/attendance/${attendanceId}`, 'DELETE');
        alert('Attendance deleted successfully');
        loadAttendance();
    } catch (error) {
        alert('Error deleting attendance: ' + error.message);
    }
}

function formatDateTimeLocal(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

document.getElementById('attendanceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const attendanceId = document.getElementById('attendanceId').value;
    const attendanceData = {
        userId: document.getElementById('attendanceUser').value,
        locationId: document.getElementById('attendanceLocation').value,
        checkInTime: document.getElementById('attendanceCheckIn').value,
        checkOutTime: document.getElementById('attendanceCheckOut').value || null,
        latitude: parseFloat(document.getElementById('attendanceLatitude').value),
        longitude: parseFloat(document.getElementById('attendanceLongitude').value),
        status: document.getElementById('attendanceStatus').value,
        notes: document.getElementById('attendanceNotes').value,
        reason: document.getElementById('attendanceReason').value
    };
    
    try {
        if (attendanceId) {
            await apiCall(`/api/attendance/${attendanceId}`, 'PUT', attendanceData);
            alert('Attendance updated successfully');
        } else {
            await apiCall('/api/attendance/manual', 'POST', attendanceData);
            alert('Attendance created successfully');
        }
        
        closeAttendanceModal();
        loadAttendance();
    } catch (error) {
        alert('Error saving attendance: ' + error.message);
    }
});

// Initialize
loadLocations();
