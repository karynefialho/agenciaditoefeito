async function testQrAfterLogout() {
  const evoUrl = "http://localhost:8080";
  const evoKey = "j4uZQSFnL5iX71iLtLCZO39szTjK2NUl";
  const evoInstance = "ditoefeito";

  console.log("1. Logout instance...");
  const rLogout = await fetch(`${evoUrl}/instance/logout/${evoInstance}`, {
    method: "DELETE",
    headers: { apikey: evoKey },
  });
  console.log("Logout status:", rLogout.status);

  console.log("\n2. Connect instance...");
  const rConnect = await fetch(`${evoUrl}/instance/connect/${evoInstance}`, {
    headers: { apikey: evoKey },
  });
  console.log("Connect status:", rConnect.status);
  const jConnect = await rConnect.json();
  console.log("Connect response:", JSON.stringify(jConnect, null, 2));
}

testQrAfterLogout();
