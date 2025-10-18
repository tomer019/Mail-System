#!/bin/bash
set -e

API="http://localhost:3000/api"

### Create users
curl -s -X POST $API/users -H "Content-Type: application/json" \
  -d '{"email":"bob@example.com","password":"bobspassword","firstName":"Bob","lastName":"Builder"}' > /dev/null
curl -s -X POST $API/users -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"alicepassword","firstName":"Alice","lastName":"Wonder"}' > /dev/null

### Get tokens
BOB_TOKEN=$(curl -s -X POST $API/tokens -H "Content-Type: application/json" \
  -d '{"email":"bob@example.com","password":"bobspassword"}' | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
ALICE_TOKEN=$(curl -s -X POST $API/tokens -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"alicepassword"}' | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

### Create labels
curl -s -X POST $API/labels -H "Authorization: Bearer $BOB_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Work"}' > /dev/null || true
curl -s -X POST $API/labels -H "Authorization: Bearer $ALICE_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Work"}' > /dev/null || true

### Send mail from Alice to Bob
MAIL_ID=$(curl -s -X POST $API/mails -H "Authorization: Bearer $ALICE_TOKEN" -H "Content-Type: application/json" \
  -d '{"sender":"alice@example.com","recipient":"bob@example.com","subject":"Project Update","content":"Hey Bob, here is the project update."}' \
  | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')

echo "📬 Mail sent: $MAIL_ID"

### Label mail with 'Work' by Alice
curl -s -o /dev/null -w "✅ Alice labels mail → %{http_code}\n" -X PATCH "$API/mails/$MAIL_ID/label" \
  -H "Authorization: Bearer $ALICE_TOKEN" -H "Content-Type: application/json" \
  -d '{"labels": ["Work"]}'

### Label mail with 'Work' by Bob
curl -s -o /dev/null -w "✅ Bob labels mail → %{http_code}\n" -X PATCH "$API/mails/$MAIL_ID/label" \
  -H "Authorization: Bearer $BOB_TOKEN" -H "Content-Type: application/json" \
  -d '{"labels": ["Work"]}'

### Bob tries to edit mail (should fail)
curl -s -o /dev/null -w "❌ Bob edits subject → %{http_code}\n" -X PATCH "$API/mails/$MAIL_ID" \
  -H "Authorization: Bearer $BOB_TOKEN" -H "Content-Type: application/json" \
  -d '{"subject": "Hacked"}'

### Alice edits subject (should succeed)
curl -s -o /dev/null -w "✅ Alice edits subject → %{http_code}\n" -X PATCH "$API/mails/$MAIL_ID" \
  -H "Authorization: Bearer $ALICE_TOKEN" -H "Content-Type: application/json" \
  -d '{"subject": "Project Update v2"}'

### Bob tries to apply invalid label
curl -s -o /dev/null -w "❌ Bob uses invalid label → %{http_code}\n" -X PATCH "$API/mails/$MAIL_ID/label" \
  -H "Authorization: Bearer $BOB_TOKEN" -H "Content-Type: application/json" \
  -d '{"labels": ["family"]}'

### Alice tries to apply invalid label
curl -s -o /dev/null -w "❌ Alice uses invalid label → %{http_code}\n" -X PATCH "$API/mails/$MAIL_ID/label" \
  -H "Authorization: Bearer $ALICE_TOKEN" -H "Content-Type: application/json" \
  -d '{"labels": ["family"]}'

echo "🏁 Done."
