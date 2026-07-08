module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "只支持 POST 请求" });
    return;
  }

  const apiKey = process.env.ARK_API_KEY;
  if (!apiKey) {
    response.status(500).json({ error: "还没有配置 ARK_API_KEY" });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const { image } = body || {};
    if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
      response.status(400).json({ error: "请上传一张图片" });
      return;
    }

    const prompt = [
      "你是一个谨慎的食物热量估算助手。",
      "请根据图片估算这餐的主要名称、总热量 kcal、分类和可信度。",
      "分类必须是：正餐、饮料、甜品、零食、水果、其他。",
      "无法确定时请保守估算，并在 note 说明不确定因素。",
      "只能返回 JSON，不要返回 Markdown。",
      'JSON 格式：{"name":"牛肉粉","calories":650,"category":"正餐","confidence":"中","note":"按普通一碗估算"}'
    ].join("\n");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000);
    let arkResponse;
    const baseUrl = normalizeBaseUrl(process.env.ARK_BASE_URL);

    try {
      arkResponse = await fetch(`${baseUrl}/responses`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: process.env.ARK_MODEL || "doubao-seed-1-6-flash-250828",
          temperature: 0.2,
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_image",
                  image_url: image
                },
                { type: "input_text", text: prompt }
              ]
            }
          ]
        })
      });
    } finally {
      clearTimeout(timeout);
    }

    const result = await arkResponse.json().catch(() => ({}));
    if (!arkResponse.ok) {
      const message = result.error?.message || result.message || "";
      response.status(arkResponse.status).json({
        error: friendlyArkError(message)
      });
      return;
    }

    const text = extractResponseText(result);
    if (!text) {
      response.status(502).json({ error: "AI 没有返回可解析结果" });
      return;
    }

    const estimate = JSON.parse(stripCodeFence(text));
    response.status(200).json({
      name: String(estimate.name || "这餐"),
      calories: Math.max(0, Math.round(Number(estimate.calories || 0))),
      category: normalizeCategory(estimate.category),
      confidence: ["低", "中", "高"].includes(estimate.confidence) ? estimate.confidence : "中",
      note: estimate.note || "照片估算仅供参考，建议按实际份量微调。"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    response.status(500).json({
      error:
        error instanceof Error && error.name === "AbortError"
          ? "豆包接口响应超时，请稍后重试或检查模型接入点"
          : friendlyArkError(message || "服务器处理失败")
    });
  }
};

function normalizeBaseUrl(value) {
  const fallback = "https://ark.cn-beijing.volces.com/api/v3";
  const baseUrl = String(value || fallback).trim().replace(/\/+$/, "");
  return /^https?:\/\//.test(baseUrl) ? baseUrl : fallback;
}

function friendlyArkError(message) {
  if (message.includes("expected pattern") || message.includes("did not match")) {
    return "豆包没有接受当前图片或接口格式。请确认 ARK_MODEL 填的是 doubao-seed-1-6-flash-250828，ARK_BASE_URL 可以先留空。";
  }

  if (message.includes("timed out") || message.includes("timeout") || message.includes("超时")) {
    return "豆包接口响应超时，请稍后再试，或换一张更清晰的小图。";
  }

  return message || "豆包识别失败，请检查 ARK_MODEL 是否是视觉模型接入点";
}

function extractResponseText(result) {
  if (typeof result.output_text === "string") return result.output_text;

  const content = result.output?.flatMap((item) => item.content || []) || [];
  const textItem = content.find((item) => typeof item.text === "string");
  if (textItem) return textItem.text;

  const legacyText = result.choices?.[0]?.message?.content;
  return typeof legacyText === "string" ? legacyText : "";
}

function stripCodeFence(text) {
  return text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}

function normalizeCategory(category) {
  return ["正餐", "饮料", "甜品", "零食", "水果", "其他"].includes(category) ? category : "其他";
}

function readJsonBody(request) {
  if (request.body && typeof request.body === "object") {
    return Promise.resolve(request.body);
  }

  if (typeof request.body === "string") {
    return Promise.resolve(JSON.parse(request.body));
  }

  return new Promise((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
    });
    request.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}
