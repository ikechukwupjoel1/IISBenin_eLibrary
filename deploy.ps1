# Deploy Edge Functions to Supabase
Write-Host "Deploying Edge Functions to Supabase..." -ForegroundColor Cyan
Write-Host ""

# Check function files
$functions = @("change-password", "verify-login")

Write-Host "Checking function files..." -ForegroundColor Yellow
foreach ($func in $functions) {
    $funcPath = "supabase\functions\$func\index.ts"
    if (Test-Path $funcPath) {
        Write-Host "  OK: $func" -ForegroundColor Green
    } else {
        Write-Host "  ERROR: $func not found" -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# Try to deploy with npx
Write-Host "Deploying functions..." -ForegroundColor Cyan
Write-Host ""

# First, check login status
Write-Host "Step 1: Checking Supabase CLI login..." -ForegroundColor Yellow
npx supabase@latest projects list 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "You need to login first. Run these commands:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  npx supabase@latest login" -ForegroundColor White
    Write-Host "  npx supabase@latest link --project-ref myxwxakwlfjoovvlkkul" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "  Logged in successfully!" -ForegroundColor Green
Write-Host ""

# Deploy functions
Write-Host "Step 2: Deploying functions..." -ForegroundColor Yellow

foreach ($func in $functions) {
    Write-Host ""
    Write-Host "Deploying $func..." -ForegroundColor Cyan
    npx supabase@latest functions deploy $func --no-verify-jwt
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  SUCCESS: $func deployed!" -ForegroundColor Green
    } else {
        Write-Host "  FAILED: $func deployment failed" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Test your app at:" -ForegroundColor Cyan
Write-Host "https://iisbeninelibrary-oihl2gavn-joel-prince-a-ikechukwus-projects.vercel.app"
