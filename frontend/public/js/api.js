const API_BASE = `${window.location.origin}/api`;

export async function login(email, password, rememberMe = false) {
  const response = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, rememberMe }),
  });
  if (!response.ok) {
    throw new Error("Invalid credentials");
  }
  return response.json();
}