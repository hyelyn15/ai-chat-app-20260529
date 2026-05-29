const MCP_URL = "https://my-mcp-server-weld.vercel.app/api/mcp";
const BASE = "http://localhost:3000";

// 환경변수 HF_TOKEN 또는 CLI 인자로 토큰 전달 가능
const HF_TOKEN = process.env.HF_TOKEN ?? process.argv[2] ?? "";

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

async function main() {
  console.log("=== generate-image 테스트 ===\n");

  const connectBody = { transport: "http", url: MCP_URL };
  if (HF_TOKEN) {
    connectBody.headers = { "x-hf-token": HF_TOKEN };
  }

  const connect = await post("/api/mcp/connect", connectBody);
  if (!connect.ok) {
    console.error("연결 실패:", connect.data);
    process.exit(1);
  }

  const { sessionId } = connect.data;
  console.log("세션:", sessionId);
  console.log("HF 토큰:", HF_TOKEN ? "설정됨" : "미설정");

  const started = Date.now();
  const call = await post("/api/mcp/call", {
    sessionId,
    kind: "tools",
    name: "generate-image",
    arguments: {
      prompt: "a cute orange cat sitting on a windowsill, simple illustration",
      num_inference_steps: 4,
    },
  });
  const ms = Date.now() - started;

  await post("/api/mcp/disconnect", { sessionId });

  if (!call.ok) {
    console.log(`\n✗ FAIL (${ms}ms)`);
    console.log(call.data?.error ?? JSON.stringify(call.data));
    process.exit(1);
  }

  const result = call.data.result;
  const content = result?.content ?? [];
  const imagePart = content.find((p) => p.type === "image");
  const textPart = content.find((p) => p.type === "text");

  if (result?.isError) {
    console.log(`\n✗ FAIL (${ms}ms)`);
    console.log(textPart?.text ?? JSON.stringify(result).slice(0, 500));
    process.exit(1);
  }

  if (imagePart?.data && imagePart?.mimeType) {
    const sizeKb = Math.round((imagePart.data.length * 3) / 4 / 1024);
    console.log(`\n✓ PASS (${ms}ms)`);
    console.log(`  mimeType: ${imagePart.mimeType}`);
    console.log(`  base64 길이: ${imagePart.data.length} chars (~${sizeKb} KB)`);
    if (textPart?.text) console.log(`  text: ${textPart.text.slice(0, 120)}`);
    process.exit(0);
  }

  console.log(`\n? UNEXPECTED (${ms}ms)`);
  console.log(JSON.stringify(result, null, 2).slice(0, 800));
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
