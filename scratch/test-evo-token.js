async function testToken() {
  const evoUrl = "http://localhost:8080";
  const evoKey = "j4uZQSFnL5iX71iLtLCZO39szTjK2NUl";
  const evoInstance = "ditoefeito";

  const rList = await fetch(`${evoUrl}/instance/fetchInstances`, { headers: { apikey: evoKey } });
  const instances = await rList.json();
  const inst = instances.find((i) => i.name === evoInstance);
  console.log("Instance found:", inst?.name, "Token:", inst?.token);

  if (!inst) return;

  console.log("\n--- Testing GET /instance/connect/ditoefeito with apikey + token ---");
  const r1 = await fetch(`${evoUrl}/instance/connect/${evoInstance}`, {
    headers: { apikey: evoKey, token: inst.token },
  });
  console.log("Res 1:", await r1.json());

  console.log("\n--- Testing GET /instance/connect/ditoefeito with Authorization Bearer ---");
  const r2 = await fetch(`${evoUrl}/instance/connect/${evoInstance}`, {
    headers: { Authorization: `Bearer ${inst.token}` },
  });
  console.log("Res 2:", await r2.json());

  console.log("\n--- Testing GET /instance/connect/ditoefeito with apikey in query ---");
  const r3 = await fetch(`${evoUrl}/instance/connect/${evoInstance}?apikey=${evoKey}`, {
    headers: { apikey: evoKey },
  });
  console.log("Res 3:", await r3.json());

  console.log("\n--- Testing POST /instance/connect/ditoefeito ---");
  const r4 = await fetch(`${evoUrl}/instance/connect/${evoInstance}`, {
    method: "POST",
    headers: { apikey: evoKey },
  });
  console.log("Res 4:", await r4.json());
}

testToken();
