const MCP_URL = "https://my-mcp-server-weld.vercel.app/api/mcp";
const BASE = "http://localhost:3000";

const TOOL_CASES = [
  {
    name: "greet",
    args: { name: "테스트", language: "ko" },
  },
  {
    name: "calculate",
    args: { operator: "+", a: 10, b: 5 },
  },
  {
    name: "current_time",
    args: { timezone: "Asia/Seoul" },
  },
  {
    name: "geocode_city",
    args: { city: "Seoul" },
  },
  {
    name: "get_weather",
    args: { latitude: 37.5665, longitude: 126.978 },
  },
  {
    name: "generate-image",
    args: { prompt: "a small red circle on white background" },
    note: "HuggingFace 토큰 필요할 수 있음",
  },
];

const PROMPT_CASES = [{ name: "code-review", args: { code: "function add(a,b){return a+b}" } }];
const RESOURCE_CASES = [{ name: "myserver://info" }];

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

function summarize(result) {
  const text = JSON.stringify(result);
  return text.length > 200 ? `${text.slice(0, 200)}…` : text;
}

function isToolError(result) {
  if (result?.isError) return true;
  const content = result?.content;
  if (!Array.isArray(content)) return false;
  return content.some((part) => part.type === "text" && /error|failed|실패/i.test(part.text ?? ""));
}

async function main() {
  console.log("=== MCP Tool 전체 테스트 ===\n");
  console.log(`서버: ${MCP_URL}\n`);

  const connect = await post("/api/mcp/connect", { transport: "http", url: MCP_URL });
  if (!connect.ok) {
    console.error("연결 실패:", connect.data);
    process.exit(1);
  }

  const { sessionId, capabilities } = connect.data;
  console.log(`세션: ${sessionId}`);
  console.log(`등록된 tools: ${capabilities.tools.map((t) => t.name).join(", ")}`);
  console.log(`등록된 prompts: ${capabilities.prompts.map((p) => p.name).join(", ") || "(없음)"}`);
  console.log(`등록된 resources: ${capabilities.resources.map((r) => r.uri).join(", ") || "(없음)"}\n`);

  const results = [];

  for (const toolCase of TOOL_CASES) {
    const listed = capabilities.tools.find((t) => t.name === toolCase.name);
    if (!listed) {
      results.push({ kind: "tool", name: toolCase.name, status: "SKIP", detail: "서버에 없음" });
      continue;
    }

    const started = Date.now();
    const call = await post("/api/mcp/call", {
      sessionId,
      kind: "tools",
      name: toolCase.name,
      arguments: toolCase.args,
    });
    const ms = Date.now() - started;

    if (!call.ok) {
      results.push({
        kind: "tool",
        name: toolCase.name,
        status: "FAIL",
        ms,
        detail: call.data?.error ?? summarize(call.data),
      });
      continue;
    }

    const errorLike = isToolError(call.data.result);
    results.push({
      kind: "tool",
      name: toolCase.name,
      status: errorLike ? "FAIL" : "PASS",
      ms,
      detail: summarize(call.data.result),
      note: toolCase.note,
    });
  }

  for (const promptCase of PROMPT_CASES) {
    const started = Date.now();
    const call = await post("/api/mcp/call", {
      sessionId,
      kind: "prompts",
      name: promptCase.name,
      arguments: promptCase.args,
    });
    const ms = Date.now() - started;
    results.push({
      kind: "prompt",
      name: promptCase.name,
      status: call.ok ? "PASS" : "FAIL",
      ms,
      detail: call.ok ? summarize(call.data.result) : (call.data?.error ?? summarize(call.data)),
    });
  }

  for (const resourceCase of RESOURCE_CASES) {
    const started = Date.now();
    const call = await post("/api/mcp/call", {
      sessionId,
      kind: "resources",
      name: resourceCase.name,
    });
    const ms = Date.now() - started;
    results.push({
      kind: "resource",
      name: resourceCase.name,
      status: call.ok ? "PASS" : "FAIL",
      ms,
      detail: call.ok ? summarize(call.data.result) : (call.data?.error ?? summarize(call.data)),
    });
  }

  await post("/api/mcp/disconnect", { sessionId });

  const pass = results.filter((r) => r.status === "PASS").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  const skip = results.filter((r) => r.status === "SKIP").length;

  console.log("--- 결과 ---");
  for (const r of results) {
    const icon = r.status === "PASS" ? "✓" : r.status === "FAIL" ? "✗" : "-";
    console.log(`${icon} [${r.kind}] ${r.name} (${r.ms ?? 0}ms) — ${r.status}`);
    console.log(`   ${r.detail}`);
    if (r.note) console.log(`   참고: ${r.note}`);
  }

  console.log(`\n총 ${results.length}개 | PASS ${pass} | FAIL ${fail} | SKIP ${skip}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
