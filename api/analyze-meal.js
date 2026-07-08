module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "只支持 POST 请求" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    response.status(500).json({ error: "还没有配置 GEMINI_API_KEY" });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const { image } = body || {};
    if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
      response.status(400).json({ error: "请上传一张图片" });
      return;
    }

    const { mimeType, base64 } = parseDataUrl(image);
    const prompt = [
      "你是一个谨慎的食物热量估算助手。",
      "请根据图片估算这餐的主要名称、总热量 kcal、分类和可信度。",
      "分类必须是：正餐、饮料、甜品、零食、水果、其他。",
      "无法确定时请保守估算，并在 note 说明不确定因素。",
      "只能返回 JSON，不要返回 Markdown。",
      'JSON 格式：{"name":"牛肉粉","calories":650,"category":"正餐","confidence":"中","note":"按普通一碗估算"}'
    ].join("\n");

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || "gemini-2.5-flash"}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            response_mime_type: "application/json"
          }
        })
      }
    );

    const result = await geminiResponse.json();
    if (!geminiResponse.ok) {
      response.status(geminiResponse.status).json({
        error: result.error?.message || "Gemini 识别失败"
      });
      return;
    }

    const text = result.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
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
    response.status(500).json({
      error: error instanceof Error ? error.message : "服务器处理失败"
    });
  }
};

function parseDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error("图片格式不正确");
  return { mimeType: match[1], base64: match[2] };
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
