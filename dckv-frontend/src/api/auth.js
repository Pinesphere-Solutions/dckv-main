
export async function loginUser(username, password) {
  const response = await fetch("/api/login/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  return response.json();
}

