# Deploy Edge Functions to Supabase
# This script uses npx to run Supabase CLI without global installation

Write-Host "🚀 Deploying Edge Functions to Supabase..." -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "supabase\functions")) {
    Write-Host "❌ Error: supabase/functions directory not found!" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory." -ForegroundColor Yellow
    exit 1
}

# Function files to deploy
$functions = @("change-password", "verify-login")

Write-Host "📦 Checking function files..." -ForegroundColor Yellow
foreach ($func in $functions) {
    $funcPath = "supabase\functions\$func\index.ts"
    if (Test-Path $funcPath) {
        Write-Host "  ✅ $func - Found" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $func - Not found at $funcPath" -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# Deploy using npx (no global installation needed)
Write-Host "🔧 Deploying functions..." -ForegroundColor Cyan
Write-Host "This will use npx supabase (no global installation required)" -ForegroundColor Gray
Write-Host ""

# Check if user is logged in
Write-Host "Checking Supabase login status..." -ForegroundColor Yellow
$loginCheck = npx supabase@latest projects list 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not logged in to Supabase CLI" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please login first:" -ForegroundColor Yellow
    Write-Host "  npx supabase@latest login" -ForegroundColor White
    Write-Host ""
    Write-Host "Then link your project:" -ForegroundColor Yellow
    Write-Host "  npx supabase@latest link --project-ref myxwxakwlfjoovvlkkul" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ Logged in to Supabase" -ForegroundColor Green
Write-Host ""

# Deploy each function
foreach ($func in $functions) {
    Write-Host "📤 Deploying $func..." -ForegroundColor Cyan
    npx supabase@latest functions deploy $func --no-verify-jwt
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ $func deployed successfully!" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Failed to deploy $func" -ForegroundColor Red
        Write-Host "  Please check the error message above." -ForegroundColor Yellow
    }
    Write-Host ""
}

Write-Host "🎉 Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Test the password change feature in your app" -ForegroundColor White
Write-Host "2. Login as staff/student and go to 'Change Password' tab" -ForegroundColor White
Write-Host "3. Try changing your password" -ForegroundColor White
Write-Host ""
Write-Host "Your app URL: https://iisbeninelibrary-oihl2gavn-joel-prince-a-ikechukwus-projects.vercel.app" -ForegroundColor Cyan
