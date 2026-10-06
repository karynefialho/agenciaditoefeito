async function testEvolution2() {
  const evoUrl = "http://localhost:8080";
  const evoKey = "j4uZQSFnL5iX71iLtLCZO39szTjK2NUl";
  const evoInstance = "ditoefeito";

  console.log("Waiting 1.5s for Baileys socket to generate QR Code...");
  await new Promise((resolve) => setTimeout(resolve, 1500));

  console.log("\nCalling GET /instance/connect/ditoefeito...");
  try {
    const r = await fetch(`${evoUrl}/instance/connect/${evoInstance}`, {
      headers: { apikey: evoKey },
    });
    console.log("Connect status:", r.status);
    const j = await r.json();
    console.log("Connect keys:", Object.keys(j));
    if (j.base64) {
      console.log("Base64 QR Code length:", j.base64.length);
      console.log("Base64 start:", j.base64.substring(0, 50));
    } else {
      console.log("Full connect response:", JSON.stringify(j, null, 2));
    }
  } catch (err) {
    console.error("Connect error:", err);
  }
}

testEvolution2();
