async function testFullFlow() {
  const evoUrl = "http://localhost:8080";
  const evoKey = "j4uZQSFnL5iX71iLtLCZO39szTjK2NUl";
  const evoInstance = "ditoefeito";

  console.log("--- 1. List Instances ---");
  const rList1 = await fetch(`${evoUrl}/instance/fetchInstances`, { headers: { apikey: evoKey } });
  console.log("List 1:", await rList1.json());

  console.log("\n--- 2. Create Instance 'ditoefeito' ---");
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
  console.log("Create body:", await rCreate.json());

  console.log("\n--- 3. List Instances After Create ---");
  const rList2 = await fetch(`${evoUrl}/instance/fetchInstances`, { headers: { apikey: evoKey } });
  console.log("List 2:", await rList2.json());

  console.log("\n--- 4. Polling GET /instance/connect/ditoefeito for 5 seconds ---");
  for (let i = 1; i <= 5; i++) {
    await new Promise((res) => setTimeout(res, 1000));
    const rConn = await fetch(`${evoUrl}/instance/connect/${evoInstance}`, { headers: { apikey: evoKey } });
    console.log(`Poll ${i} (${rConn.status}):`, await rConn.json());
  }
}

testFullFlow();
