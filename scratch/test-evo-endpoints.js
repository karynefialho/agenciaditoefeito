async function testEndpoints() {
  const evoUrl = "http://localhost:8080";
  const evoKey = "j4uZQSFnL5iX71iLtLCZO39szTjK2NUl";
  const evoInstance = "ditoefeito";

  const endpoints = [
    { method: "GET", path: `/instance/connect/${evoInstance}` },
    { method: "GET", path: `/instance/connectionState/${evoInstance}` },
    { method: "PUT", path: `/instance/restart/${evoInstance}` },
    { method: "POST", path: `/instance/restart/${evoInstance}` },
    { method: "DELETE", path: `/instance/logout/${evoInstance}` },
    { method: "GET", path: `/instance/fetchInstances` },
  ];

  for (const ep of endpoints) {
    try {
      console.log(`\n--- ${ep.method} ${ep.path} ---`);
      const res = await fetch(`${evoUrl}${ep.path}`, {
        method: ep.method,
        headers: { apikey: evoKey },
      });
      console.log(`Status: ${res.status}`);
      const text = await res.text();
      console.log(`Response:`, text.substring(0, 300));
    } catch (err) {
      console.error(`Error on ${ep.path}:`, err);
    }
  }
}

testEndpoints();
