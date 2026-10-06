async function testEvolution() {
  const evoUrl = "http://localhost:8080";
  const evoKey = "j4uZQSFnL5iX71iLtLCZO39szTjK2NUl";
  const evoInstance = "ditoefeito";

  console.log("1. Fetching instances...");
  try {
    const r1 = await fetch(`${evoUrl}/instance/fetchInstances`, {
      headers: { apikey: evoKey },
    });
    console.log("FetchInstances status:", r1.status);
    const j1 = await r1.json();
    console.log("Instances:", JSON.stringify(j1, null, 2));
  } catch (err) {
    console.error("FetchInstances error:", err);
  }

  console.log("\n2. Checking connection state for 'ditoefeito'...");
  try {
    const r2 = await fetch(`${evoUrl}/instance/connectionState/${evoInstance}`, {
      headers: { apikey: evoKey },
    });
    console.log("ConnectionState status:", r2.status);
    const j2 = await r2.json();
    console.log("ConnectionState:", JSON.stringify(j2, null, 2));
  } catch (err) {
    console.error("ConnectionState error:", err);
  }

  console.log("\n3. Creating or Connecting instance 'ditoefeito'...");
  try {
    const r3 = await fetch(`${evoUrl}/instance/connect/${evoInstance}`, {
      headers: { apikey: evoKey },
    });
    console.log("Connect status:", r3.status);
    const j3 = await r3.json();
    console.log("Connect response:", JSON.stringify(j3, null, 2));

    if (r3.status === 404) {
      console.log("Instance not found. Creating instance...");
      const rCreate = await fetch(`${evoUrl}/instance/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: evoKey },
        body: JSON.stringify({
          instanceName: evoInstance,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
        }),
      });
      console.log("Create status:", rCreate.status);
      const jCreate = await rCreate.json();
      console.log("Create response:", JSON.stringify(jCreate, null, 2));
    }
  } catch (err) {
    console.error("Connect error:", err);
  }
}

testEvolution();
