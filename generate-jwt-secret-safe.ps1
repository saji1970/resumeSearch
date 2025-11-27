# PowerShell script to generate a safe JWT_SECRET (alphanumeric + base64 safe chars only)
# This avoids special characters that might cause issues with Railway

$chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
$random = New-Object System.Random
$secret = -join (1..64 | ForEach-Object { $chars[$random.Next($chars.Length)] })

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "Generated Safe JWT_SECRET (64 characters):" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host $secret -ForegroundColor Yellow
Write-Host ""
Write-Host "This value uses only letters and numbers (no special characters)" -ForegroundColor Cyan
Write-Host ""
Write-Host "To add to Railway:" -ForegroundColor Cyan
Write-Host "1. Go to Railway Dashboard → Your Project → Variables" -ForegroundColor White
Write-Host "2. Click 'New Variable'" -ForegroundColor White
Write-Host "3. Key: JWT_SECRET" -ForegroundColor White
Write-Host "4. Value: (copy the value above - no quotes needed)" -ForegroundColor White
Write-Host "5. Click 'Add'" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANT: Copy ONLY the value, no quotes or extra spaces!" -ForegroundColor Yellow
Write-Host ""




