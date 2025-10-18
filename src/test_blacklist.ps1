
Write-Host "Starting blacklist validation tests..."

# Register user
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/users" `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body (@{ email = "blacklist@example.com"; password = "1234"; firstName = "Black"; lastName = "List" } | ConvertTo-Json)

Write-Host "Registered user"

# Register another user
Invoke-RestMethod -Uri "http://localhost:3000/api/users" `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body (@{
      email = "bob@example.com"
      password = "1234"
      firstName = "Bob"
      lastName = "Builder"
  } | ConvertTo-Json)


# Authenticate user
$token = (Invoke-RestMethod -Uri "http://localhost:3000/api/tokens" `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body (@{ email = "blacklist@example.com"; password = "1234" } | ConvertTo-Json)).token

Write-Host "Authenticated"

# Try to send a mail with a blacklisted URL
$maliciousMail = @{
  sender = "blacklist@example.com"
  recipient = "bob@example.com"
  subject = "Malicious Link"
  content = "Check out this link: http://malware.com"
}

try {
  Invoke-RestMethod -Uri "http://localhost:3000/api/mails" `
    -Method POST `
    -Headers @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" } `
    -Body ($maliciousMail | ConvertTo-Json -Depth 2)
  Write-Host " Mail with blacklisted URL was sent - this is a problem"
} catch {
  Write-Host "Mail with blacklisted URL was blocked as expected"
}

# Try to send a clean mail
$cleanMail = @{
  sender = "blacklist@example.com"
  recipient = "bob@example.com"
  subject = "Safe Mail"
  content = "Hello Bob, no bad links here."
}

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/mails" `
  -Method POST `
  -Headers @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" } `
  -Body ($cleanMail | ConvertTo-Json -Depth 2)

$mailId = $response.mail.id
Write-Host " Clean mail sent: $mailId"

Write-Host "`nBlacklist tests completed."
