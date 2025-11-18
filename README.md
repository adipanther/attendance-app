# Location-Based Attendance System

A web application for tracking employee attendance using geolocation. Features automatic attendance marking when users are within designated locations, with admin controls for location management and manual attendance corrections.

## Features

### User Features
- 🌍 **Automatic Location Detection** - GPS-based check-in/check-out
- 📍 **Geofencing** - Attendance only allowed within designated radius
- 📊 **Attendance History** - View personal attendance records
- ⏰ **Real-time Status** - Check distance from designated locations
- 📱 **Mobile Responsive** - Works on all devices

### Admin Features
- 🏢 **Location Management** - Create/edit locations with coordinates and radius
- 👥 **User Management** - Add/edit/deactivate users
- 📝 **Manual Attendance** - Correct/add attendance records with timestamps
- 📈 **Attendance Reports** - View and filter all attendance records
- 🔍 **Detailed Tracking** - See exact coordinates and timestamps

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Authentication**: JWT & Session-based
- **Geolocation**: Browser Geolocation API, Geolib
- **Frontend**: Vanilla JavaScript, HTML5, CSS3

## Prerequisites

Before running this application, you need:

1. **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
2. **MongoDB** - Choose one option:
   - **MongoDB Atlas** (Cloud - Recommended for beginners): [Sign up free](https://www.mongodb.com/cloud/atlas)
   - **Local MongoDB**: [Install locally](https://www.mongodb.com/try/download/community)

## Installation & Setup

### Step 1: Install Dependencies

Open PowerShell in the project directory and run:

```powershell
npm install
```

### Step 2: Configure Environment Variables

1. Copy the example environment file:
```powershell
Copy-Item .env.example .env
```

2. Edit the `.env` file with your settings:

```env
PORT=3000
NODE_ENV=development

# MongoDB Connection - CHOOSE ONE:

# Option A: MongoDB Atlas (Cloud - Recommended)
# 1. Go to https://www.mongodb.com/cloud/atlas
# 2. Create a free account and cluster
# 3. Click "Connect" -> "Connect your application"
# 4. Copy the connection string and replace <password> with your database password
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/attendance?retryWrites=true&w=majority

# Option B: Local MongoDB
# Make sure MongoDB is running on your machine
# MONGODB_URI=mongodb://localhost:27017/attendance

# JWT Secret - Generate a random string for production
JWT_SECRET=your_random_secret_key_here_change_in_production

# Session Secret - Generate another random string
SESSION_SECRET=your_session_secret_here_change_in_production

# Default Admin Credentials (created on first run)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
```

### Step 3: Set Up MongoDB

#### Option A: MongoDB Atlas (Cloud - Recommended)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account (M0 Sandbox - Free forever)
3. Create a new cluster (takes 3-5 minutes)
4. Click "Database Access" → Add a database user (username & password)
5. Click "Network Access" → Add IP Address → Allow access from anywhere (0.0.0.0/0)
6. Click "Clusters" → "Connect" → "Connect your application"
7. Copy the connection string and paste it in your `.env` file
8. Replace `<password>` with your database user password

#### Option B: Local MongoDB

1. Download and install [MongoDB Community Server](https://www.mongodb.com/try/download/community)
2. Start MongoDB service:
   - Windows: It should start automatically, or run `net start MongoDB`
   - Check if running: `mongo --version`
3. Use this connection string in `.env`:
   ```
   MONGODB_URI=mongodb://localhost:27017/attendance
   ```

### Step 4: Run the Application

Start the server:

```powershell
npm start
```

For development with auto-restart:

```powershell
npm run dev
```

You should see:
```
Server is running on http://localhost:3000
Connected to MongoDB
Default admin user created
Email: admin@example.com
Password: admin123
```

### Step 5: Access the Application

1. Open your browser and go to: `http://localhost:3000`
2. Login with default admin credentials:
   - **Email**: `admin@example.com`
   - **Password**: `admin123`

## Usage Guide

### For Administrators

1. **Login** as admin (default credentials above)
2. **Add Locations**:
   - Go to "Locations" tab
   - Click "Add Location"
   - Enter name, coordinates (or use "Get Current Location")
   - Set radius in meters (default: 100m)
   - Save
3. **Add Users**:
   - Go to "Users" tab
   - Click "Add User"
   - Fill in details (name, email, password, etc.)
   - Save
4. **Manage Attendance**:
   - View all attendance in "Attendance" tab
   - Filter by user, location, or date range
   - Edit or add manual entries with reasons
   - Delete incorrect records

### For Users

1. **Login** with your credentials
2. **Check In**:
   - Select a location from dropdown
   - Click "Get Location" to detect your position
   - System shows if you're within range
   - Click "Check In" when ready
3. **Check Out**:
   - Click "Check Out" when leaving
4. **View History**:
   - See all your attendance records
   - Filter by date range

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Users (Admin only)
- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Locations
- `GET /api/locations` - Get all locations
- `GET /api/locations/:id` - Get single location
- `POST /api/locations` - Create location (admin)
- `PUT /api/locations/:id` - Update location (admin)
- `DELETE /api/locations/:id` - Delete location (admin)

### Attendance
- `POST /api/attendance/checkin` - Check in
- `POST /api/attendance/checkout` - Check out
- `GET /api/attendance/my-attendance` - Get user's attendance
- `GET /api/attendance/today/status` - Check today's status
- `GET /api/attendance` - Get all attendance (admin)
- `POST /api/attendance/manual` - Manual entry (admin)
- `PUT /api/attendance/:id` - Update attendance (admin)
- `DELETE /api/attendance/:id` - Delete attendance (admin)

## Security Notes

⚠️ **Important for Production:**

1. Change default admin password immediately
2. Use strong, random strings for JWT_SECRET and SESSION_SECRET
3. Enable HTTPS in production
4. Restrict MongoDB network access to your server IP only
5. Set NODE_ENV=production in production environment
6. Use environment-specific `.env` files

## Troubleshooting

### Cannot connect to MongoDB
- **Atlas**: Check Network Access settings, whitelist your IP
- **Local**: Ensure MongoDB service is running
- Verify connection string in `.env` file

### Geolocation not working
- Browser must support Geolocation API (all modern browsers do)
- User must grant location permissions
- HTTPS required for geolocation in production (except localhost)

### Token/Login issues
- Clear browser localStorage and cookies
- Check if JWT_SECRET is set in `.env`
- Verify MongoDB connection is successful

### Port already in use
- Change PORT in `.env` file
- Or kill the process using port 3000:
  ```powershell
  netstat -ano | findstr :3000
  taskkill /PID <PID> /F
  ```

## Project Structure

```
Web APP Attendance/
├── models/
│   ├── User.js              # User schema
│   ├── Location.js          # Location schema
│   └── Attendance.js        # Attendance schema
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── users.js             # User management routes
│   ├── locations.js         # Location routes
│   └── attendance.js        # Attendance routes
├── middleware/
│   └── auth.js              # JWT verification middleware
├── public/
│   ├── css/
│   │   └── style.css        # Styles
│   ├── js/
│   │   ├── login.js         # Login page script
│   │   ├── admin.js         # Admin panel script
│   │   └── user.js          # User panel script
│   ├── login.html           # Login page
│   ├── admin.html           # Admin dashboard
│   └── user.html            # User dashboard
├── server.js                # Main server file
├── package.json             # Dependencies
├── .env                     # Environment variables (create from .env.example)
├── .env.example             # Environment template
└── README.md                # This file
```

## No External APIs Required

This application does **not** require any external APIs. All functionality is self-contained:

- ✅ Geolocation uses browser's built-in API (no API key needed)
- ✅ Authentication is handled internally with JWT
- ✅ All data stored in your MongoDB database
- ✅ Distance calculations done server-side

## Future Enhancements

- Email notifications for attendance
- Mobile app (React Native)
- QR code check-in as alternative
- Shift management
- Leave management
- Reports export (PDF, Excel)
- Multi-language support

## License

ISC

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Verify all prerequisites are installed
3. Ensure MongoDB connection is working
4. Check browser console for errors

---

**Ready to use!** Start the server and access `http://localhost:3000` to begin. 🚀
