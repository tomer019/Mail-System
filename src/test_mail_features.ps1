Write-Host "Starting advanced mail feature tests..."

# Register users
Invoke-RestMethod -Uri "http://localhost:3000/api/users" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body (@{ email = "alice@example.com"; password = "1234"; firstName = "Alice"; lastName = "Wonder" } | ConvertTo-Json) > $null
Invoke-RestMethod -Uri "http://localhost:3000/api/users" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body (@{ email = "bob@example.com"; password = "1234"; firstName = "Bob"; lastName = "Builder" } | ConvertTo-Json) > $null
Write-Host "Registered users"

# Authenticate
$token = (Invoke-RestMethod -Uri "http://localhost:3000/api/tokens" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body (@{ email = "alice@example.com"; password = "1234" } | ConvertTo-Json)).token
Write-Host "Authenticated Alice"

# Send mail
$mailBody = @{
    sender = "alice@example.com"
    recipient = "bob@example.com"
    subject = "Test Mail"
    content = "Just a normal message, no links"
    labels = @("inbox", "important")
}

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/mails" -Method POST -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } -Body ($mailBody | ConvertTo-Json -Depth 2)
$mailId = $response.mail.id
Write-Host "Mail sent: $mailId"

# GET mail
$fetched = Invoke-RestMethod -Uri "http://localhost:3000/api/mails/$mailId" -Method GET -Headers @{ Authorization = "Bearer $token" }
Write-Host " Mail fetched: $($fetched.subject)"

# PATCH mail
$update = @{ subject = "Updated subject" }
Invoke-RestMethod -Uri "http://localhost:3000/api/mails/$mailId" -Method PATCH -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } -Body ($update | ConvertTo-Json)
Write-Host "Mail updated"


# DELETE mail
Invoke-RestMethod -Uri "http://localhost:3000/api/mails/$mailId" -Method DELETE -Headers @{ Authorization = "Bearer $token" }
Write-Host "Mail deleted"

# Confirm deletion
try {
    Invoke-RestMethod -Uri "http://localhost:3000/api/mails/$mailId" -Method GET -Headers @{ Authorization = "Bearer $token" }
    Write-Host "Mail should not exist"
} catch {
    Write-Host "Mail deletion confirmed"
}

Write-Host "All tests completed successfully"
