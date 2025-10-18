const API_BASE = 'http://localhost:3000/api';

export async function fetchWithAuth(url, token) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status}`);
  }

  return res.json();
}

export async function moveMailToLabel(mailId, fromLabelId, toLabelId, token) {
console.log("[moveMailToLabel] moving", mailId, "to", toLabelId); // Added for debugging by Meir
 // Ensure the mail is removed from the old label and added to the new one - ADD IN EXERCISE 4
  await fetch(`${API_BASE}/labels/tag`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ mailId, labelId: toLabelId })
  });

  // Remove the mail from the old label
  await fetch(`${API_BASE}/labels/untag`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ mailId, labelId: fromLabelId })
  });
}
