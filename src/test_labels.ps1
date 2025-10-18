# Set URLs
$baseUrl = "http://localhost:3000/api"
$loginUrl = "$baseUrl/tokens"
$labelUrl = "$baseUrl/labels"

# Log in as Alice
$aliceLogin = @{
    email    = "alice@example.com"
    password = "1234"
} | ConvertTo-Json

$aliceToken = (Invoke-RestMethod -Method Post -Uri $loginUrl -Headers @{ "Content-Type" = "application/json" } -Body $aliceLogin).token

# Log in as Bob
$bobLogin = @{
    email    = "bob@example.com"
    password = "1234"
} | ConvertTo-Json

$bobToken = (Invoke-RestMethod -Method Post -Uri $loginUrl -Headers @{ "Content-Type" = "application/json" } -Body $bobLogin).token

Write-Host "`n--- Alice creates 2 labels ---"
$aliceHeaders = @{ Authorization = "Bearer $aliceToken"; "Content-Type" = "application/json" }
Invoke-RestMethod -Method Post -Uri $labelUrl -Headers $aliceHeaders -Body (@{ name = "AliceLabel1" } | ConvertTo-Json)
Invoke-RestMethod -Method Post -Uri $labelUrl -Headers $aliceHeaders -Body (@{ name = "AliceLabel2" } | ConvertTo-Json)

Write-Host "`n--- Bob creates 1 label ---"
$bobHeaders = @{ Authorization = "Bearer $bobToken"; "Content-Type" = "application/json" }
Invoke-RestMethod -Method Post -Uri $labelUrl -Headers $bobHeaders -Body (@{ name = "BobLabel1" } | ConvertTo-Json)

Write-Host "`n--- Alice reads her labels ---"
Invoke-RestMethod -Method Get -Uri $labelUrl -Headers $aliceHeaders | ConvertTo-Json -Depth 3

Write-Host "`n--- Bob reads his labels ---"
Invoke-RestMethod -Method Get -Uri $labelUrl -Headers $bobHeaders | ConvertTo-Json -Depth 3

Write-Host "`n--- Bob tries to access Alice's first label ---"
$aliceLabels = Invoke-RestMethod -Method Get -Uri $labelUrl -Headers $aliceHeaders
$aliceLabelId = $aliceLabels[0].id
try {
    Invoke-RestMethod -Method Get -Uri "$labelUrl/$aliceLabelId" -Headers $bobHeaders
}
catch {
    Write-Host "Expected error: $($_.Exception.Message)"
}
