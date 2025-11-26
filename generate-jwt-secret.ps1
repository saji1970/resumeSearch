# PowerShell script to generate a secure JWT_SECRET
# Run this script to generate a random 64-character string for JWT_SECRET

$chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
$random = New-Object System.Random
$secret = -join (1..64 | ForEach-Object { $chars[$random.Next($chars.Length)] })

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "Generated JWT_SECRET:" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host $secret -ForegroundColor Yellow
Write-Host ""
Write-Host "Copy this value and add it to Railway:" -ForegroundColor Cyan
Write-Host "1. Go to Railway Dashboard" -ForegroundColor White
Write-Host "2. Select your project" -ForegroundColor White
Write-Host "3. Click 'Variables' tab" -ForegroundColor White
Write-Host "4. Click 'New Variable'" -ForegroundColor White
Write-Host "5. Key: JWT_SECRET" -ForegroundColor White
Write-Host "6. Value: (paste the value above)" -ForegroundColor White
Write-Host "7. Click 'Add'" -ForegroundColor White
Write-Host ""
Write-Host "Railway will automatically redeploy after you add the variable." -ForegroundColor Cyan
Write-Host ""

