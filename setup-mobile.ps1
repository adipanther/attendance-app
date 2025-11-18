# Automated Cordova Setup Script for Android APK

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Attendance App - Android APK Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if Cordova is installed
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
$cordovaInstalled = Get-Command cordova -ErrorAction SilentlyContinue

if (-not $cordovaInstalled) {
    Write-Host "Installing Cordova globally..." -ForegroundColor Yellow
    npm install -g cordova
}

# Get backend URL
Write-Host ""
Write-Host "Enter your backend URL:" -ForegroundColor Green
Write-Host "Examples:" -ForegroundColor Gray
Write-Host "  - For local testing on same WiFi: http://192.168.1.100:3000" -ForegroundColor Gray
Write-Host "  - For deployed server: https://your-app.railway.app" -ForegroundColor Gray
$backendUrl = Read-Host "Backend URL"

if ([string]::IsNullOrWhiteSpace($backendUrl)) {
    # Get local IP for default
    $localIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -like '*Wi-Fi*' -or $_.InterfaceAlias -like '*Ethernet*'} | Select-Object -First 1).IPAddress
    $backendUrl = "http://${localIp}:3000"
    Write-Host "Using default: $backendUrl" -ForegroundColor Yellow
}

# Create mobile directory
$mobileDir = "attendance-mobile"
Write-Host ""
Write-Host "Creating Cordova project in $mobileDir..." -ForegroundColor Yellow

if (Test-Path $mobileDir) {
    Write-Host "Directory already exists. Removing..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $mobileDir
}

# Create Cordova project
cordova create $mobileDir com.attendance.app "Attendance App"
Set-Location $mobileDir

# Add Android platform
Write-Host "Adding Android platform..." -ForegroundColor Yellow
cordova platform add android

# Add plugins
Write-Host "Installing Cordova plugins..." -ForegroundColor Yellow
cordova plugin add cordova-plugin-geolocation
cordova plugin add cordova-plugin-network-information
cordova plugin add cordova-plugin-statusbar
cordova plugin add cordova-plugin-splashscreen
cordova plugin add cordova-plugin-whitelist

# Copy and modify web files
Write-Host "Copying web application files..." -ForegroundColor Yellow

# Copy HTML files
Copy-Item ..\public\login.html www\login.html
Copy-Item ..\public\admin.html www\admin.html
Copy-Item ..\public\user.html www\user.html

# Copy CSS
New-Item -ItemType Directory -Force -Path www\css | Out-Null
Copy-Item ..\public\css\style.css www\css\style.css

# Copy and modify JS files
New-Item -ItemType Directory -Force -Path www\js | Out-Null

# Update API endpoints in JS files
$loginJs = Get-Content ..\public\js\login.js -Raw
$loginJs = $loginJs -replace "'/api/", "'$backendUrl/api/"
$loginJs | Set-Content www\js\login.js

$adminJs = Get-Content ..\public\js\admin.js -Raw
$adminJs = $adminJs -replace "'/api/", "'$backendUrl/api/"
$adminJs | Set-Content www\js\admin.js

$userJs = Get-Content ..\public\js\user.js -Raw
$userJs = $userJs -replace "'/api/", "'$backendUrl/api/"
$userJs | Set-Content www\js\user.js

# Update index.html to redirect to login
@"
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval' data: gap: content:">
    <title>Attendance App</title>
    <script>
        window.location.href = 'login.html';
    </script>
</head>
<body>
    <p>Loading...</p>
    <script src="cordova.js"></script>
</body>
</html>
"@ | Set-Content www\index.html

# Update config.xml
Write-Host "Configuring app settings..." -ForegroundColor Yellow
$configXml = @"
<?xml version='1.0' encoding='utf-8'?>
<widget id="com.attendance.app" version="1.0.0" xmlns="http://www.w3.org/ns/widgets" xmlns:cdv="http://cordova.apache.org/ns/1.0">
    <name>Attendance App</name>
    <description>Location-based attendance tracking system</description>
    <author email="dev@attendance.com" href="https://attendance.com">Attendance Team</author>
    <content src="index.html" />
    <access origin="*" />
    <allow-intent href="http://*/*" />
    <allow-intent href="https://*/*" />
    <allow-navigation href="*" />
    <preference name="DisallowOverscroll" value="true" />
    <preference name="android-minSdkVersion" value="22" />
    <preference name="android-targetSdkVersion" value="33" />
    <preference name="Orientation" value="portrait" />
    <platform name="android">
        <allow-intent href="market:*" />
        <icon density="ldpi" src="www/res/icon/android/ldpi.png" />
        <icon density="mdpi" src="www/res/icon/android/mdpi.png" />
        <icon density="hdpi" src="www/res/icon/android/hdpi.png" />
        <icon density="xhdpi" src="www/res/icon/android/xhdpi.png" />
        <icon density="xxhdpi" src="www/res/icon/android/xxhdpi.png" />
        <icon density="xxxhdpi" src="www/res/icon/android/xxxhdpi.png" />
    </platform>
</widget>
"@
$configXml | Set-Content config.xml

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Make sure your backend server is running" -ForegroundColor White
Write-Host "   Backend URL: $backendUrl" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Build the APK:" -ForegroundColor White
Write-Host "   cd $mobileDir" -ForegroundColor Gray
Write-Host "   cordova build android" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Find your APK at:" -ForegroundColor White
Write-Host "   platforms\android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Or run on connected device:" -ForegroundColor White
Write-Host "   cordova run android" -ForegroundColor Gray
Write-Host ""
Write-Host "Note: You need Android SDK installed for building." -ForegroundColor Yellow
Write-Host "Install from: https://developer.android.com/studio" -ForegroundColor Cyan
