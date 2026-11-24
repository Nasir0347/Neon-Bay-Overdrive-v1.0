$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$env:JAVA_HOME = (Get-ChildItem '.toolchain\java' -Directory | Select-Object -First 1).FullName
$env:ANDROID_HOME = Join-Path $PSScriptRoot '.toolchain\sdk'
$env:ANDROID_USER_HOME = Join-Path $PSScriptRoot '.toolchain\android-user'
$env:GRADLE_USER_HOME = Join-Path $PSScriptRoot '.toolchain\gradle'
if (-not (Test-Path "$env:JAVA_HOME\bin\java.exe")) { throw 'Project Java toolchain is missing.' }
if (-not (Test-Path "$env:ANDROID_HOME\platforms\android-36\android.jar")) { throw 'Android SDK API 36 is missing.' }
node scripts/build-web.cjs
if ($LASTEXITCODE -ne 0) { throw 'Web bundle failed.' }
if (Test-Path 'android\app\src\main\assets\public') {
  $publicTarget = (Resolve-Path -LiteralPath 'android\app\src\main\assets\public').Path
  $expectedPublic = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'android\app\src\main\assets\public'))
  if ($publicTarget -ne $expectedPublic) { throw 'Unsafe Android assets path.' }
  Remove-Item -LiteralPath $publicTarget -Recurse -Force
}
& '.\node_modules\.bin\cap.cmd' sync android
if ($LASTEXITCODE -ne 0) { throw 'Android sync failed.' }
('sdk.dir=' + $env:ANDROID_HOME.Replace('\','/')) | Set-Content -Encoding ascii 'android\local.properties'
& '.\android\gradlew.bat' -p android :app:assembleDebug --no-daemon --console=plain
if ($LASTEXITCODE -ne 0) { throw 'Android compilation failed.' }
New-Item -ItemType Directory -Force releases | Out-Null
Copy-Item -LiteralPath 'android\app\build\outputs\apk\debug\app-debug.apk' -Destination 'releases\Neon-Bay-Overdrive-v1.0.apk' -Force
Write-Output 'APK ready: releases\Neon-Bay-Overdrive-v1.0.apk'
